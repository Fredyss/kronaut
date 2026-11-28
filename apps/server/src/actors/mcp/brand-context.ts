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

function savedTextsOf(
  groupChannels: readonly Channel[] | null,
  savedTexts: readonly SavedText[],
  withTemplates: boolean,
) {
  return savedTexts.flatMap((saved) => {
    const channelIds = (groupChannels ?? [])
      .filter((channel) => channel.signature?.id === saved.id)
      .map((channel) => channel.id);
    const kind: Kind = channelIds.length > 0 ? 'signature' : 'template';
    if (kind === 'template' && (!withTemplates || saved.channelCount > 0)) return [];
    const text = untrusted('post', toPlainText(saved.doc as unknown as DocJson));
    return [{ id: saved.id, kind, text, channelIds }];
  });
}

interface Parts {
  readonly channels: readonly Channel[] | null;
  readonly savedTexts: readonly SavedText[] | null;
}

function group(parts: Parts, brandId: string | null) {
  const own = parts.channels?.filter((channel) => channel.brandId === brandId) ?? null;
  return {
    ...(own === null
      ? {}
      : {
          channels: own.map((c) => ({
            id: c.id,
            provider: c.provider,
            displayName: untrusted('provider', c.displayName),
          })),
        }),
    ...(parts.savedTexts === null
      ? {}
      : { savedTexts: savedTextsOf(own, parts.savedTexts, brandId !== null) }),
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
    omitted: gathered.omitted,
  };
}
