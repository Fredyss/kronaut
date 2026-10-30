import { useState } from 'react';
import type { ComposeStart } from './use-compose-form.ts';
import { useWhen } from './when.ts';

export function useOpenedWhen({ at, tz, opened }: ComposeStart, approvalRequested: boolean) {
  const start = opened?.form.when;
  const picked = useWhen(start?.at ?? at, start?.tz ?? tz, start?.mode);
  const { mode, date, time } = picked;
  const [first] = useState({ mode, date, time });
  const whenChanged =
    opened !== undefined && (mode !== first.mode || date !== first.date || time !== first.time);
  const queueHidden = start?.mode === 'queue' && mode === 'queue' && approvalRequested;
  return { when: queueHidden ? { ...picked, mode: 'draft' as const } : picked, whenChanged };
}
