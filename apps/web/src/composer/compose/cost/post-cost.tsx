import { extractXUrls, toPlainText } from '@kronaut/compose/text';
import { useLocale } from '../../../base/locale/context.ts';
import { m } from '../../../base/locale/i18n.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import type { Doc } from '../../../records/posts/doc.ts';

type Cost = NonNullable<Channel['cost']>;

export interface CostTarget {
  readonly channel: Channel;
  readonly doc: Doc;
  readonly shown: boolean;
  readonly items: readonly {
    readonly item: { readonly kind: string; readonly position?: number };
    readonly doc: Doc;
  }[];
}

export interface PostCost {
  readonly channelId: string;
  readonly channel: string;
  readonly posts: number;
  readonly usdMicros: number;
  readonly rates: Cost;
}

function costOf(rates: Cost, text: string): number {
  if (extractXUrls(text).length === 0) return rates.usdMicros;
  return rates.linkUsdMicros ?? rates.usdMicros;
}

function chainTexts({ channel, doc, items }: CostTarget): string[] {
  const maxItems = Math.max(0, ...channel.postTypes.map((type) => type.thread?.maxItems ?? 0));
  const replies = items.flatMap(({ item, doc: itemDoc }) =>
    item.kind === 'thread' && (item.position ?? 0) <= maxItems ? [toPlainText(itemDoc)] : [],
  );
  return [toPlainText(doc), ...replies];
}

export function postCosts(targets: readonly CostTarget[]): PostCost[] {
  return targets.flatMap((target) => {
    const { channel, shown } = target;
    const rates = channel.cost ?? null;
    if (!shown || rates === null) return [];
    const texts = chainTexts(target);
    const usdMicros = texts.reduce((sum, text) => sum + costOf(rates, text), 0);
    const { id: channelId, displayName } = channel;
    return [{ channelId, channel: displayName, posts: texts.length, usdMicros, rates }];
  });
}

export function PostCostNote({ targets }: { readonly targets: readonly CostTarget[] }) {
  const { locale } = useLocale();
  const costs = postCosts(targets);
  const [first] = costs;
  if (first === undefined) return null;
  const usd = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 3,
  });
  const dollars = (micros: number) => usd.format(micros / 1_000_000);
  const { usdMicros, linkUsdMicros } = first.rates;
  return (
    <div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
      <ul>
        {costs.map((cost) => (
          <li key={cost.channelId}>
            {m.compose_x_cost({
              channel: cost.channel,
              count: cost.posts,
              cost: dollars(cost.usdMicros),
            })}
          </li>
        ))}
      </ul>
      <p>
        {m.compose_x_cost_rates({
          price: dollars(usdMicros),
          linkPrice: dollars(linkUsdMicros ?? usdMicros),
        })}
      </p>
    </div>
  );
}
