import { HttpError, type IssueDetail } from './errors.ts';

export function unprocessable(details: readonly IssueDetail[]): HttpError {
  return new HttpError('unprocessable', 'The post could not be saved.', { details });
}

export function invalid(details: readonly IssueDetail[]): HttpError {
  return new HttpError('unprocessable', 'The query is invalid.', { details });
}
