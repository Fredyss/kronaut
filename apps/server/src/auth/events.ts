import type { TenantDb } from '@kronaut/db';
import { HttpError } from '../http/errors.ts';
import type { RequestContext, SessionInfo } from '../http/types.ts';

export interface SecurityEvent {
  readonly kind: string;
  readonly userId: string | null;
  readonly detail: Readonly<Record<string, string>>;
}

export async function recordEvent(
  trx: TenantDb,
  ctx: RequestContext,
  { kind, userId, detail }: SecurityEvent,
): Promise<void> {
  await trx
    .insertInto('security_events')
    .values({ kind, user_id: userId, ip_prefix: ctx.ipPrefix, detail: JSON.stringify(detail) })
    .execute();
}

export function requireSession(ctx: RequestContext): SessionInfo {
  if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
  return ctx.session;
}
