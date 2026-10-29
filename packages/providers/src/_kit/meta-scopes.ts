export function scopeCapabilities(
  scopes: readonly string[],
  byCapability: Readonly<Record<string, string>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(byCapability).map(([capability, scope]) => [capability, scopes.includes(scope)]),
  );
}
