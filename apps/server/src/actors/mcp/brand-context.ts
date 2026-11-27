import { type DocJson, toPlainText } from '@kronaut/compose';
import * as z from 'zod';
import type { RouteReply } from '../../base/http/request.ts';
import { BRAND_PARTS, type BrandContextResult, type SAVED_TEXT_KINDS } from './results.ts';
import type { Invoke, ToolArgs } from './tool.ts';
import { untrusted } from './untrusted.ts';

type Part = (typeof BRAND_PARTS)[number];
type Kind = (typeof SAVED_TEXT_KINDS)[number];

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

const Brands = z.object({ items: z.array(z.object({ id: z.string(), name: z.string() })) });
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

function savedTextsOf(brandChannels: readonly Channel[] | null, savedTexts: readonly SavedText[]) {
  return savedTexts.flatMap((saved) => {
    const channelIds = (brandChannels ?? [])
      .filter((channel) => channel.signature?.id === saved.id)
      .map((channel) => channel.id);
    const kind: Kind = channelIds.length > 0 ? 'signature' : 'template';
    if (kind === 'template' && saved.channelCount > 0) return [];
    const text = untrusted('post', toPlainText(saved.doc as unknown as DocJson));
    return [{ id: saved.id, kind, text, channelIds }];
  });
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
  const channels = gathered.channels?.items ?? null;
  const savedTexts = gathered.savedTexts?.items ?? null;
  return {
    brands: gathered.brands.items.map((brand) => {
      const own = channels?.filter((channel) => channel.brandId === brand.id) ?? null;
      return {
        id: brand.id,
        name: brand.name,
        ...(own === null
          ? {}
          : {
              channels: own.map((c) => ({
                id: c.id,
                provider: c.provider,
                displayName: untrusted('provider', c.displayName),
              })),
            }),
        ...(savedTexts === null ? {} : { savedTexts: savedTextsOf(own, savedTexts) }),
      };
    }),
    omitted: gathered.omitted,
  };
}
