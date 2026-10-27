import type { TenantDb } from '@kronaut/db';
import { HttpError, type IssueDetail } from '../http/errors.ts';

export interface Resolving {
  readonly trx: TenantDb;
  readonly workspaceId: string;
  readonly details: IssueDetail[];
}

export function unprocessable(details: readonly IssueDetail[]): HttpError {
  return new HttpError('unprocessable', 'The post could not be saved.', { details });
}
