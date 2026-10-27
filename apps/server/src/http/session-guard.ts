import type { Database } from '@kronaut/db';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { type SessionRecord, slideSession, slideTarget } from '../auth/session.ts';
import { HttpError } from './errors.ts';

export interface SessionRequest {
  readonly request: Request;
  readonly now: Temporal.Instant;
  readonly logger: Logger;
}

const UNSAFE_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function guardSession(
  db: Database,
  origin: string,
  record: SessionRecord,
  req: SessionRequest,
): Promise<void> {
  const { request, now, logger } = req;
  if (UNSAFE_METHODS.has(request.method) && request.headers.get('origin') !== origin) {
    throw new HttpError('forbidden', 'Cross-site request rejected.');
  }
  if (slideTarget(record, now) !== null) {
    try {
      await slideSession(db, record, now);
    } catch (err) {
      logger.warn({ err }, 'session idle extension failed');
    }
  }
}
