import { ApiRequestError } from '@kronaut/sdk';
import { type Channel, errorCode, errorDetails, errorStatus } from '../api.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { destinationIndex, issueMessage } from './issues.ts';
import { MarkedImageError, type SubmitError, type SubmitTarget } from './submit.ts';

const VARIANT_PATH = /(?:^|\.)variants\.(\d+)(?:\.|$)/;

function variantIndex(path: string): number | null {
  const match = VARIANT_PATH.exec(path);
  return match?.[1] === undefined ? null : Number(match[1]);
}

type ChannelName = (target: SubmitTarget | undefined) => string | null;

function uploadHeadline(error: SubmitError, nameOf: ChannelName): string {
  const position = (error.image?.index ?? 0) + 1;
  const variant = error.image?.variant ?? null;
  const channel =
    variant === null ? null : nameOf(error.destinations.find((d) => d.variant === variant));
  return channel === null
    ? m.compose_error_upload({ position })
    : m.compose_error_upload_channel({ position, channel });
}

function failureHeadline(error: SubmitError, nameOf: ChannelName): string {
  const cause = error.cause;
  if (cause instanceof MarkedImageError) {
    return m.compose_error_ai_marked({ position: (error.image?.index ?? 0) + 1 });
  }
  if (error.step === 'upload') return uploadHeadline(error, nameOf);
  if (errorDetails(cause).length > 0) return m.compose_error_fix();
  if (errorCode(cause) === 'approval_required') return m.compose_error_approval_required();
  if (errorCode(cause) === 'conflict') return m.approval_error_waiting();
  if (errorStatus(cause) === 409) return m.compose_error_conflict();
  return apiErrorMessage(cause instanceof ApiRequestError ? cause.code : 'unavailable');
}

function uploadReason(error: SubmitError): string | null {
  if (error.step !== 'upload' || error.cause instanceof MarkedImageError) return null;
  const status = errorStatus(error.cause);
  if (status === 415) return issueMessage('mime_unsupported');
  if (status === 413) return issueMessage('file_too_large');
  return apiErrorMessage(error.cause instanceof ApiRequestError ? error.cause.code : 'unavailable');
}

export function Failure({
  error,
  channels,
}: {
  readonly error: SubmitError;
  readonly channels: readonly Channel[];
}) {
  const details = errorDetails(error.cause);
  const reason = uploadReason(error);
  const code = error.cause instanceof ApiRequestError ? error.cause.code : null;
  const nameOf: ChannelName = (target) =>
    channels.find((channel) => channel.id === target?.accountId)?.displayName ?? null;
  const channelName = (path: string): string | null => {
    const index = destinationIndex(path);
    if (index !== null) return nameOf(error.destinations[index]);
    const variant = variantIndex(path);
    return variant === null ? null : nameOf(error.destinations.find((d) => d.variant === variant));
  };
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-4 text-sm"
    >
      <p className="font-medium text-destructive">{failureHeadline(error, nameOf)}</p>
      {reason === null ? null : <p>{reason}</p>}
      {details.length === 0 ? null : (
        <ul className="list-disc pl-5">
          {details.map((detail) => {
            const channel = channelName(detail.path);
            const message = issueMessage(detail.code);
            return (
              <li key={`${detail.path}|${detail.code}`}>
                {channel === null ? message : m.compose_issue_on_channel({ channel, message })}
              </li>
            );
          })}
        </ul>
      )}
      {code === null ? null : (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer">{m.technical_details()}</summary>
          <ul className="mt-1 font-mono text-xs">
            <li>{code}</li>
            {details.map((detail) => (
              <li key={`${detail.path}|${detail.code}`}>
                {detail.path}: {detail.code}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
