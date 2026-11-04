import * as z from 'zod';
import { type ApiReply, bodyOf, callApi, ok, shortUrl } from './api.ts';
import { ShortenerFailed } from './failure.ts';
import type { CreatedLink, Shortener, ShortenerClient } from './shortener.ts';

const DubLink = z.object({
  id: z.string().min(1).max(190),
  shortLink: z.string(),
  url: z.string(),
});

function created(reply: ApiReply): CreatedLink {
  const link = bodyOf(DubLink, reply);
  return { shortUrl: shortUrl(link.shortLink), linkId: link.id };
}

export function dubShortener({ http, config, signal }: ShortenerClient): Shortener {
  const auth = { authorization: `Bearer ${config.key}` };
  const call = (method: 'GET' | 'POST', path: string, body?: unknown) =>
    callApi(http, { method, url: `${config.baseUrl}${path}`, auth, body }, signal);

  async function readBack(target: string, externalId: string): Promise<CreatedLink> {
    const query = new URLSearchParams({ externalId: `ext_${externalId}` });
    const reply = await call('GET', `/links/info?${query}`);
    const link = bodyOf(DubLink, reply);
    if (link.url !== target) throw new ShortenerFailed('conflict');
    return { shortUrl: shortUrl(link.shortLink), linkId: link.id };
  }

  return {
    async create(target, externalId) {
      const reply = await call('POST', '/links', {
        url: target,
        ...(config.domain === null ? {} : { domain: config.domain }),
        ...(externalId === undefined ? {} : { externalId }),
      });
      if (reply.status === 409 && externalId !== undefined)
        return await readBack(target, externalId);
      return created(reply);
    },
    async checkKey() {
      ok(await call('GET', '/links?pageSize=1'));
    },
  };
}
