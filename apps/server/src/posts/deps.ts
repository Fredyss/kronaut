import type { ProviderRegistry } from '../providers.ts';

export interface PostRouteDeps {
  readonly providers: ProviderRegistry;
}
