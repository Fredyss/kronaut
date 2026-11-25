import { toPlainText } from '@kronaut/compose/text';
import { useLocale } from '../../../base/locale/context.ts';
import { m } from '../../../base/locale/i18n.ts';
import { providerUi } from '../../../base/providers/ui.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import type { Doc } from '../../../records/posts/doc.ts';

export interface DuplicateTarget {
  readonly channel: Pick<Channel, 'provider' | 'displayName' | 'warnDuplicateText'>;
  readonly doc: Doc;
}

interface DuplicateText {
  readonly provider: string;
  readonly channels: readonly string[];
}

function sameTextKey(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function duplicateTexts(targets: readonly DuplicateTarget[]): DuplicateText[] {
  const groups = new Map<string, { provider: string; channels: string[] }>();
  for (const { channel, doc } of targets) {
    if (!channel.warnDuplicateText) continue;
    const text = sameTextKey(toPlainText(doc));
    if (text === '') continue;
    const key = JSON.stringify([channel.provider, text]);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { provider: channel.provider, channels: [channel.displayName] });
    } else {
      group.channels.push(channel.displayName);
    }
  }
  return [...groups.values()].filter((group) => group.channels.length > 1);
}

export function DuplicateTextNote({ targets }: { readonly targets: readonly DuplicateTarget[] }) {
  const { locale } = useLocale();
  const duplicates = duplicateTexts(targets);
  if (duplicates.length === 0) return null;
  const list = new Intl.ListFormat(locale);
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {duplicates.map(({ provider, channels }) => (
        <li key={`${provider} ${channels.join(' ')}`}>
          {m.compose_duplicate_text({
            channels: list.format(channels),
            network: providerUi(provider).name(),
          })}
        </li>
      ))}
    </ul>
  );
}
