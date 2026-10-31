import {
  checkText,
  countText,
  type TextRules,
  toPlainText,
  type ValidationIssue,
} from '@kronaut/compose/text';
import { useEffect } from 'react';
import type { Channel } from '../api.ts';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import type { MediaFacts } from './choice.ts';
import type { Doc } from './doc.ts';
import { type ItemDoc, type LimitItem, type PostTypeRules, postTypeFor } from './items.ts';
import { checkVideo, type VideoMeta, videoIssueLine } from './video-rules.ts';

export interface LimitTarget {
  readonly channel: Channel;
  readonly doc: Doc;
  readonly media: MediaFacts;
  readonly video: VideoMeta | null;
  readonly shown: boolean;
  readonly items: readonly ItemDoc[];
}

export interface TextLimitsProps {
  readonly targets: readonly LimitTarget[];
  readonly issuesId: string;
  readonly note: string | null;
  readonly onIssuesChange: (flagged: readonly string[]) => void;
}

interface Target {
  readonly channel: Channel;
  readonly rules: TextRules;
  readonly key: string;
  readonly text: string;
  readonly shown: boolean;
  readonly video: readonly ValidationIssue[];
  readonly item: LimitItem | null;
}

interface Entry {
  readonly key: string;
  readonly label: string;
  readonly rules: TextRules;
  readonly text: string;
  readonly video: readonly ValidationIssue[];
  readonly item: LimitItem | null;
}

function mainRules(postType: PostTypeRules): TextRules {
  return {
    text: postType.text,
    ...(postType.maxLinks === null ? {} : { maxLinks: postType.maxLinks }),
  };
}

function itemRules(postType: PostTypeRules, item: LimitItem): TextRules | null {
  if (item.kind === 'comment') return postType.comment ? { text: postType.comment.text } : null;
  const { thread } = postType;
  return thread && item.position <= thread.maxItems ? mainRules(postType) : null;
}

function targetFor(target: LimitTarget): Target[] {
  const { channel, doc, video, shown } = target;
  const postType = postTypeFor(channel, target.media);
  if (postType === undefined) return [];
  const text = toPlainText(doc);
  const key = JSON.stringify([postType.text, postType.maxLinks, postType.video, text]);
  const issues = video === null ? [] : checkVideo(postType.video, video);
  const main: Target = {
    channel,
    rules: mainRules(postType),
    key,
    text,
    shown,
    video: issues,
    item: null,
  };
  const items = target.items.flatMap(({ item, doc: itemDoc }): Target[] => {
    const rules = itemRules(postType, item);
    if (rules === null) return [];
    const itemKey = JSON.stringify([item, rules]);
    return [{ channel, rules, key: itemKey, text: toPlainText(itemDoc), shown, video: [], item }];
  });
  return [main, ...items];
}

interface Group {
  readonly provider: string;
  readonly rules: TextRules;
  readonly text: string;
  readonly video: readonly ValidationIssue[];
  readonly item: LimitItem | null;
  readonly names: string[];
}

const scopeOf = (provider: string, item: LimitItem | null) => `${provider} ${JSON.stringify(item)}`;

function entriesFor(targets: readonly Target[], list: (names: string[]) => string): Entry[] {
  const groups = new Map<string, Group>();
  const variants = new Map<string, number>();
  for (const { channel, rules, key, text, video, item } of targets) {
    const id = `${channel.provider} ${key}`;
    const group = groups.get(id);
    if (group !== undefined) {
      group.names.push(channel.displayName);
      continue;
    }
    groups.set(id, {
      provider: channel.provider,
      rules,
      text,
      video,
      item,
      names: [channel.displayName],
    });
    const scope = scopeOf(channel.provider, item);
    variants.set(scope, (variants.get(scope) ?? 0) + 1);
  }
  return [...groups].map(([key, { provider, rules, text, video, item, names }]) => {
    const network = providerUi(provider).name();
    const label =
      variants.get(scopeOf(provider, item)) === 1
        ? network
        : m.compose_limit_channel({ channel: list(names), network });
    return { key, label, rules, text, video, item };
  });
}

function usage(text: string, rules: TextRules): { readonly count: number; readonly max: number } {
  let worst = { count: 0, max: 0, ratio: -1 };
  for (const { counting, max, urlWeight } of rules.text) {
    const count = countText(text, counting, urlWeight === undefined ? {} : { urlWeight });
    const ratio = max === 0 ? Number.POSITIVE_INFINITY : count / max;
    if (ratio > worst.ratio) worst = { count, max, ratio };
  }
  return worst;
}

function linksLine({ item, label: channel }: Entry, max: number): string {
  if (item?.kind === 'thread') {
    return m.compose_reply_too_many_links({ position: item.position, channel, max });
  }
  return m.compose_limit_too_many_links({ channel, max });
}

function tooLongLine({ item, label: channel }: Entry, count: string, max: string): string {
  if (item === null) return m.compose_limit_too_long({ channel, count, max });
  if (item.kind === 'comment') return m.compose_comment_too_long({ channel, count, max });
  return m.compose_reply_too_long({ position: item.position, channel, count, max });
}

function issueLines(entry: Entry, format: (n: number) => string, locale: string): string[] {
  const video = entry.video.map((issue) => videoIssueLine(issue, entry.label, locale));
  const text = checkText(entry.rules, [{ text: entry.text }]).map((issue) => {
    const max = issue.limit ?? 0;
    if (issue.code === 'too_many_links') return linksLine(entry, max);
    return tooLongLine(entry, format(issue.actual ?? 0), format(max));
  });
  return [...text, ...video];
}

function Usage({
  entries,
  format,
}: {
  readonly entries: readonly Entry[];
  readonly format: (n: number) => string;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
      {entries.map((entry) => {
        const { count, max } = usage(entry.text, entry.rules);
        return (
          <li key={entry.key} className={count > max ? 'text-destructive' : undefined}>
            {m.compose_limit_usage({
              network: entry.label,
              count: format(count),
              max: format(max),
            })}
          </li>
        );
      })}
    </ul>
  );
}

function useFormat() {
  const { locale } = useLocale();
  return {
    locale,
    format: (value: number) => new Intl.NumberFormat(locale).format(value),
    list: (names: string[]) => new Intl.ListFormat(locale).format(names),
  };
}

export function ItemCounters({
  targets,
  item,
}: {
  readonly targets: readonly LimitTarget[];
  readonly item: LimitItem;
}) {
  const { format, list } = useFormat();
  const same = JSON.stringify(item);
  const entries = entriesFor(
    targets.flatMap(targetFor).filter((t) => t.shown && JSON.stringify(t.item) === same),
    list,
  );
  return entries.length === 0 ? null : <Usage entries={entries} format={format} />;
}

export default function TextLimits({ targets, issuesId, note, onIssuesChange }: TextLimitsProps) {
  const { locale, format, list } = useFormat();
  const all = targets.flatMap(targetFor);
  const flagged = [
    ...new Set(
      all
        .filter(
          ({ rules, text, video }) => video.length > 0 || checkText(rules, [{ text }]).length > 0,
        )
        .map(({ channel }) => channel.id),
    ),
  ].join(' ');
  const entries = entriesFor(
    all.filter((target) => target.shown),
    list,
  );
  const issues = entries.flatMap((entry) =>
    issueLines(entry, format, locale).map((line, index) => ({
      key: `${entry.key}-${index}`,
      line,
    })),
  );

  useEffect(
    () => onIssuesChange(flagged === '' ? [] : flagged.split(' ')),
    [flagged, onIssuesChange],
  );
  useEffect(() => () => onIssuesChange([]), [onIssuesChange]);

  if (entries.length === 0 && note === null) return null;
  return (
    <div className="flex flex-col gap-1">
      <Usage entries={entries.filter((entry) => entry.item === null)} format={format} />
      <div id={issuesId} role="status">
        <ul className="flex flex-col gap-0.5 text-destructive text-xs">
          {issues.map(({ key, line }) => (
            <li key={key}>{line}</li>
          ))}
          {note === null ? null : <li>{note}</li>}
        </ul>
      </div>
    </div>
  );
}
