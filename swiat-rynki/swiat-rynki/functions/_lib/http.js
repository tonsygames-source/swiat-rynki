export const UA = 'Mozilla/5.0 (compatible; SwiatRynkiBot/1.0; +personal-use)';

export async function fetchText(url, { timeoutMs = 7000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': UA, accept: '*/*', ...headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function json(data, { maxAge = 300, status = 200 } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${Math.min(maxAge, 60)}, s-maxage=${maxAge}`,
    },
  });
}

// Cache brzegowy Cloudflare (jeśli dostępny) – żeby nie odpytywać źródeł przy każdym otwarciu aplikacji.
export async function cached(request, ttlSeconds, producer) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL(request.url).origin + new URL(request.url).pathname + '?v=1');
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const res = await producer();
  if (cache && res.ok) {
    try { await cache.put(key, res.clone()); } catch { /* ignoruj */ }
  }
  return res;
}
