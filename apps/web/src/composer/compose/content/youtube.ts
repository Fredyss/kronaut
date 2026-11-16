import { toPlainText } from '@kronaut/compose/text';
import type { Doc } from '../../../records/posts/doc.ts';
import type { Destination } from '../../../records/posts/queries.ts';

type Settings = Destination['settings'];

export const TITLE_MAX = 100;
export const TITLE_FORBIDDEN: readonly string[] = ['<', '>'];
export const PRIVACIES = ['public', 'unlisted', 'private'] as const;
export const YOUTUBE_DEFAULT: Settings = { privacy: 'public' };

export type Privacy = (typeof PRIVACIES)[number];

export interface YoutubeFields {
  readonly title: string;
  readonly privacy: Privacy;
  readonly madeForKids: boolean | undefined;
}

export function youtubeFields({ title, privacy, madeForKids }: Settings): YoutubeFields {
  return {
    title: typeof title === 'string' ? title : '',
    privacy: PRIVACIES.find((candidate) => candidate === privacy) ?? 'public',
    madeForKids: typeof madeForKids === 'boolean' ? madeForKids : undefined,
  };
}

export function titleProblems(title: string) {
  return {
    tooLong: title.length > TITLE_MAX,
    forbidden: TITLE_FORBIDDEN.some((char) => title.includes(char)),
  };
}

export function invalidTitle(settings: Settings | undefined): boolean {
  if (settings === undefined) return false;
  const { tooLong, forbidden } = titleProblems(youtubeFields(settings).title);
  return tooLong || forbidden;
}

export function withField(settings: Settings, field: string, value: unknown): Settings {
  if (value !== undefined) return { ...settings, [field]: value };
  return Object.fromEntries(Object.entries(settings).filter(([key]) => key !== field));
}

export function firstLine(doc: Doc): string | null {
  const line = toPlainText(doc)
    .split('\n')
    .find((candidate) => candidate.trim() !== '');
  return line === undefined ? null : line.trim();
}
