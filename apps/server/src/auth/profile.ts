import { defineRoute } from '@kronaut/contract';
import { encodePublicId, SELF_ACTION } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { locales } from '@kronaut/i18n/runtime';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { requireSession } from './events.ts';
import type { AuthDeps } from './routes.ts';

export const DISPLAY_NAME_MAX_LENGTH = 80;

export const SESSION_INVALID = 'The session is invalid or has expired.';

export const UserSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  locale: z.string(),
});

export type UserDto = z.output<typeof UserSchema>;

const USER_COLUMNS = ['id', 'display_name', 'email', 'ui_locale'] as const;

interface UserRow {
  readonly id: string;
  readonly display_name: string | null;
  readonly email: string | null;
  readonly ui_locale: string;
}

function userDto(row: UserRow): UserDto {
  return {
    id: encodePublicId('user', row.id),
    displayName: row.display_name,
    email: row.email,
    locale: row.ui_locale,
  };
}

export async function readUser(trx: TenantDb, userId: string): Promise<UserDto | undefined> {
  const row = await trx
    .selectFrom('users')
    .select(USER_COLUMNS)
    .where('id', '=', userId)
    .executeTakeFirst();
  return row === undefined ? undefined : userDto(row);
}

export const meUpdateRoute = defineRoute({
  id: 'auth.me_update',
  method: 'PATCH',
  path: '/v1/me',
  auth: 'session',
  action: SELF_ACTION,
  body: z
    .strictObject({
      displayName: z.string().trim().normalize('NFC').max(DISPLAY_NAME_MAX_LENGTH).nullable(),
      locale: z.enum(locales),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to change.' }),
  response: z.object({ user: UserSchema }),
  idempotency: false,
  summary: 'Change my name or language',
  description:
    "Changes the signed-in user's own display name and the language their emails use. Send at least one field. The name is trimmed; null or an empty string clears it.",
  tags: ['auth'],
});

type Changes = z.output<typeof meUpdateRoute.body>;

function columnsOf(body: Changes) {
  return {
    ...(body.displayName === undefined ? {} : { display_name: body.displayName || null }),
    ...(body.locale === undefined ? {} : { ui_locale: body.locale }),
  };
}

export function profileRoutes(deps: AuthDeps): BoundRoute[] {
  return [
    bindRoute(meUpdateRoute, async ({ body }, ctx) => {
      const { userId } = requireSession(ctx);
      const row = await deps.db.withActor({ kind: 'user', id: userId }, (trx) =>
        trx
          .updateTable('users')
          .set(columnsOf(body))
          .where('id', '=', userId)
          .where('erased_at', 'is', null)
          .returning(USER_COLUMNS)
          .executeTakeFirst(),
      );
      if (row === undefined) throw new HttpError('unauthenticated', SESSION_INVALID);
      return { body: { user: userDto(row) } };
    }),
  ];
}
