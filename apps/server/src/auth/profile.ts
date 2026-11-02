import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';

export const DISPLAY_NAME_MAX_LENGTH = 80;

export const SESSION_INVALID = 'The session is invalid or has expired.';

export const UserSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  locale: z.string(),
});

export type UserDto = z.output<typeof UserSchema>;

export const USER_COLUMNS = ['id', 'display_name', 'email', 'ui_locale'] as const;

interface UserRow {
  readonly id: string;
  readonly display_name: string | null;
  readonly email: string | null;
  readonly ui_locale: string;
}

export function userDto(row: UserRow): UserDto {
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
