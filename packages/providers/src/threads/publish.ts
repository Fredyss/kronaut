import type { ProviderFailure, PublishContext, PublishOutcome, VerifyOutcome } from '@kronaut/core';
import * as z from 'zod';
import {
  type ContainerApi,
  type ContainerStatus,
  publishContainers,
  verifyContainer,
} from '../_kit/meta-container.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { createContainers } from './create-containers.ts';
import { graph } from './graph.ts';
import { checkInput, type Input } from './publish-input.ts';
import { recover } from './recover.ts';

const SETTLE_MS = 30_000;
const ERROR_CODE = /^[A-Z][A-Z_]{0,63}$/;

const containerStatus = z
  .looseObject({ status: z.string(), error_message: z.string().nullish() })
  .transform((value): ContainerStatus => ({ code: value.status, detail: value.error_message }));

function statusFailure(status: ContainerStatus): ProviderFailure {
  const detail = status.detail;
  return permanent(
    'container_error',
    typeof detail === 'string' && ERROR_CODE.test(detail) ? detail : undefined,
  );
}

const api: ContainerApi<Input> = {
  graph,
  statusFields: 'status,error_message',
  status: containerStatus,
  publishPath: 'threads_publish',
  settleMs: SETTLE_MS,
  create: createContainers,
  recover,
  statusFailure,
  retryableStatus: (status) => status.detail === 'UNKNOWN',
};

export async function publishThread(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  return publishContainers(api, ctx, input, checkInput(input));
}

export async function verifyThread(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  return verifyContainer(api, ctx, input);
}
