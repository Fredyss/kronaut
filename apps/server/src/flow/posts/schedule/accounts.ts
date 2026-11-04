import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { FreezeInput, FreezeTarget } from './freeze.ts';

export interface AccountFacts {
  readonly capabilities: unknown;
  readonly signature: unknown;
  readonly shorten: boolean;
}

export type Accounts = ReadonlyMap<string, AccountFacts>;

export async function loadAccounts(trx: TenantDb, input: FreezeInput): Promise<Accounts> {
  const ids = [...new Set(input.targets.map((target) => target.socialAccountId))];
  if (ids.length === 0) return new Map();
  const rows = await trx
    .selectFrom('social_accounts as a')
    .leftJoin('saved_texts as s', (join) =>
      join.onRef('s.workspace_id', '=', 'a.workspace_id').onRef('s.id', '=', 'a.saved_text_id'),
    )
    .select(['a.id', 'a.capabilities', 's.doc as signature'])
    .select(
      sql<boolean>`a.shorten_links and exists (
        select 1 from link_shorteners l where l.workspace_id = a.workspace_id)`.as('shorten'),
    )
    .where('a.workspace_id', '=', input.workspaceId)
    .where('a.id', 'in', ids)
    .execute();
  return new Map(rows.map(({ id, ...facts }) => [id, facts]));
}

export function signatureField(target: FreezeTarget, accounts: Accounts) {
  const { held, skipSignature, socialAccountId } = target;
  const current = skipSignature ? null : (accounts.get(socialAccountId)?.signature ?? null);
  const signature = held === null ? current : held.signature;
  return signature === null ? {} : { signature };
}

export function shortenField(target: FreezeTarget, accounts: Accounts) {
  return accounts.get(target.socialAccountId)?.shorten === true ? { shorten: true } : {};
}
