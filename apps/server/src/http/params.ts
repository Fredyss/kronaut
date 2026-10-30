import { decodePublicId, type IdKind } from '@kronaut/core';
import * as z from 'zod';
import { HttpError } from './errors.ts';

const IANA_TZ = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/;

export const ExpectedVersion = z.number().int().positive();
export const PostParams = z.object({ workspaceId: z.string(), postId: z.string() });

export const InstantFields = {
  scheduleLocal: z.iso.datetime({ local: true }),
  scheduleTz: z.string().max(64).regex(IANA_TZ),
};

export function pathId(kind: IdKind, value: string): string {
  const id = decodePublicId(kind, value);
  if (id === null) throw new HttpError('not_found', 'Not found.');
  return id;
}
