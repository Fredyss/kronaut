import { useMemo } from 'react';

export interface Formats {
  readonly locale: string;
  readonly timeZone: string;
  readonly time: Intl.DateTimeFormat;
  readonly stamp: Intl.DateTimeFormat;
  readonly hour: Intl.DateTimeFormat;
  readonly slot: Intl.DateTimeFormat;
  stampIn(timeZone: string): Intl.DateTimeFormat;
}

export function useFormats(locale: string, timeZone: string): Formats {
  return useMemo(() => {
    const zones = new Map<string, Intl.DateTimeFormat>();
    const stampIn = (zone: string) => {
      let format = zones.get(zone);
      if (format === undefined) {
        format = new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: zone,
        });
        zones.set(zone, format);
      }
      return format;
    };
    return {
      locale,
      timeZone,
      time: new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone,
      }),
      stamp: new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone,
      }),
      hour: new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
      }),
      slot: new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
      }),
      stampIn,
    };
  }, [locale, timeZone]);
}
