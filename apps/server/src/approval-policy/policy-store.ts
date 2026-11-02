import { randomUUID } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { auditActor } from '../audit/write.ts';
import { HttpError } from '../http/errors.ts';
import { ExpectedVersion } from '../http/params.ts';
import type { RequestContext } from '../http/types.ts';
import { type EffectivePolicy, policyOf } from './policy.ts';

export const PolicyValues = z.object({
  mode: z.enum(['none', 'required']),
  requiredApprovals: z.number().int().min(1).max(5),
  allowSelfApproval: z.boolean(),
  rescheduleToleranceMin: z.number().int().min(0).max(525_600),
});

export const PolicyBody = z.strictObject({
  ...PolicyValues.shape,
  expectedVersion: ExpectedVersion.optional(),
});

export const ApprovalPolicySchema = z.object({
  brandId: z.string().nullable(),
  ...PolicyValues.shape,
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export type ApprovalPolicyDto = z.output<typeof ApprovalPolicySchema>;
export type PolicyInput = z.output<typeof PolicyBody>;

export interface PolicyScope {
  readonly workspaceId: string;
  readonly brandId: string | null;
}

export interface PolicyWrite extends PolicyScope {
  readonly action: string;
}

const COLUMNS = [
  'id',
  'brand_id',
  'version',
  'mode',
  'required_approvals',
  'allow_self_approval',
  'reschedule_tolerance_min',
  'updated_at',
] as const;

function policyRows(trx: TenantDb, workspaceId: string) {
  return trx
    .selectFrom('approval_policies')
    .select(COLUMNS)
    .where('workspace_id', '=', workspaceId);
}

type StoredPolicy = Awaited<ReturnType<ReturnType<typeof policyRows>['execute']>>[number];

export function valuesOf(policy: EffectivePolicy): z.output<typeof PolicyValues> {
  return {
    mode: policy.mode,
    requiredApprovals: policy.requiredApprovals,
    allowSelfApproval: policy.allowSelfApproval,
    rescheduleToleranceMin: policy.rescheduleToleranceMin,
  };
}

function policyDto(row: StoredPolicy): ApprovalPolicyDto {
  return {
    brandId: row.brand_id === null ? null : encodePublicId('brand', row.brand_id),
    ...valuesOf(policyOf(row)),
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listPolicies(trx: TenantDb, workspaceId: string) {
  const rows = await policyRows(trx, workspaceId)
    .orderBy(sql`brand_id nulls first`)
    .orderBy('id')
    .execute();
  const workspace = rows.find((row) => row.brand_id === null);
  return {
    workspace: workspace === undefined ? null : policyDto(workspace),
    brands: rows.filter((row) => row.brand_id !== null).map(policyDto),
  };
}

export async function requireBrand(trx: TenantDb, workspaceId: string, brandId: string) {
  const brand = await trx
    .selectFrom('brands')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', brandId)
    .executeTakeFirst();
  if (brand === undefined) throw new HttpError('not_found', 'Brand not found.');
}

interface PolicyAudit extends PolicyWrite {
  readonly policyId: string;
  readonly args: Readonly<Record<string, unknown>>;
}

async function writePolicyAudit(trx: TenantDb, ctx: RequestContext, audit: PolicyAudit) {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: audit.workspaceId,
      ...(await auditActor(trx, audit.workspaceId, ctx.principal)),
      action: audit.action,
      resource_kind: 'approval_policy',
      resource_id: audit.policyId,
      brand_id: audit.brandId,
      outcome: 'ok',
      args_summary: JSON.stringify(audit.args),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

function scoped(trx: TenantDb, { workspaceId, brandId }: PolicyScope) {
  const rows = policyRows(trx, workspaceId);
  return brandId === null
    ? rows.where('brand_id', 'is', null)
    : rows.where('brand_id', '=', brandId);
}

export async function savePolicy(
  trx: TenantDb,
  ctx: RequestContext,
  write: PolicyWrite,
  body: PolicyInput,
): Promise<ApprovalPolicyDto> {
  const current = await scoped(trx, write).forUpdate().executeTakeFirst();
  if (body.expectedVersion !== undefined && current?.version !== body.expectedVersion) {
    throw new HttpError('version_conflict', 'The approval policy was changed by someone else.');
  }
  const values = {
    mode: body.mode,
    required_approvals: body.requiredApprovals,
    allow_self_approval: body.allowSelfApproval,
    reschedule_tolerance_min: body.rescheduleToleranceMin,
  };
  const row = await trx
    .insertInto('approval_policies')
    .values({ workspace_id: write.workspaceId, brand_id: write.brandId, ...values })
    .onConflict((oc) =>
      oc.constraint('ux_policy_scope').doUpdateSet({
        ...values,
        version: sql<number>`approval_policies.version + 1`,
        updated_at: sql<Date>`now()`,
      }),
    )
    .returning(COLUMNS)
    .executeTakeFirstOrThrow();
  await writePolicyAudit(trx, ctx, {
    ...write,
    policyId: row.id,
    args: { ...values, previous_version: current?.version ?? null },
  });
  return policyDto(row);
}

export async function deletePolicy(
  trx: TenantDb,
  ctx: RequestContext,
  write: PolicyWrite & { readonly brandId: string },
): Promise<void> {
  const removed = await trx
    .deleteFrom('approval_policies')
    .where('workspace_id', '=', write.workspaceId)
    .where('brand_id', '=', write.brandId)
    .returning(['id', 'version'])
    .executeTakeFirst();
  if (removed === undefined) {
    throw new HttpError('not_found', 'The brand has no approval policy override.');
  }
  await writePolicyAudit(trx, ctx, {
    ...write,
    policyId: removed.id,
    args: { previous_version: removed.version },
  });
}
