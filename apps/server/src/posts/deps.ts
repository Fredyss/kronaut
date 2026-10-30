import type { TenantDb } from '@kronaut/db';
import type { IssueDetail } from '../http/errors.ts';
import type { ProviderRegistry } from '../providers.ts';

export interface PostRouteDeps {
  readonly providers: ProviderRegistry;
}

export interface Resolving {
  readonly trx: TenantDb;
  readonly workspaceId: string;
  readonly details: IssueDetail[];
}
