import { isDeepStrictEqual } from 'node:util';
import type { PostTypeSpec, ProviderManifest, ProviderRuntime } from '@kronaut/core';

function postTypeProblems(type: PostTypeSpec): string[] {
  const problems: string[] = [];
  const ids = type.steps.map((step) => step.id);
  if (new Set(ids).size !== ids.length) problems.push(`${type.id}: duplicate step ids`);
  if (type.delivery === 'api' && !type.steps.some((step) => step.effect === 'public'))
    problems.push(`${type.id}: no public step`);
  if (type.text.length === 0) problems.push(`${type.id}: no text limit`);
  if (type.media.minCount > type.media.maxCount) problems.push(`${type.id}: media min > max`);
  return problems;
}

function settingsProblems(manifest: ProviderManifest): string[] {
  const defaults = manifest.settings.safeParse({});
  if (!defaults.success) return ['settings reject {}'];
  if (!isDeepStrictEqual(manifest.settings.safeParse(defaults.data).data, defaults.data))
    return ['settings do not round-trip'];
  return [];
}

export function conformanceProblems(
  manifest: ProviderManifest,
  runtime: ProviderRuntime,
): string[] {
  const problems: string[] = [];
  if (manifest.id !== runtime.id) problems.push(`runtime id ${runtime.id} ≠ ${manifest.id}`);
  if (manifest.egressHosts.length === 0) problems.push('no egress hosts');
  if (manifest.postTypes.length === 0) problems.push('no post types');
  for (const type of manifest.postTypes) problems.push(...postTypeProblems(type));
  if (manifest.auth.refresh !== 'none' && runtime.refresh === undefined)
    problems.push(`refresh ${manifest.auth.refresh} without runtime.refresh`);
  if (manifest.auth.instanceScoped === true && runtime.registerApp === undefined)
    problems.push('instanceScoped without runtime.registerApp');
  if (manifest.verify.mode !== 'none' && runtime.verify === undefined)
    problems.push(`verify ${manifest.verify.mode} without runtime.verify`);
  problems.push(...settingsProblems(manifest));
  return problems;
}
