import type { CliMessages } from '@kronaut/i18n/cli';
import { backupCommand, exportCommand, importCommand } from './actors/cli/backup-command.ts';
import { blueskyCommand } from './actors/cli/bluesky-command.ts';
import { locale, logger, messages, stderrLogger } from './actors/cli/context.ts';
import { CommandError, UsageError } from './actors/cli/errors.ts';
import {
  migrateCommand,
  releaseCommand,
  restoreCompleteCommand,
} from './actors/cli/instance-command.ts';
import { providerAppCommand } from './actors/cli/provider-apps-command.ts';
import { userCommand } from './actors/cli/users-command.ts';
import { ConfigError } from './base/config/config.ts';

function usage(m: CliMessages): string {
  const appSecret = `(${m.usage_app_secret_stdin({})})`;
  const clientSecret = `(${m.usage_client_secret_stdin({})})`;
  return [
    m.usage_title({}),
    '  kronaut migrate',
    '  kronaut user create --owner --email <email> --name <name> --workspace <name> --timezone <tz> [--slug <slug>]',
    '  kronaut user reset-password <email>',
    '  kronaut restore-complete',
    '  kronaut release',
    '  kronaut export --out <file>',
    '  kronaut import <file> --identity <file>',
    '  kronaut backup run --dir <dir>',
    '  kronaut backup schedule --dir <dir>',
    '  kronaut provider-app register bluesky',
    `  kronaut provider-app register facebook --client-id <meta app id>         ${appSecret}`,
    `  kronaut provider-app register instagram --client-id <instagram app id>   ${appSecret}`,
    `  kronaut provider-app register linkedin --client-id <linkedin client id>  ${clientSecret}`,
    `  kronaut provider-app register threads --client-id <threads app id>       ${appSecret}`,
    '  kronaut provider-app key create <app-id>',
    '  kronaut provider-app key activate <app-id> <kid>',
    '  kronaut provider-app key delete <app-id> <kid>',
    '  kronaut provider-app key list <app-id>',
    '  kronaut bluesky video-check [<handle>]',
  ].join('\n');
}

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
    case 'bluesky':
      await blueskyCommand(rest);
      return;
    default:
      throw new UsageError((m) => m.unknown_command({}));
  }
}

function isParseArgsError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false;
  const { code } = err as Error & { code?: unknown };
  return typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS_');
}

function fail(text: string, code: number): void {
  process.stderr.write(`${text}\n`);
  process.exitCode = code;
}

const argv = process.argv.slice(2);
const log = argv[0] === 'migrate' ? logger : stderrLogger;
try {
  await run(argv);
} catch (err) {
  if (err instanceof UsageError) {
    fail(`${err.text(messages, locale)}\n${usage(messages)}`, 2);
  } else if (isParseArgsError(err)) {
    fail(`${err.message}\n${usage(messages)}`, 2);
  } else if (err instanceof CommandError) {
    fail(err.text(messages, locale), 1);
  } else if (err instanceof ConfigError) {
    fail(`${messages.config_error({})}: ${err.message}`, 1);
  } else {
    log.fatal({ err }, `${argv[0] ?? 'command'} failed`);
    process.exitCode = 1;
  }
}
