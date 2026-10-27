import type { BaseContext } from '@kronaut/core';
import * as z from 'zod';
import { send, tryJson } from '../_kit/http.ts';
import { apiUrl, instanceOrigin, permanent, retryable, transient } from './api.ts';

const count = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger)
  .optional()
  .catch(undefined);
const mimeList = z.array(z.string().regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/)).max(200);

const instanceConfiguration = z.looseObject({
  configuration: z
    .looseObject({
      statuses: z
        .looseObject({
          max_characters: count,
          max_media_attachments: count,
          characters_reserved_per_url: count,
        })
        .optional()
        .catch(undefined),
      media_attachments: z
        .looseObject({
          supported_mime_types: mimeList.optional().catch(undefined),
          image_size_limit: count,
          image_matrix_limit: count,
          video_size_limit: count,
          description_limit: count,
        })
        .optional()
        .catch(undefined),
    })
    .optional()
    .catch(undefined),
});

export interface InstanceLimits {
  readonly maxCharacters?: number;
  readonly maxMediaAttachments?: number;
  readonly charactersReservedPerUrl?: number;
  readonly supportedMimeTypes?: readonly string[];
  readonly imageSizeLimit?: number;
  readonly imageMatrixLimit?: number;
  readonly videoSizeLimit?: number;
  readonly descriptionLimit?: number;
}

type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

function defined<T extends Record<string, unknown>>(value: T): Defined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Defined<T>;
}

export function instanceLimits(body: unknown): InstanceLimits {
  const parsed = instanceConfiguration.safeParse(body);
  const configuration = parsed.success ? parsed.data.configuration : undefined;
  const statuses = configuration?.statuses;
  const media = configuration?.media_attachments;
  return defined({
    maxCharacters: statuses?.max_characters,
    maxMediaAttachments: statuses?.max_media_attachments,
    charactersReservedPerUrl: statuses?.characters_reserved_per_url,
    supportedMimeTypes: media?.supported_mime_types,
    imageSizeLimit: media?.image_size_limit,
    imageMatrixLimit: media?.image_matrix_limit,
    videoSizeLimit: media?.video_size_limit,
    descriptionLimit: media?.description_limit,
  });
}

export async function readCapabilities(
  ctx: BaseContext,
  origin: string,
): Promise<Readonly<Record<string, unknown>>> {
  const response = await send(ctx, 'none', apiUrl(origin, '/api/v2/instance'), {
    headers: { accept: 'application/json' },
  });
  if (retryable(response.status)) throw transient(response.status);
  const body = response.status === 200 ? await tryJson(response) : undefined;
  return { instance: instanceLimits(body), fetchedAt: ctx.now().toString() };
}

export async function readInstanceCapabilities(
  ctx: BaseContext,
  instanceHost: string,
): Promise<Readonly<Record<string, unknown>>> {
  const origin = instanceOrigin(instanceHost);
  const response = await send(ctx, 'none', apiUrl(origin, '/api/v2/instance'), {
    headers: { accept: 'application/json' },
  });
  if (retryable(response.status)) throw transient(response.status);
  if (response.status !== 200) throw permanent('instance_unavailable');
  const instance = instanceLimits(await tryJson(response));
  if (Object.keys(instance).length === 0) throw permanent('instance_unreadable');
  return { instance, fetchedAt: ctx.now().toString() };
}
