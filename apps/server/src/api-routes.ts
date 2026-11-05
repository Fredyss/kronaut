import type { Keyring } from '@kronaut/credentials';
import type { HttpClient } from '@kronaut/egress';
import type { MediaStore } from '@kronaut/media';
import { channelRoutes } from './access/channels/routes.ts';
import { destinationRoutes } from './actors/destinations/routes.ts';
import { evergreenRoutes } from './actors/evergreen/routes.ts';
import type { MediaSigner } from './actors/media/access.ts';
import { importRoutes } from './actors/media/import/import-routes.ts';
import { libraryRoutes } from './actors/media/library/library-routes.ts';
import { mediaRoutes } from './actors/media/routes.ts';
import type { Staging } from './actors/media/staging.ts';
import { MEDIA_BODY_LIMITS, uploadRoutes } from './actors/media/video/upload-routes.ts';
import { META_BODY_LIMITS, metaRoutes } from './actors/meta/routes.ts';
import { postImportRoutes } from './actors/post-import/routes.ts';
import { rssFeedRoutes } from './actors/rss-feeds/routes.ts';
import { seriesRoutes } from './actors/series/routes.ts';
import { systemStatusRoutes } from './actors/system/routes.ts';
import type { HttpDeps } from './base/http/pipeline/kernel.ts';
import type { BoundRoute } from './base/http/request.ts';
import { systemRoutes } from './base/http/system-routes.ts';
import type { ProviderRegistry } from './base/providers/providers.ts';
import { postRoutes } from './flow/posts/routes.ts';
import { authenticate } from './identity/auth/authenticate.ts';
import { passwordChangeRoutes } from './identity/auth/password-change.ts';
import { profileRoutes } from './identity/auth/profile-routes.ts';
import { reauthRoutes } from './identity/auth/reauth.ts';
import { authRoutes } from './identity/auth/routes.ts';
import { guardSession } from './identity/auth/session-guard.ts';
import type { CronTask } from './infrastructure/jobs/cron-tasks.ts';
import { policyRoutes } from './policy/approval-policy/policy-routes.ts';
import { analyticsRoutes } from './records/analytics/routes.ts';
import { notificationRoutes } from './records/notifications/routes.ts';
import { shortLinkRoutes } from './records/short-links/routes.ts';
import { approvalRoutes } from './steps/approvals/routes.ts';
import { brandRoutes } from './steps/brands/routes.ts';
import { queueRoutes } from './steps/queue/routes.ts';
import { savedTextRoutes } from './steps/saved-texts/routes.ts';
import { tagRoutes } from './steps/tags/routes.ts';

export const API_BODY_LIMITS: Readonly<Record<string, number>> = {
  ...MEDIA_BODY_LIMITS,
  ...META_BODY_LIMITS,
};

export const API_SIGN_IN: Pick<HttpDeps, 'authenticate' | 'guardSession'> = {
  authenticate,
  guardSession,
};

export interface ApiRouteDeps {
  readonly http: HttpDeps;
  readonly store: MediaStore;
  readonly signer: MediaSigner;
  readonly staging: Staging;
  readonly keyring: Keyring;
  readonly providers: ProviderRegistry;
  readonly cronTasks: readonly CronTask[];
  readonly feedHttp?: HttpClient | undefined;
  readonly shortenerHttp?: HttpClient | undefined;
}

export function apiRoutes({
  http,
  store,
  signer,
  staging,
  keyring,
  providers,
  cronTasks,
  feedHttp,
  shortenerHttp,
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
    ...postImportRoutes({ providers }),
    ...destinationRoutes({ providers }),
    ...approvalRoutes(),
    ...policyRoutes(),
    ...queueRoutes(),
    ...seriesRoutes(),
    ...evergreenRoutes(),
    ...tagRoutes(),
    ...brandRoutes(),
    ...savedTextRoutes(),
    ...rssFeedRoutes({ providers, http: feedHttp }),
    ...analyticsRoutes(),
    ...shortLinkRoutes({ keyring, http: shortenerHttp }),
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
