import { Temporal } from 'temporal-polyfill';
import { m as calendarText } from '../../i18n/calendar.ts';
import { BOM, CSV_COLUMNS, toCsv } from './csv.ts';

const FILE_NAME = 'kronaut-import.csv';
const EXAMPLE_MEDIA = 'https://example.com/photo.jpg';

function exampleCsv(handles: readonly string[], tz: string): string {
  const tomorrow = Temporal.Now.plainDateISO(tz).add({ days: 1 }).toString();
  const channels = handles.join(' ');
  return toCsv([
    [...CSV_COLUMNS],
    [calendarText.calendar_import_example_first(), channels, tomorrow, '09:00', EXAMPLE_MEDIA],
    [calendarText.calendar_import_example_queue(), channels, '', '', ''],
  ]);
}

// Excel opens a CSV without a byte order mark in the system code page, which garbles sk and cs text.
export function downloadExample(handles: readonly string[], tz: string): void {
  const blob = new Blob([BOM, exampleCsv(handles, tz)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}
