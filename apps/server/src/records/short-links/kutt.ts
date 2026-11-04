import * as z from 'zod';
import { bodyOf, callApi, ok, shortUrl } from './api.ts';
import type { Shortener, ShortenerClient } from './shortener.ts';

const KuttLink = z.object({ id: z.string().min(1).max(190), link: z.string() });

export function kuttShortener({ http, config, signal }: ShortenerClient): Shortener {
  const auth = { 'x-api-key': config.key };
  const api = `${config.baseUrl}/api/v2`;
  return {
    async create(target) {
      const reply = await callApi(
        http,
        {
          method: 'POST',
          url: `${api}/links`,
          auth,
          body: { target, ...(config.domain === null ? {} : { domain: config.domain }) },
        },
        signal,
      );
      const link = bodyOf(KuttLink, reply);
      return { shortUrl: shortUrl(link.link), linkId: link.id };
    },
    async checkKey() {
      ok(await callApi(http, { method: 'GET', url: `${api}/users`, auth }, signal));
    },
  };
}
