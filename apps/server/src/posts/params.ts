import { decodePublicId, type IdKind } from '@kronaut/core';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';

export const ExpectedVersion = z.number().int().positive();
export const PostParams = z.object({ workspaceId: z.string(), postId: z.string() });

export function pathId(kind: IdKind, value: string): string {
  const id = decodePublicId(kind, value);
  if (id === null) throw new HttpError('not_found', 'Not found.');
  return id;
}
