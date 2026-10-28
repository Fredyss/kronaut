import type { ItemAnchor, PublishInput, VerifyMode } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import type { ProviderEntry } from '../providers.ts';
import type { PlanContext } from './apply.ts';
import type { DestinationRef } from './transition.ts';

export type Probed =
  | {
      readonly kind: 'found';
      readonly remoteId: string;
      readonly url?: string;
      readonly anchor?: ItemAnchor;
    }
  | { readonly kind: 'absent' }
  | { readonly kind: 'pending'; readonly pollAfterMs: number }
  | {
      readonly kind: 'inconclusive';
      readonly errorCode?: string;
      readonly errorMessage?: string;
    };

export interface Call {
  readonly entry: ProviderEntry;
  readonly steps: ReadonlyMap<string, string>;
  readonly input: PublishInput<unknown, unknown>;
}

export interface VerifyRun {
  readonly ref: DestinationRef;
  readonly context: PlanContext;
  readonly claimedAttemptId: string;
  readonly attemptCount: number;
  readonly deadlineAt: Temporal.Instant | null;
  readonly mode: VerifyMode | null;
  readonly poll: boolean;
  readonly checks: number;
  readonly windowEnd: Temporal.Instant;
  readonly target:
    | { readonly kind: 'call'; readonly call: Call }
    | { readonly kind: 'skip'; readonly probed: Probed };
}

export type VerifyPrepared =
  | { readonly kind: 'done' }
  | { readonly kind: 'run'; readonly run: VerifyRun };

export function instant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export function inconclusive(errorCode: string, errorMessage?: string): Probed {
  return errorMessage === undefined
    ? { kind: 'inconclusive', errorCode }
    : { kind: 'inconclusive', errorCode, errorMessage };
}
