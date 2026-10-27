import { backupCommand, exportCommand, importCommand } from './cli/backup-command.ts';
import { logger, stderrLogger } from './cli/context.ts';
import { CommandError, UsageError } from './cli/errors.ts';
import { migrateCommand, releaseCommand, restoreCompleteCommand } from './cli/instance-command.ts';
import { providerAppCommand } from './cli/provider-apps-command.ts';
import { userCommand } from './cli/users-command.ts';
import { ConfigError } from './config.ts';

const USAGE = `usage:
  kronaut migrate
  kronaut user create --owner --email <email> --name <name> --workspace <name> --timezone <tz> [--slug <slug>]
  kronaut user reset-password <email>
  kronaut restore-complete
  kronaut release
  kronaut export --out <file>
  kronaut import <file> --identity <file>
  kronaut backup run --dir <dir>
  kronaut backup schedule --dir <dir>
  kronaut provider-app register bluesky
  kronaut provider-app register facebook --client-id <meta app id>         (app secret on stdin)
  kronaut provider-app register instagram --client-id <instagram app id>   (app secret on stdin)
  kronaut provider-app register linkedin --client-id <linkedin client id>  (client secret on stdin)
  kronaut provider-app register threads --client-id <threads app id>       (app secret on stdin)
  kronaut provider-app key create <app-id>
  kronaut provider-app key activate <app-id> <kid>
  kronaut provider-app key delete <app-id> <kid>
  kronaut provider-app key list <app-id>`;

async function run(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;
  switch (command) {
    case 'migrate':
      await migrateCommand(rest);
      return;
    case 'user':
      await userCommand(rest);
      return;
    case 'restore-complete':
      await restoreCompleteCommand(rest);
      return;
    case 'release':
      await releaseCommand(rest);
      return;
    case 'export':
      await exportCommand(rest);
      return;
    case 'import':
      await importCommand(rest);
      return;
    case 'backup':
      await backupCommand(rest);
      return;
    case 'provider-app':
      await providerAppCommand(rest);
      return;
    default:
      throw new UsageError('unknown command');
  }
}

function isParseArgsError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false;
  const { code } = err as Error & { code?: unknown };
  return typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS_');
}

const argv = process.argv.slice(2);
const log = argv[0] === 'migrate' ? logger : stderrLogger;
try {
  await run(argv);
} catch (err) {
  if (err instanceof UsageError || isParseArgsError(err)) {
    process.stderr.write(`${err.message}\n${USAGE}\n`);
    process.exitCode = 2;
  } else if (err instanceof ConfigError || err instanceof CommandError) {
    log.fatal(err.message);
    process.exitCode = 1;
  } else {
    log.fatal({ err }, `${argv[0] ?? 'command'} failed`);
    process.exitCode = 1;
  }
}
