import * as z from 'zod';
import {
  PostStatusResult,
  PreviewDestination,
  PreviewItem,
  PreviewResult,
  type ValidationResult,
} from './results.ts';
import { maybeUntrusted, untrusted } from './untrusted.ts';

const PostStatus = PostStatusResult.extend({ title: z.string().nullable() });

export function postStatus(body: unknown) {
  const post = PostStatus.parse(body);
  return { ...post, title: maybeUntrusted('post', post.title) };
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

const Preflight = PreviewResult.extend({
  destinations: z.array(
    PreviewDestination.extend({ items: z.array(PreviewItem.extend({ text: z.string() })) }),
  ),
});

export function validation(body: unknown) {
  const { postId, version, issues } = Preflight.parse(body);
  return { postId, version, valid: issues.length === 0, issues } satisfies z.input<
    typeof ValidationResult
  >;
}

export function preview(body: unknown) {
  const preflight = Preflight.parse(body);
  return {
    ...preflight,
    destinations: preflight.destinations.map((d) => ({
      ...d,
      items: d.items.map((item) => ({ ...item, text: untrusted('post', item.text) })),
    })),
  };
}

export function asIs(body: unknown): unknown {
  return body;
}
