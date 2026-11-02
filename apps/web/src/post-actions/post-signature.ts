import type { Channel } from '../api.ts';
import type { Doc } from '../compose/doc.ts';
import type { Destination } from '../posts/queries.ts';

export function shownSignature(destination: Destination, channel: Channel | undefined): Doc | null {
  if (destination.skipSignature) return null;
  const doc = destination.signatureHeld ? destination.signature : channel?.signature?.doc;
  return (doc ?? null) as unknown as Doc | null;
}
