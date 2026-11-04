import { describe, expect, it } from 'vitest';
import { distinctUrls, hostOf, MAX_FILE_LINKS, parseLinks } from './links.ts';

describe('media links', () => {
  it('splits on whitespace and | but not on commas or semicolons', () => {
    expect(
      parseLinks(' https://a.test/1.jpg |https://b.test/2.jpg\n\thttps://c.test/3.jpg '),
    ).toEqual({ urls: ['https://a.test/1.jpg', 'https://b.test/2.jpg', 'https://c.test/3.jpg'] });
    expect(parseLinks('https://a.test/1.jpg,https://b.test/2.jpg')).toEqual({
      urls: ['https://a.test/1.jpg,https://b.test/2.jpg'],
    });
    expect(parseLinks('  ')).toEqual({ urls: [] });
  });

  it.each([
    'http://a.test/1.jpg',
    'ftp://a.test/1.jpg',
    'a.test/1.jpg',
    'https://user:secret@a.test/1.jpg',
  ])('refuses %j', (link) => {
    expect(parseLinks(`https://a.test/ok.jpg ${link}`)).toEqual({ kind: 'media_link_invalid' });
  });

  it('allows ten links and refuses eleven', () => {
    const links = Array.from({ length: 11 }, (_, index) => `https://a.test/${index}.jpg`);
    expect(parseLinks(links.slice(0, 10).join(' '))).toMatchObject({ urls: links.slice(0, 10) });
    expect(parseLinks(links.join(' '))).toEqual({ kind: 'media_too_many', max: 10 });
  });

  it('fetches each link once across the file, in first-seen order', () => {
    const a = parseLinks('https://A.test/x.jpg');
    const b = parseLinks('https://b.test/y.jpg https://a.test/x.jpg');
    const lists = [a, b].map((parsed) => ('urls' in parsed ? parsed.urls : []));
    expect(distinctUrls(lists)).toEqual({ urls: ['https://a.test/x.jpg', 'https://b.test/y.jpg'] });
  });

  it('allows 500 distinct links in a file and refuses 501', () => {
    const links = Array.from(
      { length: MAX_FILE_LINKS + 1 },
      (_, index) => `https://a.test/${index}`,
    );
    const rows = [links.slice(0, MAX_FILE_LINKS), links.slice(0, 1)];
    expect(distinctUrls(rows)).toEqual({ urls: links.slice(0, MAX_FILE_LINKS) });
    expect(distinctUrls([links])).toEqual({ kind: 'media_file_too_many', max: 500 });
  });

  it('names only the host of a link', () => {
    expect(hostOf('https://cdn.a.test:8443/p/x.jpg?token=secret')).toBe('cdn.a.test:8443');
  });
});
