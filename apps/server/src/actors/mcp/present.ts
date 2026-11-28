import * as z from 'zod';
import { maybeUntrusted, untrusted } from './untrusted.ts';

const DestinationStatus = z.looseObject({
  id: z.string(),
  accountId: z.string(),
  provider: z.string(),
  publishType: z.string(),
  state: z.string(),
  stateReason: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  remoteUrl: z.string().nullable(),
  lastErrorCode: z.string().nullable(),
});

const PostStatus = z.looseObject({
  id: z.string(),
  version: z.number(),
  title: z.string().nullable(),
  publishSummary: z.string(),
  scheduleMode: z.string(),
  scheduleLocal: z.string().nullable(),
  scheduleTz: z.string().nullable(),
  destinations: z.array(DestinationStatus),
});

export function postStatus(body: unknown) {
  const post = PostStatus.parse(body);
  return {
    id: post.id,
    version: post.version,
    title: maybeUntrusted('post', post.title),
    publishSummary: post.publishSummary,
    scheduleMode: post.scheduleMode,
    scheduleLocal: post.scheduleLocal,
    scheduleTz: post.scheduleTz,
    destinations: post.destinations.map((d) => ({
      id: d.id,
      accountId: d.accountId,
      provider: d.provider,
      publishType: d.publishType,
      state: d.state,
      stateReason: d.stateReason,
      scheduledAt: d.scheduledAt,
      publishedAt: d.publishedAt,
      remoteUrl: d.remoteUrl,
      lastErrorCode: d.lastErrorCode,
    })),
  };
}

const Option = z.looseObject({ value: z.string(), label: z.string() });
const Channel = z.looseObject({
  displayName: z.string(),
  settingOptions: z.record(z.string(), z.array(Option)),
});
const Channels = z.looseObject({ items: z.array(Channel) });

export function channelList(body: unknown) {
  const { items } = Channels.parse(body);
  return {
    items: items.map((channel) => ({
      ...channel,
      displayName: untrusted('provider', channel.displayName),
      settingOptions: Object.fromEntries(
        Object.entries(channel.settingOptions).map(([name, options]) => [
          name,
          options.map((o) => ({ value: o.value, label: untrusted('provider', o.label) })),
        ]),
      ),
    })),
  };
}

const PreviewItem = z.object({ role: z.string(), text: z.string(), mediaCount: z.number() });
const Preflight = z.looseObject({
  postId: z.string(),
  version: z.number(),
  issues: z.array(z.object({ path: z.string(), code: z.string() })),
  destinations: z.array(z.looseObject({ items: z.array(PreviewItem) })),
});

export function validation(body: unknown) {
  const { postId, version, issues } = Preflight.parse(body);
  return { postId, version, valid: issues.length === 0, issues };
}

export function preview(body: unknown) {
  const { postId, version, issues, destinations } = Preflight.parse(body);
  return {
    postId,
    version,
    issues,
    destinations: destinations.map((d) => ({
      ...d,
      items: d.items.map((item) => ({ ...item, text: untrusted('post', item.text) })),
    })),
  };
}

const MediaImport = z.looseObject({
  id: z.string(),
  state: z.string(),
  error: z.string().nullable(),
  media: z
    .looseObject({
      id: z.string(),
      kind: z.string(),
      state: z.string(),
      mime: z.string().nullable(),
    })
    .nullable(),
});

export function mediaImport(body: unknown) {
  const { id, state, error, media } = MediaImport.parse(body);
  const asset =
    media === null
      ? null
      : { id: media.id, kind: media.kind, state: media.state, mime: media.mime };
  return { id, state, error, media: asset };
}

export function asIs(body: unknown): unknown {
  return body;
}
