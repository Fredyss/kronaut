import { type ChildProcess, spawn } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { CommandError } from '../errors.ts';

export type PgTool = 'pg_dump' | 'pg_restore' | 'psql';

export interface PgTools {
  version(tool: PgTool): Promise<string>;
  dump(connection: string, snapshot: string, sink: Writable): Promise<void>;
  restore(connection: string, source: Readable, trailer: string): Promise<void>;
}

export type PgLauncher = (
  tool: PgTool,
  args: readonly string[],
  dbname: string | undefined,
) => readonly [command: string, args: readonly string[]];

export const PG_MAJOR = 17;

const STDERR_MAX_BYTES = 16 * 1024;
const ERROR_LINE_MAX = 300;

const pathLauncher: PgLauncher = (tool, args, dbname) => [
  tool,
  dbname === undefined ? args : [...args, '--dbname', dbname],
];

export function splitConnection(connection: string): { dbname: string; password?: string } {
  let url: URL;
  try {
    url = new URL(connection);
  } catch {
    throw new CommandError((m) => m.db_url_invalid({}));
  }
  if (url.password === '') return { dbname: url.toString() };
  let password: string;
  try {
    password = decodeURIComponent(url.password);
  } catch {
    throw new CommandError((m) => m.db_url_password({}));
  }
  url.password = '';
  return { dbname: url.toString(), password };
}

function errorLine(tool: PgTool, stderr: Buffer): string {
  const marker = tool === 'psql' ? 'ERROR:' : `${tool}: error: `;
  const line = stderr
    .toString('utf8')
    .split('\n')
    .find((candidate) => candidate.includes(marker));
  if (line === undefined) return '';
  const start = line.indexOf(marker) + marker.length;
  return `: ${line.slice(start, start + ERROR_LINE_MAX).trim()}`;
}

interface SpawnOptions {
  readonly connection?: string;
  readonly stdin: boolean;
  readonly stdout: boolean;
}

interface Spawned {
  readonly child: ChildProcess;
  readonly exit: Promise<void>;
}

function spawnTool(
  launcher: PgLauncher,
  tool: PgTool,
  args: readonly string[],
  options: SpawnOptions,
): Spawned {
  const split = options.connection === undefined ? undefined : splitConnection(options.connection);
  const env = { ...process.env };
  if (split?.password !== undefined) env.PGPASSWORD = split.password;
  const [command, argv] = launcher(tool, args, split?.dbname);
  const child = spawn(command, argv, {
    env,
    stdio: [options.stdin ? 'pipe' : 'ignore', options.stdout ? 'pipe' : 'ignore', 'pipe'],
  });
  child.stdin?.on('error', () => undefined);
  const stderr: Buffer[] = [];
  let stderrBytes = 0;
  child.stderr?.on('data', (chunk: Buffer) => {
    if (stderrBytes >= STDERR_MAX_BYTES) return;
    stderr.push(chunk);
    stderrBytes += chunk.byteLength;
  });
  const exit = new Promise<void>((resolve, reject) => {
    child.once('error', (error: NodeJS.ErrnoException) => {
      reject(error.code === 'ENOENT' ? new CommandError((m) => m.tool_missing({ tool })) : error);
    });
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = errorLine(tool, Buffer.concat(stderr));
      reject(new CommandError((m) => `${m.tool_failed({ tool })}${detail}`));
    });
  });
  return { child, exit };
}

async function settle(
  primary: readonly Promise<unknown>[],
  secondary: readonly Promise<unknown>[],
) {
  const results = await Promise.allSettled([...primary, ...secondary]);
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
  }
}

async function write(sink: Writable, chunk: Uint8Array | string): Promise<void> {
  const stopped = () => new CommandError((m) => m.tool_stopped_reading({ tool: 'psql' }));
  if (sink.destroyed || sink.writableEnded) throw stopped();
  if (sink.write(chunk)) return;
  await new Promise<void>((resolve, reject) => {
    const settleWith = (error?: Error) => {
      sink.off('drain', onDrain);
      sink.off('close', onClose);
      if (error === undefined) resolve();
      else reject(error);
    };
    const onDrain = () => settleWith();
    const onClose = () => settleWith(stopped());
    sink.on('drain', onDrain);
    sink.on('close', onClose);
  });
}

const PSQL_ARGS = ['--no-psqlrc', '--quiet', '--no-password', '-v', 'ON_ERROR_STOP=1', '--file=-'];

export function spawnPgTools(launcher: PgLauncher = pathLauncher): PgTools {
  return {
    async version(tool) {
      const { child, exit } = spawnTool(launcher, tool, ['--version'], {
        stdin: false,
        stdout: true,
      });
      const chunks: Buffer[] = [];
      child.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
      await exit;
      return Buffer.concat(chunks).toString('utf8');
    },
    async dump(connection, snapshot, sink) {
      const { child, exit } = spawnTool(
        launcher,
        'pg_dump',
        ['--format=custom', '--no-password', `--snapshot=${snapshot}`],
        { connection, stdin: false, stdout: true },
      );
      await settle([exit], child.stdout === null ? [] : [pipeline(child.stdout, sink)]);
    },
    async restore(connection, source, trailer) {
      const psql = spawnTool(launcher, 'psql', PSQL_ARGS, {
        connection,
        stdin: true,
        stdout: false,
      });
      const restore = spawnTool(
        launcher,
        'pg_restore',
        ['--format=custom', '--no-owner', '--file=-'],
        {
          stdin: true,
          stdout: true,
        },
      );
      const psqlIn = psql.child.stdin;
      const restoreIn = restore.child.stdin;
      const restoreOut = restore.child.stdout;
      if (psqlIn === null || restoreIn === null || restoreOut === null) {
        throw new Error('pg tools started without pipes');
      }
      const feeding = pipeline(source, restoreIn);
      // Explicit BEGIN/COMMIT instead of --single-transaction: psql -1 commits at end of input,
      // so a crash that closes the pipe early would commit a partial, unquarantined restore.
      const forwarding = (async () => {
        try {
          await write(psqlIn, 'BEGIN;\n');
          for await (const chunk of restoreOut) await write(psqlIn, chunk as Buffer);
          await Promise.all([restore.exit, feeding]);
          await write(psqlIn, `\n${trailer}\nCOMMIT;\n`);
        } catch (error) {
          restore.child.kill();
          throw error;
        } finally {
          psqlIn.end();
        }
      })();
      await settle([psql.exit, restore.exit], [feeding, forwarding]);
    },
  };
}

export async function requireMajor(pg: PgTools, tool: PgTool): Promise<void> {
  const match = /\(PostgreSQL\) (\d+)/.exec(await pg.version(tool));
  const major = match?.[1] === undefined ? undefined : Number(match[1]);
  if (major !== PG_MAJOR) {
    throw new CommandError((m) =>
      major === undefined
        ? m.tool_version_unknown({ tool, major: PG_MAJOR })
        : m.tool_version({ tool, major: PG_MAJOR, found: major }),
    );
  }
}
