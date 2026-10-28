// Źródła wiadomości (publiczne kanały RSS). Adresy RSS bywają zmieniane przez wydawców –
// jeśli któryś przestanie działać, aplikacja pokaże to w sekcji „Źródła” i pominie go.
export const FEEDS = [
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', lang: 'en' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', lang: 'en' },
  { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', lang: 'en' },
  { name: 'The Guardian Business', url: 'https://www.theguardian.com/business/rss', lang: 'en' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', lang: 'en' },
  { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-all', lang: 'en' },
  { name: 'CNBC World', url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html', lang: 'en' },
  { name: 'CNBC Economy', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', lang: 'en' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', lang: 'en' },
  { name: 'Bankier.pl', url: 'https://www.bankier.pl/rss/wiadomosci.xml', lang: 'pl' },
  { name: 'Rzeczpospolita', url: 'https://www.rp.pl/rss_main', lang: 'pl' },
  { name: 'TVN24 Świat', url: 'https://tvn24.pl/swiat.xml', lang: 'pl' },
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function safeChar(code) {
  try { return String.fromCodePoint(code); } catch { return ''; }
}

function clean(s) {
  if (!s) return '';
  let t = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  t = decode(t);               // &lt;p&gt; -> <p>
  t = t.replace(/<[^>]*>/g, ' '); // usuń znaczniki HTML
  t = decode(t);               // podwójnie zakodowane znaki
  return t.replace(/\s+/g, ' ').trim();
}

function getTag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

function getLink(block) {
  const text = clean(getTag(block, 'link'));
  if (/^https?:\/\//i.test(text)) return text;
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
    || block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (alt) return decode(alt[1]);
  const guid = clean(getTag(block, 'guid'));
  return /^https?:\/\//i.test(guid) ? guid : '';
}

export function parseFeed(xml, limit = 30) {
  const items = [];
  const re = /<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;
  let m;
  while ((m = re.exec(xml)) && items.length < limit) {
    const block = m[0];
    const title = clean(getTag(block, 'title'));
    if (!title) continue;
    const link = getLink(block);
    const summary = clean(getTag(block, 'description') || getTag(block, 'summary') || getTag(block, 'content')).slice(0, 400);
    const dateStr = clean(getTag(block, 'pubDate') || getTag(block, 'dc:date') || getTag(block, 'published') || getTag(block, 'updated'));
    const t = dateStr ? Date.parse(dateStr) : NaN;
    items.push({ title, link, summary, published: Number.isNaN(t) ? null : t });
  }
  return items;
}
