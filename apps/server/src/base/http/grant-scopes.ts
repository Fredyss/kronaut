import type { Principal } from '@kronaut/core';

export function grantLacks(principal: Principal | null, scope: string): boolean {
  return principal?.kind === 'grant' && !principal.scopes.includes(scope);
}

export function hidesGroups(principal: Principal | null): boolean {
  return grantLacks(principal, 'groups:read');
}
