import { ASSETS } from '../_lib/assets.js';
import { fetchText, json, cached } from '../_lib/http.js';

const TTL = 120; // 2 minuty

const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

// Wyciąga cenę i zmiany z odpowiedzi Yahoo Finance (nieoficjalne, darmowe API).
export function parseChart(data) {
  const r = data?.chart?.result?.[0];
  if (!r) throw new Error(data?.chart?.error?.description || 'brak danych');
  const closes = (r.indicators?.quote?.[0]?.close || []).filter((x) => typeof x === 'number');
  if (closes.length < 2) throw new Error('za mało danych');
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  const first = closes[0];
  const price = typeof r.meta?.regularMarketPrice === 'number' ? r.meta.regularMarketPrice : last;
  return {
    price,
    currency: r.meta?.currency || null,
    d1: ((last - prev) / prev) * 100,
    m1: ((last - first) / first) * 100,
    spark: closes.slice(-30).map((x) => Math.round(x * 10000) / 10000),
  };
}

async function fetchSymbol(sym) {
  let lastErr;
  for (const host of HOSTS) {
    try {
      const txt = await fetchText(`https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?range=1mo&interval=1d`, { timeoutMs: 6000 });
      return parseChart(JSON.parse(txt));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function build() {
  const jobs = ASSETS.flatMap((a) => a.symbols.map((s) => ({ asset: a.id, symbol: s.s, name: s.n })));
  const settled = await Promise.allSettled(jobs.map((j) => fetchSymbol(j.symbol)));
  const quotes = jobs.map((j, i) => {
    const r = settled[i];
    return r.status === 'fulfilled'
      ? { ...j, ok: true, ...r.value }
      : { ...j, ok: false, error: String(r.reason?.message || r.reason) };
  });
  return json({ updated: Date.now(), quotes }, { maxAge: TTL });
}

export async function onRequestGet({ request }) {
  try {
    return await cached(request, TTL, build);
  } catch (e) {
    return json({ error: String(e?.message || e) }, { status: 500, maxAge: 0 });
  }
}
