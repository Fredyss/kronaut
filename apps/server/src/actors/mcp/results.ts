import * as z from 'zod';
import { UntrustedText } from './untrusted.ts';

export type ResultSchema = z.ZodObject;
export type ResultOf = (response: z.ZodType) => ResultSchema;

const Text = z.string();
const Maybe = z.string().nullable();
const Version = z.number().int();

const DestinationStatus = z.object({
  id: Text,
  accountId: Text,
  provider: Text,
  publishType: Text,
  state: Text,
  stateReason: Maybe,
  scheduledAt: Maybe,
  publishedAt: Maybe,
  remoteUrl: Maybe,
  lastErrorCode: Maybe,
});

export const PostStatusResult = z.object({
  id: Text,
  version: Version,
  title: UntrustedText.nullable(),
  publishSummary: Text,
  scheduleMode: Text,
  scheduleLocal: Maybe,
  scheduleTz: Maybe,
  destinations: z.array(DestinationStatus),
});

const Issue = z.object({ path: Text, code: Text });

export const ValidationResult = z.object({
  postId: Text,
  version: Version,
  valid: z.boolean(),
  issues: z.array(Issue),
});

export const PreviewItem = z.object({
  role: Text,
  text: UntrustedText,
  mediaCount: z.number().int(),
});

export const PreviewDestination = z.object({
  id: Text,
  accountId: Text,
  provider: Text,
  publishType: Text,
  items: z.array(PreviewItem),
});

export const PreviewResult = z.object({
  postId: Text,
  version: Version,
  issues: z.array(Issue),
  destinations: z.array(PreviewDestination),
});

export const MediaImportResult = z.object({
  id: Text,
  state: Text,
  error: Maybe,
  media: z.object({ id: Text, kind: Text, state: Text, mime: Maybe }).nullable(),
});

const BrandChannel = z.object({ id: Text, provider: Text, displayName: UntrustedText });

export const SAVED_TEXT_KINDS = ['signature', 'template'] as const;
export const BRAND_PARTS = ['channels', 'savedTexts'] as const;

const BrandSavedText = z.object({
  id: Text,
  kind: z.enum(SAVED_TEXT_KINDS),
  text: UntrustedText,
  channelIds: z.array(Text),
});

const ChannelGroup = z.object({
  channels: z.array(BrandChannel).optional(),
  savedTexts: z.array(BrandSavedText).optional(),
});

export const BrandContextResult = z.object({
  brands: z.array(ChannelGroup.extend({ id: Text, name: Text, archived: z.boolean() })),
  unbranded: ChannelGroup,
  omitted: z.array(z.enum(BRAND_PARTS)),
});

function itemsElement(response: z.ZodType): z.ZodObject {
  if (response instanceof z.ZodObject) {
    const items = response.shape.items;
    if (items instanceof z.ZodArray && items.element instanceof z.ZodObject) return items.element;
  }
  throw new Error('mcp: the route does not answer an items list of objects');
}

const Option = z.object({ value: Text, label: UntrustedText });

export function channelsResult(response: z.ZodType): ResultSchema {
  const channel = itemsElement(response).extend({
    displayName: UntrustedText,
    settingOptions: z.record(Text, z.array(Option)),
  });
  return z.object({ items: z.array(channel) });
}

export function routeResult(response: z.ZodType): ResultSchema {
  if (response instanceof z.ZodObject) return response;
  throw new Error('mcp: the route does not answer an object');
}

export function fixed(schema: ResultSchema): ResultOf {
  return () => schema;
}
