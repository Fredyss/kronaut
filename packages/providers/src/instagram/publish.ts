import type { PublishContext, PublishOutcome, VerifyOutcome } from '@kronaut/core';
import { type ContainerApi, publishContainers, verifyContainer } from '../_kit/meta-container.ts';
import {
  containerStatus,
  retryableStatus,
  STATUS_FIELDS,
  statusFailure,
} from './container-status.ts';
import { createContainers } from './create-containers.ts';
import { graph } from './graph-call.ts';
import { checkQuota, logConfigIssue } from './publish-container.ts';
import { checkInput, type Input } from './publish-input.ts';
import { recover } from './recover.ts';

const api: ContainerApi<Input> = {
  graph,
  statusFields: STATUS_FIELDS,
  status: containerStatus,
  publishPath: 'media_publish',
  create: createContainers,
  recover,
  statusFailure,
  retryableStatus,
  beforePublish: checkQuota,
  afterPublish: logConfigIssue,
};

export async function publishMedia(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  return publishContainers(api, ctx, input, checkInput(input));
}

export async function verifyMedia(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  return verifyContainer(api, ctx, input);
}
