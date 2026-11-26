import { isDeepStrictEqual } from 'node:util';
import {
  analyticsScheduleOf,
  type PostTypeSpec,
  type ProviderManifest,
  type ProviderRuntime,
} from '@kronaut/core';

const MAX_PULLS = 6;

function postTypeProblems(type: PostTypeSpec, firstPull: number): string[] {
  const problems: string[] = [];
  const ids = type.steps.map((step) => step.id);
  if (new Set(ids).size !== ids.length) problems.push(`${type.id}: duplicate step ids`);
  if (type.delivery === 'api' && !type.steps.some((step) => step.effect === 'public'))
    problems.push(`${type.id}: no public step`);
  if (type.text.length === 0) problems.push(`${type.id}: no text limit`);
  if (type.media.minCount > type.media.maxCount) problems.push(`${type.id}: media min > max`);
  const windowHours = type.analytics?.windowHours;
  if (windowHours !== undefined && !(windowHours > firstPull))
    problems.push(`${type.id}: analytics window must cover the first pull at ${firstPull} h`);
  return problems;
}

function scheduleProblems(manifest: ProviderManifest): string[] {
  const { pullHours, followersEveryDays } = analyticsScheduleOf(manifest);
  const problems: string[] = [];
  const whole = pullHours.every(
    (hours, index) => Number.isInteger(hours) && hours > (pullHours[index - 1] ?? 0),
  );
  if (pullHours.length === 0 || pullHours.length > MAX_PULLS || !whole)
    problems.push(`analytics pull hours must be 1–${MAX_PULLS} whole hours, rising from above 0`);
  if (!(Number.isInteger(followersEveryDays) && followersEveryDays >= 1))
    problems.push('analytics follower cadence must be whole days, at least 1');
  return problems;
}

function settingsProblems(manifest: ProviderManifest): string[] {
  const defaults = manifest.settings.safeParse({});
  if (!defaults.success) return ['settings reject {}'];
  if (!isDeepStrictEqual(manifest.settings.safeParse(defaults.data).data, defaults.data))
    return ['settings do not round-trip'];
  return [];
}

function retentionProblems(manifest: ProviderManifest): string[] {
  const retention = manifest.dataRetention;
  if (retention === undefined) return [];
  const days = [retention.disconnectedDays, retention.lapsedDays];
  return days.every((value) => Number.isInteger(value) && value >= 1)
    ? []
    : ['data retention days must be whole and at least 1'];
}

export function conformanceProblems(
  manifest: ProviderManifest,
  runtime: ProviderRuntime,
): string[] {
  const problems: string[] = [];
  if (manifest.id !== runtime.id) problems.push(`runtime id ${runtime.id} ≠ ${manifest.id}`);
  if (manifest.egressHosts.length === 0) problems.push('no egress hosts');
  if (manifest.postTypes.length === 0) problems.push('no post types');
  const firstPull = analyticsScheduleOf(manifest).pullHours[0] ?? 0;
  for (const type of manifest.postTypes) problems.push(...postTypeProblems(type, firstPull));
  if (manifest.auth.refresh !== 'none' && runtime.refresh === undefined)
    problems.push(`refresh ${manifest.auth.refresh} without runtime.refresh`);
  if (manifest.auth.instanceScoped === true && runtime.registerApp === undefined)
    problems.push('instanceScoped without runtime.registerApp');
  if (manifest.auth.connectPicker === 'kronaut' && manifest.auth.refresh !== 'none')
    problems.push('a Kronaut picker needs accounts without refreshable secrets');
  if (manifest.verify.mode !== 'none' && runtime.verify === undefined)
    problems.push(`verify ${manifest.verify.mode} without runtime.verify`);
  if (manifest.capabilities.analytics && runtime.analytics === undefined)
    problems.push('analytics without runtime.analytics');
  problems.push(...scheduleProblems(manifest));
  problems.push(...settingsProblems(manifest));
  problems.push(...retentionProblems(manifest));
  return problems;
}
