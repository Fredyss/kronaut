import type { ProviderManifest } from '@kronaut/core';
import type { ValidationIssue } from './validate.ts';

function settingOf(settings: unknown, field: string): unknown {
  if (typeof settings !== 'object' || settings === null || !Object.hasOwn(settings, field))
    return undefined;
  return (settings as Readonly<Record<string, unknown>>)[field];
}

export function validateSettings(manifest: ProviderManifest, settings: unknown): ValidationIssue[] {
  return (manifest.requiredSettings ?? []).flatMap((field): ValidationIssue[] => {
    const value = settingOf(settings, field);
    return typeof value === 'string' && value.trim() !== ''
      ? []
      : [{ code: 'setting_required', field }];
  });
}
