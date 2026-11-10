import { detailCodes, errorCode, errorDetails } from '../../../base/api/errors.ts';
import { destinationIndex } from '../issues.ts';

export interface SubmitTarget {
  readonly accountId: string;
  readonly variant: number | null;
}

export interface FailedImage {
  readonly index: number;
  readonly variant: number | null;
}

export type SubmitStep =
  | 'upload'
  | 'unschedule'
  | 'create'
  | 'update'
  | 'tags'
  | 'tags_opened'
  | 'tags_unscheduled'
  | 'schedule'
  | 'request';

export function refusedForApproval(error: unknown): boolean {
  if (errorCode(error) === 'approval_required') return true;
  return detailCodes(error).includes('outside_approved_schedule');
}

export class MarkedImageError extends Error {
  constructor() {
    super('the image is already marked as AI-generated');
    this.name = 'MarkedImageError';
  }
}

export class SubmitError extends Error {
  readonly step: SubmitStep;
  readonly destinations: readonly SubmitTarget[];
  readonly image: FailedImage | null;
  unscheduled = false;

  constructor(
    step: SubmitStep,
    cause: unknown,
    destinations: readonly SubmitTarget[],
    image: FailedImage | null = null,
  ) {
    super(`compose ${step} failed`, { cause });
    this.name = 'SubmitError';
    this.step = step;
    this.destinations = destinations;
    this.image = image;
  }
}

export function isStalePick(detail: { readonly path: string; readonly code: string }): boolean {
  return (
    detail.path.endsWith('.sourceGroupId') &&
    (detail.code === 'not_in_group' || detail.code === 'not_found')
  );
}

export function stalePickAccounts(error: SubmitError): string[] {
  const accounts = new Set<string>();
  for (const detail of errorDetails(error.cause)) {
    if (!isStalePick(detail)) continue;
    const index = destinationIndex(detail.path);
    const accountId = index === null ? undefined : error.destinations[index]?.accountId;
    if (accountId !== undefined) accounts.add(accountId);
  }
  return [...accounts];
}
