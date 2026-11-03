export const CSV_COLUMNS = ['text', 'channels', 'date', 'time'] as const;
export const MAX_CSV_ROWS = 500;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface CsvRecord {
  readonly line: number;
  readonly values: Readonly<Record<CsvColumn, string>>;
}

export type CsvProblem =
  | { readonly kind: 'empty' }
  | { readonly kind: 'unclosed_quote'; readonly line: number }
  | { readonly kind: 'unknown_column'; readonly name: string }
  | { readonly kind: 'duplicate_column'; readonly name: string }
  | { readonly kind: 'missing_text' }
  | { readonly kind: 'too_many_rows'; readonly max: number }
  | { readonly kind: 'extra_fields'; readonly line: number };

export interface CsvParse {
  readonly records: readonly CsvRecord[];
  readonly problems: readonly CsvProblem[];
}

interface RawRecord {
  readonly line: number;
  readonly fields: readonly string[];
}

interface Scan {
  readonly text: string;
  readonly delimiter: string | null;
  readonly records: RawRecord[];
  index: number;
  line: number;
  start: number;
  fields: string[];
  field: string;
  quoted: boolean;
}

export const BOM = String.fromCodePoint(0xfeff);

const UTF8 = new TextDecoder('utf-8', { fatal: true });

export function decodeUtf8(bytes: ArrayBuffer): string | null {
  try {
    return UTF8.decode(bytes);
  } catch {
    return null;
  }
}

function detectDelimiter(text: string): ',' | ';' | null {
  const header = text.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const count = (char: string) => header.split(char).length - 1;
  if (count(';') === 0 && count(',') === 0) return null;
  return count(';') > count(',') ? ';' : ',';
}

function endRecord(s: Scan): void {
  s.fields.push(s.field);
  s.records.push({ line: s.start, fields: s.fields });
  s.fields = [];
  s.field = '';
}

function quotedStep(s: Scan, char: string): void {
  if (char === '"' && s.text[s.index + 1] === '"') {
    s.field += '"';
    s.index += 2;
    return;
  }
  s.index += 1;
  if (char === '"') s.quoted = false;
  else s.field += char;
  if (char === '\n') s.line += 1;
}

function plainStep(s: Scan, char: string): void {
  s.index += 1;
  if (char === '"' && s.field === '') {
    s.quoted = true;
  } else if (char === s.delimiter) {
    s.fields.push(s.field);
    s.field = '';
  } else if (char === '\n' || (char === '\r' && s.text[s.index] !== '\n')) {
    endRecord(s);
    s.line += 1;
    s.start = s.line;
  } else if (char !== '\r') {
    s.field += char;
  }
}

function scan(
  text: string,
  delimiter: string | null,
): { records: RawRecord[]; unclosed: number | null } {
  const s: Scan = {
    text,
    delimiter,
    records: [],
    index: 0,
    line: 1,
    start: 1,
    fields: [],
    field: '',
    quoted: false,
  };
  while (s.index < text.length) {
    const char = text[s.index] ?? '';
    if (s.quoted) quotedStep(s, char);
    else plainStep(s, char);
  }
  if (s.quoted) return { records: s.records, unclosed: s.start };
  if (s.field !== '' || s.fields.length > 0) endRecord(s);
  return { records: s.records, unclosed: null };
}

function isBlank(record: RawRecord): boolean {
  return record.fields.every((field) => field.trim() === '');
}

function isColumn(name: string): name is CsvColumn {
  return (CSV_COLUMNS as readonly string[]).includes(name);
}

type HeaderColumn = CsvColumn | null;

function readHeader(header: RawRecord): { columns: HeaderColumn[] } | { problem: CsvProblem } {
  const columns: HeaderColumn[] = [];
  for (const raw of header.fields) {
    const name = raw.trim().toLowerCase();
    if (name === '') columns.push(null);
    else if (!isColumn(name)) return { problem: { kind: 'unknown_column', name: raw.trim() } };
    else if (columns.includes(name)) return { problem: { kind: 'duplicate_column', name } };
    else columns.push(name);
  }
  if (!columns.includes('text')) return { problem: { kind: 'missing_text' } };
  return { columns };
}

function unnamedInUse(columns: readonly HeaderColumn[], rows: readonly RawRecord[]): boolean {
  return columns.some(
    (column, index) =>
      column === null && rows.some((raw) => (raw.fields[index] ?? '').trim() !== ''),
  );
}

function toRecord(columns: readonly HeaderColumn[], raw: RawRecord): CsvRecord {
  const values: Record<CsvColumn, string> = { text: '', channels: '', date: '', time: '' };
  for (const [index, column] of columns.entries()) {
    if (column !== null) values[column] = raw.fields[index] ?? '';
  }
  return { line: raw.line, values };
}

function failed(problem: CsvProblem): CsvParse {
  return { records: [], problems: [problem] };
}

export function parseCsv(input: string): CsvParse {
  const text = input.startsWith(BOM) ? input.slice(BOM.length) : input;
  const scanned = scan(text, detectDelimiter(text));
  if (scanned.unclosed !== null) return failed({ kind: 'unclosed_quote', line: scanned.unclosed });
  const [header, ...rows] = scanned.records.filter((record) => !isBlank(record));
  if (header === undefined || rows.length === 0) return failed({ kind: 'empty' });
  const read = readHeader(header);
  if ('problem' in read) return failed(read.problem);
  if (unnamedInUse(read.columns, rows)) return failed({ kind: 'unknown_column', name: '' });
  if (rows.length > MAX_CSV_ROWS) return failed({ kind: 'too_many_rows', max: MAX_CSV_ROWS });
  const problems: CsvProblem[] = rows
    .filter((raw) => raw.fields.length > read.columns.length)
    .map((raw) => ({ kind: 'extra_fields', line: raw.line }));
  return { records: rows.map((raw) => toRecord(read.columns, raw)), problems };
}

function quote(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((row) => row.map(quote).join(','))
    .join('\r\n')
    .concat('\r\n');
}
