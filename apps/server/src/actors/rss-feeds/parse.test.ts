import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FeedInvalid, parseFeed } from './parse.ts';
import { cutSummary, htmlToText } from './plain-text.ts';
import { docOf, renderText } from './template.ts';

const BASE = 'https://blog.example.test/feed.xml';

function sha(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

function rss(items: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog</title>${items}</channel></rss>`;
}

const MEDIA = 'xmlns:media="http://search.yahoo.com/mrss/"';

function imageOfItem(inner: string) {
  const xml = `<?xml version="1.0"?><rss version="2.0" ${MEDIA}><channel><item><title>T</title><link>/t</link>${inner}</item></channel></rss>`;
  return parseFeed(xml, BASE)[0]?.image;
}

describe('the item image', () => {
  it('takes media:content with an image medium or type, also inside media:group', () => {
    expect(
      imageOfItem(`<media:content url="/v.mp4" medium="video"/>
        <media:content url="/a.jpg" medium="image"><media:description>A &lt;b&gt;cat&lt;/b&gt;</media:description></media:content>`),
    ).toEqual({ url: 'https://blog.example.test/a.jpg', alt: 'A cat' });
    expect(
      imageOfItem(
        '<media:group><media:content url="https://cdn.example.test/g.png" type="image/png"/></media:group>',
      ),
    ).toEqual({ url: 'https://cdn.example.test/g.png', alt: null });
  });

  it('falls back to media:thumbnail, then an image enclosure', () => {
    expect(
      imageOfItem('<enclosure url="/e.jpg" type="image/jpeg"/><media:thumbnail url="/th.jpg"/>'),
    ).toEqual({ url: 'https://blog.example.test/th.jpg', alt: null });
    expect(
      imageOfItem(
        '<enclosure url="/a.mp3" type="audio/mpeg"/><enclosure url="/e.jpg" type="image/jpeg"/>',
      ),
    ).toEqual({ url: 'https://blog.example.test/e.jpg', alt: null });
  });

  it('reads an Atom enclosure link with an image type', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>e1</id><title>T</title>
      <link href="/post"/><link rel="enclosure" type="image/webp" href="/pic.webp"/></entry></feed>`;
    expect(parseFeed(xml, BASE)[0]?.image).toEqual({
      url: 'https://blog.example.test/pic.webp',
      alt: null,
    });
  });

  it('ignores an image that is not https, and cuts the alt text at 1500 characters', () => {
    expect(imageOfItem('<media:thumbnail url="http://blog.example.test/a.jpg"/>')).toBeNull();
    const long = 'a'.repeat(1600);
    const image = imageOfItem(
      `<media:content url="/a.jpg" medium="image"/><media:description>${long}</media:description>`,
    );
    expect(image?.alt).toHaveLength(1500);
  });
});

describe('RSS 2.0', () => {
  it('reads title, link, guid, description and date per item', () => {
    const items = parseFeed(
      rss(`<item>
        <title>First &amp; best</title>
        <link>/posts/1</link>
        <guid isPermaLink="false">post-1</guid>
        <description>&lt;p&gt;Hello &lt;b&gt;world&lt;/b&gt;&amp;nbsp;!&lt;/p&gt;</description>
        <pubDate>Mon, 04 Jan 2027 08:00:00 GMT</pubDate>
      </item>
      <item><title>Second</title><link>https://blog.example.test/2</link>
        <description><![CDATA[<p>Raw &amp; ready</p>]]></description></item>`),
      BASE,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: 'First & best',
      link: 'https://blog.example.test/posts/1',
      summary: 'Hello world !',
      index: 0,
    });
    expect(items[0]?.key).toEqual(sha('post-1'));
    expect(items[0]?.at?.toString()).toBe('2027-01-04T08:00:00Z');
    expect(items[1]).toMatchObject({ summary: 'Raw & ready', at: null, index: 1 });
    expect(items[1]?.key).toEqual(sha('https://blog.example.test/2'));
  });
});

describe('Atom 1.0', () => {
  it('takes the alternate link, the id, the summary or else the content', () => {
    const items = parseFeed(
      `<feed xmlns="http://www.w3.org/2005/Atom"><title>Blog</title>
        <entry><title type="html">A &lt;em&gt;title&lt;/em&gt;</title>
          <link rel="self" href="/self/1"/><link rel="alternate" href="/a/1"/>
          <id>urn:uuid:1</id><summary>Short</summary><content>Long</content>
          <updated>2027-01-03T10:00:00+01:00</updated></entry>
        <entry><title>B</title><link href="https://other.example.test/b"/>
          <id>urn:uuid:2</id><content type="html">&lt;p&gt;Body&lt;/p&gt;</content>
          <published>2027-01-02T10:00:00Z</published><updated>2027-01-05T10:00:00Z</updated></entry>
      </feed>`,
      BASE,
    );
    expect(items.map(({ title, link, summary }) => ({ title, link, summary }))).toEqual([
      { title: 'A title', link: 'https://blog.example.test/a/1', summary: 'Short' },
      { title: 'B', link: 'https://other.example.test/b', summary: 'Body' },
    ]);
    expect(items[0]?.key).toEqual(sha('urn:uuid:1'));
    expect(items[0]?.at?.toString()).toBe('2027-01-03T09:00:00Z');
    expect(items[1]?.at?.toString()).toBe('2027-01-02T10:00:00Z');
  });
});

describe('refused documents', () => {
  it('refuses a DOCTYPE, so no entity can expand', () => {
    const bomb = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;">]><rss version="2.0"><channel><item><title>&lol2;</title><link>https://a.example.test/</link></item></channel></rss>`;
    expect(() => parseFeed(bomb, BASE)).toThrow(FeedInvalid);
    expect(() => parseFeed(`<!-- x --><!doctype rss><rss/>`, BASE)).toThrow(FeedInvalid);
  });

  it('still reads a feed whose CDATA or comment mentions a DOCTYPE', () => {
    const items = parseFeed(
      rss(
        `<!-- <!DOCTYPE x> --><item><title>T</title><link>/t</link><description><![CDATA[<!DOCTYPE html><p>x</p>]]></description></item>`,
      ),
      BASE,
    );
    expect(items).toHaveLength(1);
  });

  it('refuses what is not a well-formed RSS or Atom document', () => {
    for (const xml of ['', 'not xml', '<rss><channel><item></channel></rss>', '<html></html>']) {
      expect(() => parseFeed(xml, BASE)).toThrow(FeedInvalid);
    }
  });
});

describe('item rules', () => {
  it('keys by guid, else by the resolved link, and skips what has neither title nor link', () => {
    const items = parseFeed(
      rss(`<item><title>No guid</title><link>/x</link></item>
        <item><guid>only-guid</guid><description>no title, no link</description></item>
        <item><title>Title only</title></item>
        <item><title>Script</title><link>javascript:alert(1)</link><guid>g-1</guid></item>
        <item><title>Mail</title><link>mailto:a@example.test</link></item>
        <item><title>Again</title><link>/x</link></item>`),
      BASE,
    );
    expect(items.map(({ title, link }) => ({ title, link }))).toEqual([
      { title: 'No guid', link: 'https://blog.example.test/x' },
      { title: 'Script', link: null },
    ]);
    expect(items[0]?.key).toEqual(sha('https://blog.example.test/x'));
    expect(items[1]?.key).toEqual(sha('g-1'));
  });
});

describe('plain text', () => {
  it('drops tags, scripts and comments, decodes entities and collapses whitespace', () => {
    expect(
      htmlToText(
        '<p>One&nbsp;<b>two</b></p>\n\n<script>alert("x")</script><!-- c --><br/>three &#233;&#x41; &amp;lt; &unknown; &#0;',
      ),
    ).toBe('One two three éA &lt; &unknown; �');
  });

  it('cuts a summary at 500 characters on a word boundary, with an ellipsis', () => {
    const words = Array.from({ length: 120 }, (_, n) => `word${n}`).join(' ');
    const cut = cutSummary(words);
    expect([...cut].length).toBeLessThanOrEqual(500);
    expect(cut.endsWith('…')).toBe(true);
    expect(words.startsWith(cut.slice(0, -1))).toBe(true);
    expect(words.charAt(cut.length - 1)).toBe(' ');
    expect(cutSummary('short')).toBe('short');
    expect([...cutSummary('x'.repeat(600))].length).toBe(500);
  });
});

describe('the template', () => {
  const item = { title: 'Café', link: 'https://a.example.test/1', summary: 'Sum' };

  it('fills the three placeholders, keeps other braces and normalizes to NFC', () => {
    expect(renderText('{title} {link} {summary} {other} {Title}', item)).toBe(
      'Café https://a.example.test/1 Sum {other} {Title}',
    );
    expect(renderText('{link}', { ...item, link: null })).toBe('');
  });

  it('makes one paragraph per line', () => {
    expect(docOf(renderText('{title}\n\n{link}', item))).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Café' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'https://a.example.test/1' }] },
      ],
    });
  });
});
