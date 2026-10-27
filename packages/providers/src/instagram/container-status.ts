import type { ProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import type { ContainerStatus } from '../_kit/meta-container.ts';
import { PERMANENT_SUBCODES } from './graph-errors.ts';
import { permanent } from './oauth.ts';

const RETRYABLE_STATUS_SUBCODES = new Set([2207003, 2207008, 2207020, 2207027, 2207052, 2207053]);

export const STATUS_FIELDS = 'status_code,status';

export const containerStatus = z
  .looseObject({ status_code: z.string(), status: z.string().nullish() })
  .transform((value): ContainerStatus => ({ code: value.status_code, detail: value.status }));

function statusSubcode(status: string | null | undefined): number | undefined {
  const match = status?.match(/\b(\d{4,9})\b/);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

export function statusFailure(status: ContainerStatus): ProviderFailure {
  const subcode = statusSubcode(status.detail);
  const known = subcode === undefined ? undefined : PERMANENT_SUBCODES.get(subcode);
  return permanent(known ?? 'container_error', subcode === undefined ? undefined : String(subcode));
}

export function retryableStatus(status: ContainerStatus): boolean {
  const subcode = statusSubcode(status.detail);
  return subcode !== undefined && RETRYABLE_STATUS_SUBCODES.has(subcode);
}
