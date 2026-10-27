import type { Keyring } from '@kronaut/credentials';
import type { MediaStore } from '@kronaut/media';
import { approvalRoutes } from '../approvals/routes.ts';
import { passwordChangeRoutes } from '../auth/password-change.ts';
import { profileRoutes } from '../auth/profile.ts';
import { reauthRoutes } from '../auth/reauth.ts';
import { authRoutes } from '../auth/routes.ts';
import { channelRoutes } from '../channels/routes.ts';
import { destinationRoutes } from '../destinations/routes.ts';
import { mediaRoutes } from '../media/routes.ts';
import { notificationRoutes } from '../notifications/routes.ts';
import { postRoutes } from '../posts/routes.ts';
import type { ProviderRegistry } from '../providers.ts';
import type { HttpDeps } from './kernel.ts';
import { systemRoutes } from './system-routes.ts';
import type { BoundRoute } from './types.ts';

export interface ApiRouteDeps {
  readonly http: HttpDeps;
  readonly store: MediaStore;
  readonly keyring: Keyring;
  readonly providers: ProviderRegistry;
}

export function apiRoutes({ http, store, keyring, providers }: ApiRouteDeps): BoundRoute[] {
  return [
    ...systemRoutes(http),
    ...authRoutes(http),
    ...reauthRoutes(http),
    ...profileRoutes(http),
    ...passwordChangeRoutes(http),
    ...mediaRoutes({ store, clock: http.clock }),
    ...postRoutes({ providers }),
    ...destinationRoutes({ providers }),
    ...approvalRoutes({ providers }),
    ...notificationRoutes(),
    ...channelRoutes({
      db: http.db,
      keys: http.keys,
      keyring,
      providers,
      publicBaseUrl: http.publicBaseUrl,
      clock: http.clock,
    }),
  ];
}
