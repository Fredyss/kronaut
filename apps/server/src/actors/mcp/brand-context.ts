import { type DocJson, toPlainText } from '@kronaut/compose';
import * as z from 'zod';
import type { RouteReply } from '../../base/http/request.ts';
import { BRAND_PARTS, type BrandContextResult } from './results.ts';
import type { Invoke, ToolArgs } from './tool.ts';
import { untrusted } from './untrusted.ts';

type Part = (typeof BRAND_PARTS)[number];

const PART_ROUTES: Readonly<Record<Part, string>> = {
  channels: 'channels.list',
  savedTexts: 'saved_texts.list',
};

const UNGRANTED: ReadonlySet<string> = new Set(['scope_missing', 'not_permitted']);

const Denial = z.object({
  error: z.object({
    code: z.literal('forbidden'),
    details: z.array(z.object({ code: z.string() })),
  }),
});

const Brands = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string(), archivedAt: z.string().nullable() })),
});
const Channels = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      displayName: z.string(),
      brandId: z.string().nullable(),
      signature: z.object({ id: z.string() }).nullable(),
    }),
  ),
});
const SavedTexts = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      doc: z.record(z.string(), z.unknown()),
      channelCount: z.number(),
    }),
  ),
});

type Channel = z.output<typeof Channels>['items'][number];
type SavedText = z.output<typeof SavedTexts>['items'][number];

function ungranted(reply: RouteReply): boolean {
  if (reply.status !== 403) return false;
  const denial = Denial.safeParse(reply.body);
  return denial.success && denial.data.error.details.some((d) => UNGRANTED.has(d.code));
}

const NO_ARGS: ToolArgs = { params: {}, body: undefined, idempotencyKey: undefined };

export async function gatherBrandContext(invoke: Invoke): Promise<RouteReply> {
  const brands = await invoke('brands.list', NO_ARGS);
  if (brands.status >= 400) return brands;
  const body: Record<string, unknown> = { brands: brands.body };
  const omitted: Part[] = [];
  for (const part of BRAND_PARTS) {
    const reply = await invoke(PART_ROUTES[part], NO_ARGS);
    if (ungranted(reply)) omitted.push(part);
    else if (reply.status >= 400) return reply;
    else body[part] = reply.body;
  }
  return { status: 200, body: { ...body, omitted }, replayed: false };
}

function plain(saved: SavedText) {
  return untrusted('post', toPlainText(saved.doc as unknown as DocJson));
}

function signaturesOf(groupChannels: readonly Channel[], savedTexts: readonly SavedText[]) {
  return savedTexts.flatMap((saved) => {
    const channelIds = groupChannels
      .filter((channel) => channel.signature?.id === saved.id)
      .map((channel) => channel.id);
    return channelIds.length === 0 ? [] : [{ id: saved.id, text: plain(saved), channelIds }];
  });
}

interface Parts {
  readonly channels: readonly Channel[] | null;
  readonly savedTexts: readonly SavedText[] | null;
}

function group(parts: Parts, brandId: string | null) {
  const own = parts.channels?.filter((channel) => channel.brandId === brandId) ?? null;
  if (own === null) return {};
  return {
    channels: own.map((c) => ({
      id: c.id,
      provider: c.provider,
      displayName: untrusted('provider', c.displayName),
    })),
    ...(parts.savedTexts === null ? {} : { signatures: signaturesOf(own, parts.savedTexts) }),
  };
}

export function brandContext(body: unknown): z.input<typeof BrandContextResult> {
  const gathered = z
    .object({
      brands: Brands,
      channels: Channels.optional(),
      savedTexts: SavedTexts.optional(),
      omitted: z.array(z.enum(BRAND_PARTS)),
    })
    .parse(body);
  const parts: Parts = {
    channels: gathered.channels?.items ?? null,
    savedTexts: gathered.savedTexts?.items ?? null,
  };
  return {
    brands: gathered.brands.items.map((brand) => ({
      id: brand.id,
      name: brand.name,
      archived: brand.archivedAt !== null,
      ...group(parts, brand.id),
    })),
    unbranded: group(parts, null),
    ...(parts.savedTexts === null
      ? {}
      : {
          templates: parts.savedTexts
            .filter((saved) => saved.channelCount === 0)
            .map((saved) => ({ id: saved.id, text: plain(saved) })),
        }),
    omitted: gathered.omitted,
  };
}
