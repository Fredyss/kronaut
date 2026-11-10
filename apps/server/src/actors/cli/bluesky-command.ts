import { parseArgs } from 'node:util';
import type { CliMessages } from '@kronaut/i18n/cli';
import {
  checkVideoAuth,
  type UploadLimits,
  type VideoCheckResult,
  type VideoVerdict,
  videoVerdict,
} from '@kronaut/providers/bluesky/video-check';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import { Temporal } from 'temporal-polyfill';
import { createBaseContext, createProviderRegistry } from '../../base/providers/providers.ts';
import {
  type ChannelCheck,
  type CheckedChannel,
  checkBlueskyChannels,
  findBlueskyChannels,
  type VideoChecker,
} from './bluesky-video.ts';
import { keyring, messages, stderrLogger, withDatabase } from './context.ts';
import { CommandError, UsageError } from './errors.ts';

const LABEL_WIDTH = 14;

function videoChecker(): VideoChecker {
  const entry = createProviderRegistry(manifests, runtimes).get('bluesky');
  if (entry === undefined) throw new Error('the bluesky provider is not registered');
  return (credentials) =>
    checkVideoAuth(
      createBaseContext(entry, stderrLogger, new AbortController().signal),
      credentials,
    );
}

function resultText(m: CliMessages, result: VideoCheckResult): string {
  switch (result.outcome) {
    case 'ok':
      return m.video_check_ok({});
    case 'refused': {
      const refused = m.video_check_refused({ status: String(result.status) });
      return result.code === undefined ? refused : `${refused} ${result.code}`;
    }
    case 'failed':
      return m.video_check_failed({
        reason: result.code === undefined ? result.kind : `${result.kind}: ${result.code}`,
      });
    case 'skipped':
      return m.video_check_skipped({});
  }
}

function limitsText(limits: UploadLimits): string {
  const parts = [`canUpload=${String(limits.canUpload)}`];
  if (limits.remainingDailyVideos !== undefined)
    parts.push(`remainingDailyVideos=${limits.remainingDailyVideos}`);
  if (limits.remainingDailyBytes !== undefined)
    parts.push(`remainingDailyBytes=${limits.remainingDailyBytes}`);
  if (limits.error !== undefined) parts.push(`error=${limits.error}`);
  if (limits.message !== undefined) parts.push(`message=${JSON.stringify(limits.message)}`);
  return parts.join(' ');
}

function verdictText(m: CliMessages, verdict: VideoVerdict): string {
  if (verdict === 'ready') return m.video_verdict_ready({});
  if (verdict === 'account_blocked') return m.video_verdict_account_blocked({});
  if (verdict === 'upload_refused') return m.video_verdict_upload_refused({});
  return m.video_verdict_inconclusive({});
}

function skippedText(m: CliMessages, check: Exclude<ChannelCheck, { kind: 'checked' }>): string {
  if (check.kind === 'no_credential') return m.video_check_no_credential({});
  if (check.kind === 'unreadable') return m.video_check_unreadable({});
  return m.video_check_expired({});
}

export function renderChannel(m: CliMessages, { id, name, check }: CheckedChannel): string {
  const lines = [`${name}  ${id}`];
  if (check.kind !== 'checked') return [...lines, `  ${skippedText(m, check)}`].join('\n');
  const { report } = check;
  for (const { id: checkId, result } of report.checks) {
    const limits =
      checkId === 'upload_limits' && report.limits !== undefined
        ? `  ${limitsText(report.limits)}`
        : '';
    lines.push(`  ${checkId.padEnd(LABEL_WIDTH)}${resultText(m, result)}${limits}`);
  }
  lines.push(`  ${verdictText(m, videoVerdict(report))}`);
  return lines.join('\n');
}

async function videoCheckCommand(args: readonly string[]): Promise<void> {
  const { positionals } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: {},
  });
  if (positionals.length > 1) throw new UsageError((m) => m.expected_at_most_one_handle({}));
  const ring = keyring();
  const channels = await withDatabase('KRONAUT_DATABASE_URL', (db) =>
    findBlueskyChannels({ db, keyring: ring }, positionals[0]),
  );
  if (channels.length === 0) throw new CommandError((m) => m.no_bluesky_channel({}));
  const checked = await checkBlueskyChannels(channels, videoChecker(), () =>
    Temporal.Now.instant(),
  );
  process.stdout.write(
    `${checked.map((channel) => renderChannel(messages, channel)).join('\n\n')}\n`,
  );
}

export async function blueskyCommand(args: readonly string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === 'video-check') {
    await videoCheckCommand(rest);
    return;
  }
  throw new UsageError((m) => m.unknown_bluesky_command({}));
}
