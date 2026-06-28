/**
 * Sehr kompakter RSS/Atom-Parser → Roh-Text-Items. RSS-Inhalte sind
 * unstrukturiert (Freitext), daher gehen sie NICHT direkt als Event durch,
 * sondern an die Claude-Extraktion. Keine externe Dependency.
 */

export interface RawTextItem {
  text: string;
  sourceUrl: string | null;
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = block.match(re);
  if (!m) return null;
  return decodeEntities(stripCdata(m[1])).trim() || null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
}

export function parseFeed(xml: string): RawTextItem[] {
  // RSS <item> oder Atom <entry>
  const blocks = [
    ...xml.matchAll(/<item[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  const items: RawTextItem[] = [];
  for (const block of blocks) {
    const title = tag(block, 'title');
    const desc =
      tag(block, 'content:encoded') ?? tag(block, 'description') ?? tag(block, 'summary') ?? tag(block, 'content');
    const date = tag(block, 'pubDate') ?? tag(block, 'published') ?? tag(block, 'updated');
    let link = tag(block, 'link'); // RSS: <link>url</link>
    if (!link) {
      // Atom: mehrere <link rel=".." href=".."/>. rel=alternate (oder ohne rel) ist
      // die menschenlesbare Seite; self/enclosure/edit/replies/via überspringen.
      const parsed = [...block.matchAll(/<link\b[^>]*>/gi)]
        .map((m) => ({
          href: m[0].match(/href=["']([^"']+)["']/i)?.[1] ?? null,
          rel: (m[0].match(/rel=["']([^"']+)["']/i)?.[1] ?? '').toLowerCase(),
        }))
        .filter((l) => l.href);
      const skip = new Set(['self', 'enclosure', 'edit', 'replies', 'via']);
      const alternate = parsed.find((l) => l.rel === 'alternate' || l.rel === '');
      const firstOk = parsed.find((l) => !skip.has(l.rel));
      link = (alternate ?? firstOk ?? parsed[0])?.href ?? null;
    }
    const text = [title, date, desc ? stripTags(desc) : null].filter(Boolean).join('\n');
    if (text.trim()) items.push({ text, sourceUrl: link });
  }
  return items;
}
