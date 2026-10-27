import { checkText, countText, type TextRules, toPlainText } from '@kronaut/compose/text';
import { useEffect } from 'react';
import type { Channel } from '../api.ts';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import { choiceFor, type ImageFacts } from './choice.ts';
import type { Doc } from './doc.ts';

export interface LimitTarget {
  readonly channel: Channel;
  readonly doc: Doc;
  readonly files: readonly ImageFacts[];
  readonly shown: boolean;
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
}

interface Entry {
  readonly key: string;
  readonly label: string;
  readonly rules: TextRules;
  readonly text: string;
}

function targetFor({ channel, doc, files, shown }: LimitTarget): Target[] {
  const choice = choiceFor(channel, files);
  if (choice.kind !== 'ok') return [];
  const postType = channel.postTypes.find((candidate) => candidate.id === choice.publishType);
  if (postType === undefined) return [];
  const rules: TextRules = {
    text: postType.text,
    ...(postType.maxLinks === null ? {} : { maxLinks: postType.maxLinks }),
  };
  const key = JSON.stringify([postType.text, postType.maxLinks]);
  return [{ channel, rules, key, text: toPlainText(doc), shown }];
}

interface Group {
  readonly provider: string;
  readonly rules: TextRules;
  readonly text: string;
  readonly names: string[];
}

function entriesFor(targets: readonly Target[], list: (names: string[]) => string): Entry[] {
  const groups = new Map<string, Group>();
  const variants = new Map<string, number>();
  for (const { channel, rules, key, text } of targets) {
    const id = `${channel.provider} ${key}`;
    const group = groups.get(id);
    if (group !== undefined) {
      group.names.push(channel.displayName);
      continue;
    }
    groups.set(id, { provider: channel.provider, rules, text, names: [channel.displayName] });
    variants.set(channel.provider, (variants.get(channel.provider) ?? 0) + 1);
  }
  return [...groups].map(([key, { provider, rules, text, names }]) => {
    const network = providerUi(provider).name();
    const label =
      variants.get(provider) === 1
        ? network
        : m.compose_limit_channel({ channel: list(names), network });
    return { key, label, rules, text };
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

function issueLines(entry: Entry, format: (n: number) => string): string[] {
  return checkText(entry.rules, [{ text: entry.text }]).map((issue) => {
    const max = issue.limit ?? 0;
    if (issue.code === 'too_many_links') {
      return m.compose_limit_too_many_links({ channel: entry.label, max });
    }
    return m.compose_limit_too_long({
      channel: entry.label,
      count: format(issue.actual ?? 0),
      max: format(max),
    });
  });
}

export default function TextLimits({ targets, issuesId, note, onIssuesChange }: TextLimitsProps) {
  const { locale } = useLocale();
  const format = (value: number) => new Intl.NumberFormat(locale).format(value);
  const list = (names: string[]) => new Intl.ListFormat(locale).format(names);
  const all = targets.flatMap(targetFor);
  const flagged = all
    .filter(({ rules, text }) => checkText(rules, [{ text }]).length > 0)
    .map(({ channel }) => channel.id)
    .join(' ');
  const entries = entriesFor(
    all.filter((target) => target.shown),
    list,
  );
  const issues = entries.flatMap((entry) =>
    issueLines(entry, format).map((line, index) => ({ key: `${entry.key}-${index}`, line })),
  );

  useEffect(
    () => onIssuesChange(flagged === '' ? [] : flagged.split(' ')),
    [flagged, onIssuesChange],
  );
  useEffect(() => () => onIssuesChange([]), [onIssuesChange]);

  if (entries.length === 0 && note === null) return null;
  return (
    <div className="flex flex-col gap-1">
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
