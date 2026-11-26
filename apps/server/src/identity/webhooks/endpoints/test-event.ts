import { randomUUID } from 'node:crypto';
import { HttpError } from '../../../base/http/errors.ts';
import { takeWindowQuota } from '../../../infrastructure/quota/window-quota.ts';
import { insertEnvelope, WEBHOOK_TEST_EVENT } from '../envelope.ts';
import { auditEndpoint, type EndpointActor } from './save.ts';
import { type EndpointRef, lockEndpoint } from './store.ts';

export const TESTS_PER_HOUR = 10;

// A test goes to the one endpoint asked for, whatever it subscribes to; its dedupe key is unique per request.
export async function sendTestEvent(actor: EndpointActor, ref: EndpointRef): Promise<string> {
  const { workspaceId, endpointId } = ref;
  return await actor.ctx.tenant(async (trx) => {
    const endpoint = await lockEndpoint(trx, ref);
    if (!endpoint.enabled) {
      throw new HttpError('conflict', 'The endpoint is disabled.', {
        details: [{ path: 'params.webhookId', code: 'endpoint_disabled' }],
      });
    }
    const quota = {
      key: `webhook_test:${endpointId}`,
      capacity: TESTS_PER_HOUR,
      windowSeconds: 3600,
    };
    if (!(await takeWindowQuota(trx, quota))) {
      throw new HttpError(
        'rate_limited',
        `At most ${TESTS_PER_HOUR} test events per endpoint per hour.`,
      );
    }
    const eventId = await insertEnvelope(trx, {
      workspaceId,
      type: WEBHOOK_TEST_EVENT,
      dedupeKey: `${WEBHOOK_TEST_EVENT}.${endpointId}.${randomUUID()}`,
      subjectId: endpointId,
      data: {},
    });
    if (eventId === undefined) throw new Error('a test event collided with an existing dedupe key');
    await trx
      .insertInto('webhook_deliveries')
      .values({ workspace_id: workspaceId, endpoint_id: endpointId, event_id: eventId })
      .execute();
    await auditEndpoint(trx, actor, { action: 'webhook_endpoint.tested', endpointId });
    return eventId;
  });
}
