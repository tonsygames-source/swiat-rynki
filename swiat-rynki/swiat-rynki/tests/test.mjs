// Testy bez internetu: sprawdzają parser RSS, reguły oraz oba endpointy na przykładowych danych.
import assert from 'node:assert/strict';
import { parseFeed } from '../functions/_lib/rss.js';
import { classify, buildSignals, tone } from '../functions/_lib/analyze.js';
import { parseChart } from '../functions/api/prices.js';
import { onRequestGet as newsGet } from '../functions/api/news.js';
import { onRequestGet as pricesGet } from '../functions/api/prices.js';

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const asyncOk = async (name, fn) => { await fn(); passed++; console.log('  ok  ' + name); };

const now = Date.now();
const rfc = (msAgo) => new Date(now - msAgo).toUTCString();

const RSS = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>${items}</channel></rss>`;
const rssItem = (title, desc, ago, link) => `<item><title><![CDATA[${title}]]></title><link>${link}</link><description><![CDATA[<p>${desc}</p>]]></description><pubDate>${rfc(ago)}</pubDate></item>`;

const SAMPLE = RSS(
  rssItem('Israel strikes Iran oil facilities, crude jumps', 'Fears of supply disruption &amp; escalation', 3600e3, 'https://ex.com/1') +
  rssItem('Fed signals rate cuts as inflation cools', 'Dovish tone from Powell', 2 * 3600e3, 'https://ex.com/2') +
  rssItem('Rosyjskie rakiety uderzyły w Kijów', 'Atak na infrastrukturę energetyczną', 3 * 3600e3, 'https://ex.com/3') +
  rssItem('Local bakery wins award', 'Nothing about markets', 4 * 3600e3, 'https://ex.com/4'),
);

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Drought hits wheat harvest</title><link rel="alternate" href="https://ex.com/a"/><summary>Poor harvest expected</summary><updated>${new Date(now - 1000).toISOString()}</updated></entry></feed>`;

console.log('Parser RSS');
ok('RSS: tytuły, linki, daty, dekodowanie HTML', () => {
  const items = parseFeed(SAMPLE);
  assert.equal(items.length, 4);
  assert.equal(items[0].link, 'https://ex.com/1');
  assert.ok(items[0].summary.includes('supply disruption & escalation'));
  assert.ok(!items[0].summary.includes('<p>'));
  assert.ok(Math.abs(items[0].published - (now - 3600e3)) < 2000);
});
ok('Atom: link z atrybutu href', () => {
  const items = parseFeed(ATOM);
  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://ex.com/a');
  assert.ok(items[0].published);
});

console.log('Reguły');
const dirOf = (c, asset) => c.chips.find((x) => x.asset === asset)?.dir;
ok('Bliski Wschód + atak => ropa up, transport down', () => {
  const c = classify({ title: 'Israel strikes Iran oil facilities, crude jumps', summary: '' });
  assert.equal(dirOf(c, 'ropa'), 'up');
  assert.equal(dirOf(c, 'transport'), 'down');
  assert.ok(c.themes.some((t) => t.id === 'mideast'));
});
ok('Obniżka stóp => akcje, krypto up; dolar down', () => {
  const c = classify({ title: 'Fed signals rate cuts', summary: 'Dovish tone from Powell' });
  assert.equal(dirOf(c, 'akcje_usa'), 'up');
  assert.equal(dirOf(c, 'krypto'), 'up');
  assert.equal(dirOf(c, 'usd'), 'down');
});
ok('Polski nagłówek: Rosja + rakiety => gaz up, PLN down', () => {
  const c = classify({ title: 'Rosyjskie rakiety uderzyły w Kijów', summary: '' });
  assert.equal(dirOf(c, 'gaz'), 'up');
  assert.equal(dirOf(c, 'pln'), 'down');
});
ok('Brak dopasowania dla obojętnej wiadomości', () => {
  const c = classify({ title: 'Local bakery wins award', summary: 'Nothing about markets' });
  assert.equal(c.chips.length, 0);
});
ok('Granice słów: "warning" nie jest "war", "Iran" nie łapie "Iranian-style" błędnie', () => {
  const c = classify({ title: 'Weather warning issued for Iran region', summary: '' });
  assert.ok(!c.themes.some((t) => t.id === 'mideast'));
});
ok('Ton: bitcoin spada => krypto down, bitcoin rekord => up', () => {
  assert.equal(dirOf(classify({ title: 'Bitcoin plunges after exchange hack', summary: '' }), 'krypto'), 'down');
  assert.equal(dirOf(classify({ title: 'Bitcoin hits record high as ETF inflows surge', summary: '' }), 'krypto'), 'up');
  assert.equal(tone('nothing here'), 'mixed');
});
ok('Susza => zboża up; rekordowe zbiory => zboża down', () => {
  assert.equal(dirOf(classify({ title: 'Drought hits wheat harvest', summary: '' }), 'zboza'), 'up');
  assert.equal(dirOf(classify({ title: 'Record harvest expected in Ukraine', summary: '' }), 'zboza'), 'down');
});
ok('Sprzeczne reguły => mixed (rozejm + atak w jednym nagłówku)', () => {
  const c = classify({ title: 'Israel strikes Gaza despite ceasefire', summary: '' });
  assert.equal(dirOf(c, 'ropa'), 'mixed');
});

console.log('Sygnały zbiorcze');
ok('Wiele źródeł liczy się mocniej, ale max 3; stare wiadomości są pomijane', () => {
  const mk = (src, ago) => ({ ...classify({ title: 'Israel strikes Iran oil facilities', summary: '' }), source: src, title: 't' + src, link: '#', published: now - ago });
  const items = [mk('A', 1e6), mk('B', 1e6), mk('C', 1e6), mk('D', 1e6), mk('E', 1e6), mk('Stare', 100 * 3600e3)];
  const sig = buildSignals(items, now);
  const ropa = sig.find((s) => s.asset === 'ropa');
  assert.equal(ropa.up, 3);
  assert.equal(ropa.down, 0);
  assert.ok(ropa.reasons[0].headlines.length > 0);
});

console.log('Endpointy (z atrapą sieci)');
const realFetch = globalThis.fetch;
const yahoo = (closes) => JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: closes.at(-1), currency: 'USD' }, indicators: { quote: [{ close: closes }] } }], error: null } });

await asyncOk('parseChart liczy zmiany 1d i 1m', () => {
  const q = parseChart(JSON.parse(yahoo([100, 102, 101, 110])));
  assert.equal(q.price, 110);
  assert.ok(Math.abs(q.d1 - ((110 - 101) / 101) * 100) < 1e-9);
  assert.ok(Math.abs(q.m1 - 10) < 1e-9);
});

globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('finance.yahoo.com')) {
    if (u.includes('BZ%3DF') || u.includes('BZ=F')) return new Response('Too Many Requests', { status: 429 });
    return new Response(yahoo([100, 101, 103, 102, 104]), { status: 200 });
  }
  if (u.includes('bbci.co.uk/news/world')) return new Response(SAMPLE, { status: 200 });
  if (u.includes('theguardian.com/world')) return new Response(SAMPLE, { status: 200 }); // duplikaty linków
  if (u.includes('aljazeera')) return new Response(ATOM, { status: 200 });
  if (u.includes('bankier')) return new Response('<html>nie rss</html>', { status: 200 });
  return new Response('boom', { status: 503 });
};

await asyncOk('/api/news: łączy źródła, odfiltrowuje duplikaty, raportuje błędne źródła', async () => {
  const res = await newsGet({ request: new Request('https://x.test/api/news') });
  assert.equal(res.status, 200);
  const data = await res.json();
  const okSources = data.sources.filter((s) => s.ok).map((s) => s.name);
  assert.deepEqual(okSources.sort(), ['Al Jazeera', 'BBC World', 'The Guardian World'].sort());
  assert.ok(data.sources.find((s) => s.name === 'Bankier.pl' && !s.ok));
  assert.ok(data.sources.find((s) => s.name === 'DW' && !s.ok));
  assert.equal(data.items.length, 5); // 4 z BBC (Guardian to duplikaty) + 1 z Al Jazeera
  assert.ok(data.signals.length > 0);
  assert.ok(data.assets.length >= 15);
  assert.ok(data.items.every((i) => Array.isArray(i.chips)));
});

await asyncOk('/api/prices: jedna awaria symbolu nie psuje reszty', async () => {
  const res = await pricesGet({ request: new Request('https://x.test/api/prices') });
  const data = await res.json();
  const brent = data.quotes.find((q) => q.symbol === 'BZ=F');
  const wti = data.quotes.find((q) => q.symbol === 'CL=F');
  assert.equal(brent.ok, false);
  assert.equal(wti.ok, true);
  assert.equal(wti.spark.length, 5);
});

globalThis.fetch = realFetch;
console.log(`\nZaliczone: ${passed}`);
