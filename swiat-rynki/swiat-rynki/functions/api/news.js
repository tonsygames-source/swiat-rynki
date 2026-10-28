import { FEEDS, parseFeed } from '../_lib/rss.js';
import { classify, buildSignals } from '../_lib/analyze.js';
import { ASSETS } from '../_lib/assets.js';
import { fetchText, json, cached } from '../_lib/http.js';

const TTL = 300; // 5 minut

async function build() {
  const results = await Promise.allSettled(FEEDS.map((f) => fetchText(f.url)));
  const sources = [];
  const seen = new Set();
  const items = [];

  results.forEach((r, i) => {
    const feed = FEEDS[i];
    if (r.status !== 'fulfilled') {
      sources.push({ name: feed.name, ok: false, count: 0, error: String(r.reason?.message || r.reason) });
      return;
    }
    let parsed = [];
    try { parsed = parseFeed(r.value); } catch { /* uszkodzony XML */ }
    sources.push({ name: feed.name, ok: parsed.length > 0, count: parsed.length, error: parsed.length ? null : 'brak artykułów w kanale' });
    for (const p of parsed) {
      const key = (p.link || p.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...p, source: feed.name, lang: feed.lang });
    }
  });

  const now = Date.now();
  for (const it of items) {
    if (it.published && it.published > now) it.published = now; // daty z przyszłości = "teraz"
    Object.assign(it, classify(it));
  }
  items.sort((a, b) => (b.published || 0) - (a.published || 0));

  const signals = buildSignals(items, now);

  // do przeglądarki wysyłamy tylko to, co potrzebne (bez surowych wpływów i długich streszczeń)
  const slim = items.slice(0, 250).map((it) => ({
    title: it.title,
    link: it.link,
    source: it.source,
    lang: it.lang,
    published: it.published,
    themes: it.themes.map((t) => t.label),
    chips: it.chips,
  }));

  return json(
    {
      updated: now,
      assets: ASSETS.map(({ id, name, group, note }) => ({ id, name, group, note: note || null })),
      sources,
      signals,
      items: slim,
    },
    { maxAge: TTL },
  );
}

export async function onRequestGet({ request }) {
  try {
    return await cached(request, TTL, build);
  } catch (e) {
    return json({ error: String(e?.message || e) }, { status: 500, maxAge: 0 });
  }
}
