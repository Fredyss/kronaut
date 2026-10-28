import type { ProviderManifest } from '@kronaut/core';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import type { ProviderRegistry } from '../providers.ts';

export const SUNSET_WARN_DAYS = 90;
export const SUNSET_CRITICAL_DAYS = 30;

export type SunsetLevel = 'ok' | 'warn' | 'critical';

export interface ApiVersionSunset {
  readonly provider: string;
  readonly version: string;
  readonly sunsetOn: string | null;
  readonly daysLeft: number | null;
  readonly level: SunsetLevel;
}

type SunsetManifest = Pick<ProviderManifest, 'id' | 'apiVersion'>;

function levelOf(daysLeft: number): SunsetLevel {
  if (daysLeft <= SUNSET_CRITICAL_DAYS) return 'critical';
  if (daysLeft <= SUNSET_WARN_DAYS) return 'warn';
  return 'ok';
}

export function apiVersionSunsets(
  manifests: readonly SunsetManifest[],
  today: Temporal.PlainDate,
): ApiVersionSunset[] {
  return manifests.map(({ id, apiVersion }) => {
    const { version, sunsetOn } = apiVersion;
    if (sunsetOn === undefined) {
      return { provider: id, version, sunsetOn: null, daysLeft: null, level: 'ok' };
    }
    const daysLeft = today.until(Temporal.PlainDate.from(sunsetOn), { largestUnit: 'days' }).days;
    return { provider: id, version, sunsetOn, daysLeft, level: levelOf(daysLeft) };
  });
}

export function utcToday(now: Temporal.Instant): Temporal.PlainDate {
  return now.toZonedDateTimeISO('UTC').toPlainDate();
}

export function checkApiVersionSunsets(
  providers: ProviderRegistry,
  logger: Logger,
  now: Temporal.Instant,
): string {
  const sunsets = apiVersionSunsets(
    providers.list().map((entry) => entry.manifest),
    utcToday(now),
  );
  const due = sunsets.filter((sunset) => sunset.level !== 'ok');
  for (const sunset of due) {
    const fields = { task: 'api_version_sunset', ...sunset };
    if (sunset.level === 'critical') logger.error(fields, 'provider API version sunset is near');
    else logger.warn(fields, 'provider API version sunset is approaching');
  }
  if (due.length === 0) return 'ok';
  return due
    .map(
      (sunset) => `${sunset.provider} ${sunset.version} ${sunset.sunsetOn} (${sunset.daysLeft}d)`,
    )
    .join(', ');
}
