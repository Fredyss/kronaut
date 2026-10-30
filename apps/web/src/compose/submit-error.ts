import { detailCodes, errorCode } from '../api.ts';

export interface SubmitTarget {
  readonly accountId: string;
  readonly variant: number | null;
}

export interface FailedImage {
  readonly index: number;
  readonly variant: number | null;
}

export type SubmitStep = 'upload' | 'unschedule' | 'create' | 'update' | 'schedule' | 'request';

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
