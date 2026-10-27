import { randomUUID } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Auth,
  CLI,
  call,
  create,
  draft,
  errorOf,
  grantAuth,
  inMinutes,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  scheduleCall,
  startPosts,
  stopPosts,
  TZ,
  workspaceId,
} from '../posts/testing.ts';
import { addMember, type Member } from './testing.ts';

interface PolicyDto {
  readonly brandId: string | null;
  readonly mode: string;
  readonly version: number;
}

let test: TestDatabase;
let editor: Member;
let brandId: string;

const OPEN = {
  mode: 'none',
  requiredApprovals: 2,
  allowSelfApproval: true,
  rescheduleToleranceMin: 30,
};
const STRICTEST = {
  mode: 'required',
  requiredApprovals: 1,
  allowSelfApproval: false,
  rescheduleToleranceMin: 0,
};

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  editor = await addMember('editor', false);
  brandId = await owner.withActor(CLI, async (trx) => {
    const { id } = await trx
      .insertInto('brands')
      .values({ workspace_id: workspaceId, name: 'Brand', slug: 'brand' })
      .returning('id')
      .executeTakeFirstOrThrow();
    return encodePublicId('brand', id);
  });
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function view(auth: Auth = ownerAuth) {
  const response = await call('GET', 'approval-policy', auth);
  expect(response.status).toBe(200);
  return (await response.json()) as {
    workspace: PolicyDto | null;
    brands: PolicyDto[];
    effective: typeof STRICTEST;
  };
}

async function put(path: string, body: object, auth: Auth = ownerAuth): Promise<PolicyDto> {
  const response = await call('PUT', path, auth, body);
  expect(response.status).toBe(200);
  return (await response.json()) as PolicyDto;
}

function policyAudits() {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'actor_kind', 'actor_id', 'resource_id', 'brand_id', 'args_summary'])
      .where('workspace_id', '=', workspaceId)
      .where('resource_kind', '=', 'approval_policy')
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

describe('approval policy', () => {
  it('shows the strictest default without a workspace row, and PUT creates it', async () => {
    await owner.withActor(CLI, (trx) =>
      trx
        .deleteFrom('approval_policies')
        .where('workspace_id', '=', workspaceId)
        .where('brand_id', 'is', null)
        .execute(),
    );
    expect(await view()).toEqual({ workspace: null, brands: [], effective: STRICTEST });

    const saved = await put('approval-policy', OPEN);
    expect(saved).toEqual({ brandId: null, ...OPEN, version: 1, updatedAt: expect.any(String) });
    expect(await view()).toEqual({ workspace: saved, brands: [], effective: OPEN });
  });

  it('bumps the version and refuses a stale expectedVersion', async () => {
    const before = (await view()).workspace;
    const next = await put('approval-policy', {
      ...OPEN,
      requiredApprovals: 3,
      expectedVersion: before?.version,
    });
    expect(next).toMatchObject({ requiredApprovals: 3, version: (before?.version ?? 0) + 1 });

    const stale = await call('PUT', 'approval-policy', ownerAuth, {
      ...OPEN,
      expectedVersion: before?.version,
    });
    expect(stale.status).toBe(409);
    expect((await errorOf(stale)).code).toBe('version_conflict');
    expect((await view()).workspace).toEqual(next);
  });

  it('rejects unknown fields and out-of-range values', async () => {
    for (const body of [
      { ...OPEN, stages: 2 },
      { ...OPEN, allowReviewerLinks: true },
      { ...OPEN, requiredApprovals: 6 },
      { ...OPEN, rescheduleToleranceMin: 525_601 },
    ]) {
      expect((await call('PUT', 'approval-policy', ownerAuth, body)).status).toBe(400);
    }
  });

  it('lets an editor and a grant read it but not change it', async () => {
    expect((await view(editor.auth)).effective).toEqual((await view()).effective);
    expect((await view(grantAuth)).effective).toEqual((await view()).effective);

    const denied = await call('PUT', 'approval-policy', editor.auth, OPEN);
    expect(denied.status).toBe(403);
    expect((await errorOf(denied)).message).toBe('Your role does not allow this action.');
    expect((await call('PUT', `approval-policy/brands/${brandId}`, editor.auth, OPEN)).status).toBe(
      403,
    );
    expect((await call('DELETE', `approval-policy/brands/${brandId}`, editor.auth)).status).toBe(
      403,
    );
  });

  it('refuses a grant on every write', async () => {
    for (const [method, path, body] of [
      ['PUT', 'approval-policy', OPEN],
      ['PUT', `approval-policy/brands/${brandId}`, OPEN],
      ['DELETE', `approval-policy/brands/${brandId}`, undefined],
    ] as const) {
      expect((await call(method, path, grantAuth, body)).status).toBe(401);
    }
  });

  it('sets and removes a brand override', async () => {
    const brandPath = `approval-policy/brands/${brandId}`;
    const strict = { ...STRICTEST, requiredApprovals: 2 };
    const saved = await put(brandPath, strict);
    expect(saved).toEqual({ brandId, ...strict, version: 1, updatedAt: expect.any(String) });
    const shown = await view();
    expect(shown.brands).toEqual([saved]);
    expect(shown.effective).toMatchObject({ mode: 'none' });

    expect((await call('DELETE', brandPath, ownerAuth)).status).toBe(204);
    expect((await view()).brands).toEqual([]);
    const again = await call('DELETE', brandPath, ownerAuth);
    expect(again.status).toBe(404);

    const unknown = `approval-policy/brands/${encodePublicId('brand', randomUUID())}`;
    expect((await call('PUT', unknown, ownerAuth, OPEN)).status).toBe(404);
    expect((await call('DELETE', unknown, ownerAuth)).status).toBe(404);
  });

  it('audits every write', async () => {
    const audits = await policyAudits();
    expect(audits.map((a) => a.action)).toEqual([
      'approvals.policy_update',
      'approvals.policy_update',
      'approvals.brand_policy_update',
      'approvals.brand_policy_delete',
    ]);
    expect(audits[0]).toMatchObject({
      actor_kind: 'user',
      actor_id: ownerId,
      brand_id: null,
      args_summary: {
        mode: 'none',
        required_approvals: 2,
        allow_self_approval: true,
        reschedule_tolerance_min: 30,
        previous_version: null,
      },
    });
    expect(audits[1]?.args_summary).toMatchObject({ required_approvals: 3, previous_version: 1 });
    expect(audits[1]?.resource_id).toBe(audits[0]?.resource_id);
    expect(audits[3]).toMatchObject({ args_summary: { previous_version: 1 } });
    expect(audits[3]?.resource_id).toBe(audits[2]?.resource_id);
  });

  it('makes scheduling need an approval once the mode is required', async () => {
    const post = await create(ownerAuth, draft());
    await put('approval-policy', { ...OPEN, mode: 'required' });
    const response = await scheduleCall(post, {
      mode: 'instant',
      scheduleLocal: inMinutes(120),
      scheduleTz: TZ,
    });
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe('approval_required');
  });
});
