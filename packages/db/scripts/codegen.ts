import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startTestDatabase } from '../src/testing.ts';

const packageDir = join(import.meta.dirname, '..');
const repoRoot = join(packageDir, '..', '..');
const outFile = join(packageDir, 'src', 'schema.gen.ts');
const outPath = 'packages/db/src/schema.gen.ts';
const typeMapping = JSON.stringify({ timestamp: 'string', date: 'string' });

function run(command: string, args: string[], cwd: string, input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(stdout).toString('utf8'));
      else
        reject(
          new Error(`${command} exited with ${code}: ${Buffer.concat(stderr).toString('utf8')}`),
        );
    });
    child.stdin.end(input ?? '');
  });
}

async function generate(): Promise<string> {
  const database = await startTestDatabase();
  try {
    const raw = await run(
      join(packageDir, 'node_modules', '.bin', 'kysely-codegen'),
      [
        '--dialect',
        'postgres',
        '--url',
        database.ownerUrl,
        '--type-mapping',
        typeMapping,
        '--exclude-pattern',
        'kronaut_meta.*',
        '--print',
        '--log-level',
        'error',
      ],
      packageDir,
    );
    return await run(
      join(repoRoot, 'node_modules', '.bin', 'biome'),
      ['check', '--write', `--stdin-file-path=${outPath}`],
      repoRoot,
      raw,
    );
  } finally {
    await database.stop();
  }
}

const check = process.argv.includes('--check');
const generated = await generate();
if (check) {
  const committed = await readFile(outFile, 'utf8').catch(() => '');
  if (committed !== generated) {
    console.error(
      'packages/db/src/schema.gen.ts is out of date; run pnpm --filter @kronaut/db codegen',
    );
    process.exit(1);
  }
  console.log('schema.gen.ts is up to date');
} else {
  await writeFile(outFile, generated);
  console.log(`wrote ${outPath}`);
}
