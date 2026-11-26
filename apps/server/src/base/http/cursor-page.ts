import { decodePublicId, type IdKind } from '@kronaut/core';
import * as z from 'zod';
import { invalid } from './issues.ts';

const LIMIT_DIGITS = /^[0-9]{1,3}$/;

export function cursorPageFields(maxLimit: number) {
  return {
    cursor: z.string().max(64).optional(),
    limit: z
      .string()
      .regex(LIMIT_DIGITS)
      .transform(Number)
      .pipe(z.number().int().min(1).max(maxLimit))
      .optional(),
  };
}

export function cursorAfter(kind: IdKind, cursor: string | undefined): string | null {
  const after = cursor === undefined ? null : decodePublicId(kind, cursor);
  if (cursor !== undefined && after === null) {
    throw invalid([{ path: 'query.cursor', code: 'invalid_cursor' }]);
  }
  return after;
}
