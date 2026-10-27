import type { PostTypeSpec } from '@kronaut/core';
import type { ProviderEntry } from '../providers.ts';
import { prepareInput, publishInput, readResolved } from './input.ts';
import type { openCheck, VerifyScope } from './verify-lookup.ts';
import {
  inconclusive,
  instant,
  type Probed,
  type VerifyPrepared,
  type VerifyRun,
} from './verify-run.ts';

export interface Verifier {
  readonly entry: ProviderEntry | undefined;
  readonly poll: boolean;
  readonly postType: PostTypeSpec | undefined;
}

type RunBase = Omit<VerifyRun, 'target'>;

export function runBase(
  scope: VerifyScope,
  check: Awaited<ReturnType<typeof openCheck>>,
  verifier: Verifier,
): RunBase {
  const { entry, poll, postType } = verifier;
  const windowStart = instant(scope.attempt.public_send_at ?? scope.attempt.started_at);
  const windowMs =
    entry === undefined
      ? 0
      : poll
        ? (postType?.async?.giveUpAfterMs ?? entry.manifest.verify.windowMs)
        : entry.manifest.verify.windowMs;
  return {
    ref: scope.ref,
    context: { ...scope.context, attemptId: check.verifyAttemptId },
    claimedAttemptId: scope.claimedAttemptId,
    attemptCount: scope.dest.attempt_count,
    deadlineAt: scope.deadlineAt,
    mode: entry?.manifest.verify.mode ?? null,
    poll,
    checks: Number(check.checks.n),
    windowEnd: windowStart.add({ milliseconds: windowMs }),
  };
}

export async function runTarget(
  scope: VerifyScope,
  base: RunBase,
  verifier: Verifier,
): Promise<VerifyPrepared> {
  const { trx, job, dest } = scope;
  const { entry, poll, postType } = verifier;
  const skip = (skipped: Probed): VerifyPrepared => ({
    kind: 'run',
    run: { ...base, target: { kind: 'skip', probed: skipped } },
  });

  if (entry === undefined) return skip(inconclusive('provider_unavailable'));
  if (!poll && entry.runtime.verify === undefined) return skip(inconclusive('verify_unsupported'));
  if (postType === undefined) return skip(inconclusive('unknown_post_type'));
  const resolved = await readResolved(trx, {
    workspaceId: job.workspaceId,
    postId: scope.postId,
    frozenPostVersion: scope.postVersion,
    socialAccountId: dest.social_account_id,
    publishType: dest.publish_type,
  });
  if (resolved === undefined) return skip(inconclusive('snapshot_invalid'));
  const prepared = await prepareInput(scope.deps, trx, {
    workspaceId: job.workspaceId,
    publishType: dest.publish_type,
    account: scope.account,
    entry,
    resolved,
    acked: null,
  });
  if (prepared.kind === 'no_credential') return skip(inconclusive('credential_missing'));
  if (prepared.kind === 'fail') {
    return skip(inconclusive(prepared.code, prepared.message ?? undefined));
  }
  const input = publishInput({
    destinationId: job.id,
    attemptNo: scope.attempt.attempt_no,
    publishType: dest.publish_type,
    account: scope.account,
    ready: prepared,
    state: dest.provider_state,
  });
  const steps = new Map(postType.steps.map((step) => [step.id, step.effect]));
  return { kind: 'run', run: { ...base, target: { kind: 'call', call: { entry, steps, input } } } };
}
