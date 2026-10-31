import type { Channel, Destination } from '../api.ts';
import type { Doc } from '../compose/doc.ts';

export function shownSignature(destination: Destination, channel: Channel | undefined): Doc | null {
  if (destination.skipSignature) return null;
  const doc = destination.signatureHeld ? destination.signature : channel?.signature?.doc;
  return (doc ?? null) as unknown as Doc | null;
}
