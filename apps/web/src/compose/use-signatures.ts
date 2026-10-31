import { useState } from 'react';
import type { Channel } from '../api.ts';
import { type Doc, toDoc } from './doc.ts';
import type { OpenedForm } from './from-post.ts';

const NONE: ReadonlySet<string> = new Set();

export function useSignatures(seed?: OpenedForm) {
  const [skipped, setSkippedSet] = useState(seed?.skipSignature ?? NONE);
  return {
    skipped,
    signatureOf(channel: Channel): Doc | null {
      if (skipped.has(channel.id) || channel.signature === null) return null;
      return toDoc(channel.signature.doc);
    },
    setSkipped(channelId: string, skip: boolean) {
      setSkippedSet((current) => {
        const next = new Set(current);
        if (skip) next.add(channelId);
        else next.delete(channelId);
        return next;
      });
    },
  };
}
