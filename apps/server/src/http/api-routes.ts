import type { Keyring } from '@kronaut/credentials';
import type { MediaStore } from '@kronaut/media';
import { analyticsRoutes } from '../analytics/routes.ts';
import { approvalRoutes } from '../approvals/routes.ts';
import { passwordChangeRoutes } from '../auth/password-change.ts';
import { profileRoutes } from '../auth/profile.ts';
import { reauthRoutes } from '../auth/reauth.ts';
import { authRoutes } from '../auth/routes.ts';
import { channelRoutes } from '../channels/routes.ts';
import { destinationRoutes } from '../destinations/routes.ts';
import { evergreenRoutes } from '../evergreen/routes.ts';
import type { CronTask } from '../jobs/cron-tasks.ts';
import type { MediaSigner } from '../media/access.ts';
import { importRoutes } from '../media/import-routes.ts';
import { libraryRoutes } from '../media/library-routes.ts';
import { mediaRoutes } from '../media/routes.ts';
import type { Staging } from '../media/staging.ts';
import { MEDIA_BODY_LIMITS, uploadRoutes } from '../media/upload-routes.ts';
import { META_BODY_LIMITS, metaRoutes } from '../meta/routes.ts';
import { notificationRoutes } from '../notifications/routes.ts';
import { postRoutes } from '../posts/routes.ts';
import type { ProviderRegistry } from '../providers.ts';
import { queueRoutes } from '../queue/routes.ts';
import { savedTextRoutes } from '../saved-texts/routes.ts';
import { seriesRoutes } from '../series/routes.ts';
import { systemStatusRoutes } from '../system/routes.ts';
import { tagRoutes } from '../tags/routes.ts';
import type { HttpDeps } from './kernel.ts';
import { systemRoutes } from './system-routes.ts';
import type { BoundRoute } from './types.ts';

export const API_BODY_LIMITS: Readonly<Record<string, number>> = {
  ...MEDIA_BODY_LIMITS,
  ...META_BODY_LIMITS,
};

export interface ApiRouteDeps {
  readonly http: HttpDeps;
  readonly store: MediaStore;
  readonly signer: MediaSigner;
  readonly staging: Staging;
  readonly keyring: Keyring;
  readonly providers: ProviderRegistry;
  readonly cronTasks: readonly CronTask[];
}

export function apiRoutes({
  http,
  store,
  signer,
  staging,
  keyring,
  providers,
  cronTasks,
}: ApiRouteDeps): BoundRoute[] {
  return [
    ...systemRoutes(http),
    ...authRoutes(http),
    ...reauthRoutes(http),
    ...profileRoutes(http),
    ...passwordChangeRoutes(http),
    ...mediaRoutes({ store, signer, clock: http.clock }),
    ...libraryRoutes({ signer }),
    ...uploadRoutes({ staging }),
    ...importRoutes(),
    ...postRoutes({ providers }),
    ...destinationRoutes({ providers }),
    ...approvalRoutes({ providers }),
    ...queueRoutes(),
    ...seriesRoutes(),
    ...evergreenRoutes(),
    ...tagRoutes(),
    ...savedTextRoutes(),
    ...analyticsRoutes(),
    ...notificationRoutes(),
    ...systemStatusRoutes({ providers, cronTasks, instanceAdmins: http.instanceAdmins ?? [] }),
    ...channelRoutes({
      db: http.db,
      keys: http.keys,
      keyring,
      providers,
      publicBaseUrl: http.publicBaseUrl,
      clock: http.clock,
    }),
    ...metaRoutes({
      db: http.db,
      keyring,
      subjectKey: http.keys.metaSubject,
      publicBaseUrl: http.publicBaseUrl,
    }),
  ];
}
