import { describe, expect, it } from 'vitest';
import { BOM, decodeUtf8, MAX_CSV_ROWS, parseCsv, toCsv } from './csv.ts';

function texts(input: string) {
  return parseCsv(input).records.map((record) => record.values.text);
}

describe('CSV parsing', () => {
  it('reads quoted fields, escaped quotes and newlines inside quotes', () => {
    const parsed = parseCsv('text,channels\n"Hello, ""world""","a b"\n"two\nlines",c\n');
    expect(parsed.problems).toEqual([]);
    expect(parsed.records).toEqual([
      { line: 2, values: { text: 'Hello, "world"', channels: 'a b', date: '', time: '' } },
      { line: 3, values: { text: 'two\nlines', channels: 'c', date: '', time: '' } },
    ]);
  });

  it('counts lines across quoted newlines, CRLF and skipped blank lines', () => {
    const parsed = parseCsv('text\r\n"a\r\nb"\r\n\r\nc\r\n');
    expect(parsed.records.map((record) => record.line)).toEqual([2, 5]);
    expect(texts('text\r\n"a\r\nb"\r\n\r\nc\r\n')).toEqual(['a\r\nb', 'c']);
  });

  it('detects the semicolon delimiter Excel writes in sk and cs', () => {
    const parsed = parseCsv('Text;Channels;Date;Time\nAhoj, svet;ada;2026-12-31;09:30\n');
    expect(parsed.records[0]?.values).toEqual({
      text: 'Ahoj, svet',
      channels: 'ada',
      date: '2026-12-31',
      time: '09:30',
    });
  });

  it('strips a UTF-8 byte order mark and matches headers without case or spaces', () => {
    expect(texts(`${BOM} TEXT \nAhoj`)).toEqual(['Ahoj']);
  });

  it('refuses an unknown, duplicate or missing text column', () => {
    expect(parseCsv('text,when\nx,y').problems).toEqual([{ kind: 'unknown_column', name: 'when' }]);
    expect(parseCsv('text,Text\nx,y').problems).toEqual([
      { kind: 'duplicate_column', name: 'text' },
    ]);
    expect(parseCsv('channels\nx').problems).toEqual([{ kind: 'missing_text' }]);
  });

  it('refuses more rows than one import takes', () => {
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, (_, index) => `post ${index}`);
    expect(parseCsv(['text', ...rows].join('\n')).problems).toEqual([
      { kind: 'too_many_rows', max: MAX_CSV_ROWS },
    ]);
    expect(parseCsv(['text', ...rows.slice(1)].join('\n')).problems).toEqual([]);
  });

  it('reports an empty file, an unclosed quote and extra fields', () => {
    expect(parseCsv('text\n\n').problems).toEqual([{ kind: 'empty' }]);
    expect(parseCsv('text\nok\n"open').problems).toEqual([{ kind: 'unclosed_quote', line: 3 }]);
    expect(parseCsv('text,channels\na,b,c').problems).toEqual([{ kind: 'extra_fields', line: 2 }]);
  });

  it('ignores an empty header column only while its cells are empty', () => {
    const parsed = parseCsv('text;channels;date;time;;\nAhoj;;;;;\n');
    expect(parsed.problems).toEqual([]);
    expect(parsed.records.map((record) => record.values.text)).toEqual(['Ahoj']);
    expect(parseCsv('text;;\nAhoj;;x\n').problems).toEqual([{ kind: 'unknown_column', name: '' }]);
  });

  it('keeps each line whole when the header has a single field', () => {
    expect(texts('text\nAhoj, svet; druhý\n"Quoted\nline, too"\n')).toEqual([
      'Ahoj, svet; druhý',
      'Quoted\nline, too',
    ]);
  });

  it('decodes UTF-8 and refuses anything else', () => {
    const utf8 = new TextEncoder().encode('text\nDobrý deň');
    expect(decodeUtf8(utf8.buffer)).toBe('text\nDobrý deň');
    const cp1250 = Uint8Array.from([0x74, 0x65, 0x78, 0x74, 0x0a, 0x44, 0x6f, 0x62, 0x72, 0xfd]);
    expect(decodeUtf8(cp1250.buffer)).toBeNull();
  });

  it('writes what it reads', () => {
    const csv = toCsv([
      ['text', 'channels'],
      ['Hello, "you"\nthere', 'a'],
    ]);
    expect(texts(csv)).toEqual(['Hello, "you"\nthere']);
  });
});
