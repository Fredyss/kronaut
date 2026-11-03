import { defineRoute } from '@kronaut/contract';
import { SELF_ACTION } from '@kronaut/core';
import { locales } from '@kronaut/i18n/runtime';
import * as z from 'zod';
import { HttpError } from '../../base/http/errors.ts';
import { type BoundRoute, bindRoute } from '../../base/http/request.ts';
import { requireSession } from './events.ts';
import {
  DISPLAY_NAME_MAX_LENGTH,
  SESSION_INVALID,
  USER_COLUMNS,
  UserSchema,
  userDto,
} from './profile.ts';
import type { AuthDeps } from './routes.ts';

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
