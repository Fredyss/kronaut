import type { TenantDb } from '@kronaut/db';
import type { IssueDetail } from '../../base/http/errors.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';

export interface PostRouteDeps {
  readonly providers: ProviderRegistry;
}

export interface Resolving {
  readonly trx: TenantDb;
  readonly workspaceId: string;
  readonly details: IssueDetail[];
}
