import type { ComposeWhen } from './submit.ts';

export function approvalBody(version: number, when: ComposeWhen, note: string) {
  const trimmed = note.trim().normalize('NFC');
  return {
    expectedVersion: version,
    ...(when.mode === 'instant'
      ? { schedule: { scheduleLocal: when.scheduleLocal, scheduleTz: when.scheduleTz } }
      : {}),
    ...(when.mode === 'instant' && when.repeat !== undefined ? { repeat: when.repeat } : {}),
    ...(trimmed === '' ? {} : { note: trimmed }),
  };
}
