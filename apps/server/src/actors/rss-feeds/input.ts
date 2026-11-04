import { accountPostType } from '@kronaut/compose';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { HttpError, type IssueDetail } from '../../base/http/errors.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { loadTimetable } from '../../steps/queue/slots.ts';

export const URL_MAX = 2048;
export const NAME_MAX = 100;
export const TEMPLATE_MAX = 1000;

export type FeedMode = 'queue' | 'draft';

function refused(path: string, code: string, message: string): HttpError {
  return new HttpError('unprocessable', message, { details: [{ path, code }] });
}

export function feedUrl(value: string): string {
  const url = value.length > URL_MAX ? null : URL.parse(value.trim());
  const plain = url?.protocol === 'https:' && url.username === '' && url.password === '';
  if (url === null || !plain || url.href.length > URL_MAX) {
    throw refused(
      'body.url',
      'url_invalid',
      'The feed URL must be an https link without credentials.',
    );
  }
  return url.href;
}

export function feedName(value: string): string {
  const name = value.normalize('NFC').trim();
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX) {
    throw refused('body.name', 'name_invalid', `A feed's name has 1–${NAME_MAX} characters.`);
  }
  return name;
}

export function feedTemplate(value: string): string {
  const template = value.normalize('NFC');
  if (template.trim() === '' || [...template].length > TEMPLATE_MAX) {
    throw refused(
      'body.template',
      'template_invalid',
      `A template has 1–${TEMPLATE_MAX} characters.`,
    );
  }
  return template;
}

export function textOnlyType(
  providers: ProviderRegistry,
  account: { readonly provider: string; readonly capabilities: unknown },
): string | null {
  const manifest = providers.get(account.provider)?.manifest;
  if (manifest === undefined) return null;
  const types = manifest.postTypes.map((type) =>
    accountPostType(manifest, type.id, account.capabilities),
  );
  const text = types.find((type) => type?.delivery !== 'unsupported' && type?.media.minCount === 0);
  return text?.id ?? null;
}

export interface ChannelCheck {
  readonly workspaceId: string;
  readonly channelIds: readonly string[];
  readonly mode: FeedMode;
}

async function feedAccounts(trx: TenantDb, workspaceId: string, accountIds: readonly string[]) {
  if (accountIds.length === 0) return [];
  return await trx
    .selectFrom('social_accounts')
    .select(['id', 'provider', 'capabilities'])
    .where('workspace_id', '=', workspaceId)
    .where('id', 'in', accountIds)
    .execute();
}

async function channelIssue(
  trx: TenantDb,
  providers: ProviderRegistry,
  check: ChannelCheck,
  account: { readonly id: string; readonly provider: string; readonly capabilities: unknown },
): Promise<string | null> {
  if (textOnlyType(providers, account) === null) return 'text_unsupported';
  if (check.mode !== 'queue') return null;
  const { timezone } = await loadTimetable(trx, check.workspaceId, account.id);
  return timezone === null ? 'queue_empty' : null;
}

export async function feedChannels(
  trx: TenantDb,
  providers: ProviderRegistry,
  check: ChannelCheck,
): Promise<string[]> {
  const ids = check.channelIds.map((id) => decodePublicId('socialAccount', id));
  const known = ids.filter((id) => id !== null);
  const rows = await feedAccounts(trx, check.workspaceId, known);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const details: IssueDetail[] = [];
  for (const [index, id] of ids.entries()) {
    const account = id === null ? undefined : byId.get(id);
    const code =
      account === undefined ? 'not_found' : await channelIssue(trx, providers, check, account);
    if (code !== null) details.push({ path: `body.channelIds.${index}`, code });
  }
  if (details.length > 0) {
    throw new HttpError('unprocessable', 'The feed has channels it cannot post to.', { details });
  }
  return [...new Set(known)];
}
