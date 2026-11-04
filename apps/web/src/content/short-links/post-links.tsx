import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { m } from '../../base/locale/i18n.ts';
import { httpsUrl } from '../../records/posts/destinations.ts';
import { type DestinationLinks, postShortLinksQuery, type ShortLink } from './queries.ts';

function LinkState({ link }: { readonly link: ShortLink }) {
  if (link.state === 'pending') {
    return <span className="text-muted-foreground">{m.post_short_link_pending()}</span>;
  }
  if (link.state === 'failed' || link.shortUrl === null) {
    return (
      <span className="text-muted-foreground">
        {m.post_short_link_failed({ kind: link.error ?? 'unknown' })}
      </span>
    );
  }
  const href = httpsUrl(link.shortUrl);
  return href === null ? (
    <span className="break-all">{link.shortUrl}</span>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-foreground underline underline-offset-4"
    >
      {link.shortUrl}
    </a>
  );
}

export function LinkList({ destination }: { readonly destination: DestinationLinks | undefined }) {
  if (destination?.shorten !== true || destination.links.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium">{m.post_short_links_title()}</p>
      <ul className="flex flex-col gap-2">
        {destination.links.map((link) => (
          <li key={link.longUrl} className="flex flex-col gap-0.5">
            <span className="break-all text-muted-foreground">{link.longUrl}</span>
            <LinkState link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ShortLinksProps {
  readonly workspaceId: string;
  readonly postId: string;
  readonly destinationId: string;
}

export function ShortLinks({ workspaceId, postId, destinationId }: ShortLinksProps) {
  const client = useApiClient();
  const links = useQuery(postShortLinksQuery(client, workspaceId, postId)).data;
  return <LinkList destination={links?.find((d) => d.destinationId === destinationId)} />;
}
