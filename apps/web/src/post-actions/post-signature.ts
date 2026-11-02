import type { Channel } from '../channels/queries.ts';
import type { Doc } from '../compose/content/doc.ts';
import type { Destination } from '../posts/queries.ts';

export function shownSignature(destination: Destination, channel: Channel | undefined): Doc | null {
  if (destination.skipSignature) return null;
  const doc = destination.signatureHeld ? destination.signature : channel?.signature?.doc;
  return (doc ?? null) as unknown as Doc | null;
}
