import type { TenantDb } from '@kronaut/db';
import { newConfirmationCode, requestHash, subjectHmac } from './signed-request.ts';

export interface Received {
  readonly id: string;
  readonly kind: string;
  readonly provider: string;
  readonly confirmation_code: string | null;
  readonly completed_at: Date | null;
}

export interface Incoming {
  readonly provider: string;
  readonly kind: 'deletion' | 'deauthorize';
  readonly signedRequest: string;
}

export async function usableAppId(trx: TenantDb, provider: string): Promise<string | null> {
  const rows = await trx
    .selectFrom('provider_apps')
    .select('id')
    .where('provider', '=', provider)
    .where('status', '<>', 'disabled')
    .where('instance_host', '=', '')
    .limit(2)
    .execute();
  const [only] = rows;
  return rows.length === 1 && only !== undefined ? only.id : null;
}

export async function insertRequest(
  trx: TenantDb,
  values: Incoming & { readonly userId: string; readonly subjectKey: Uint8Array },
): Promise<Received> {
  const hash = requestHash(values.signedRequest);
  const columns = ['id', 'kind', 'provider', 'confirmation_code', 'completed_at'] as const;
  const inserted = await trx
    .insertInto('meta_lifecycle_requests')
    .values({
      provider: values.provider,
      kind: values.kind,
      request_hash: hash,
      subject_hmac: subjectHmac(values.subjectKey, values.userId),
      subject_id: values.userId,
      confirmation_code: values.kind === 'deletion' ? newConfirmationCode() : null,
    })
    .onConflict((oc) => oc.columns(['provider', 'kind', 'request_hash']).doNothing())
    .returning(columns)
    .executeTakeFirst();
  return (
    inserted ??
    (await trx
      .selectFrom('meta_lifecycle_requests')
      .select(columns)
      .where('provider', '=', values.provider)
      .where('kind', '=', values.kind)
      .where('request_hash', '=', hash)
      .executeTakeFirstOrThrow())
  );
}

export function readDeletionRequest(trx: TenantDb, code: string) {
  return trx
    .selectFrom('meta_lifecycle_requests')
    .select(['completed_at', 'matched'])
    .where('confirmation_code', '=', code)
    .executeTakeFirst();
}
