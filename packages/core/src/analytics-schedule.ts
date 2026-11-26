import type { ProviderManifest } from './provider-contract.ts';

const DEFAULT_PULL_HOURS: readonly number[] = [1, 6, 24, 72, 168, 720];
const DEFAULT_FOLLOWERS_EVERY_DAYS = 1;

export interface AnalyticsSchedule {
  readonly pullHours: readonly number[];
  readonly followersEveryDays: number;
  readonly purgeOnMissing: boolean;
}

export function analyticsScheduleOf(
  manifest: Pick<ProviderManifest, 'analytics'>,
): AnalyticsSchedule {
  return {
    pullHours: manifest.analytics?.pullHours ?? DEFAULT_PULL_HOURS,
    followersEveryDays: manifest.analytics?.followersEveryDays ?? DEFAULT_FOLLOWERS_EVERY_DAYS,
    purgeOnMissing: manifest.analytics?.purgeOnMissing === true,
  };
}
