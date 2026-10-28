'use strict';

// ---------- pomocnicze ----------
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const DIR = {
  up: { sym: '▲', cls: 'up', word: 'możliwy wzrost' },
  down: { sym: '▼', cls: 'down', word: 'możliwy spadek' },
  mixed: { sym: '◆', cls: 'mixed', word: 'niejednoznaczne' },
};

const HOUR = 3600 * 1000;
const state = {
  news: null,
  prices: null,
  newsErr: null,
  pricesErr: null,
  tab: 'overview',
  lang: 'all',
  asset: 'all',
  onlyRelevant: true,
  shown: 40,
  loadedAt: 0,
  loading: false,
};

function safeGet(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* tryb prywatny */ } }

function timeAgo(ts) {
  if (!ts) return 'brak daty';
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return 'przed chwilą';
  if (m < 60) return `${m} min temu`;
  const hrs = Math.round(m / 60);
  if (hrs < 24) return `${hrs} godz. temu`;
  const d = Math.round(hrs / 24);
  return d === 1 ? 'wczoraj' : `${d} dni temu`;
}

function fmtNum(x) {
  if (x == null || Number.isNaN(x)) return '–';
  const abs = Math.abs(x);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 2 : abs >= 10 ? 2 : 4;
  return x.toLocaleString('pl-PL', { maximumFractionDigits: digits, minimumFractionDigits: abs < 10 ? 2 : 0 });
}

function fmtPct(x) {
  if (x == null || Number.isNaN(x)) return '–';
  const s = x.toLocaleString('pl-PL', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return (x > 0 ? '+' : '') + s + '%';
}

function pctClass(x) { return x > 0 ? 'up' : x < 0 ? 'down' : 'muted'; }

// Aktywa z adnotacją (złoty, obligacje) – kolor zmiany ceny mógłby wprowadzać w błąd, więc zostaje neutralny.
function pctClassFor(assetId, x) { return assetMap()[assetId]?.note ? 'muted' : pctClass(x); }

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (n === 1) return one;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
}

function safeUrl(u) {
  try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : null; } catch { return null; }
}

function link(text, url, cls) {
  const href = safeUrl(url);
  return href ? h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls }, text) : h('span', { class: cls }, text);
}

function assetMap() {
  return Object.fromEntries((state.news?.assets || []).map((a) => [a.id, a]));
}

function quoteFor(assetId) {
  return state.prices?.quotes?.find((q) => q.asset === assetId && q.ok) || null;
}

// ---------- pobieranie danych ----------
async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function load() {
  if (state.loading) return;
  state.loading = true;
  $('#refresh').classList.add('spin');
  const [n, p] = await Promise.allSettled([getJson('/api/news'), getJson('/api/prices')]);
  if (n.status === 'fulfilled' && !n.value.error) { state.news = n.value; state.newsErr = null; }
  else state.newsErr = String(n.reason?.message || n.value?.error || 'nieznany błąd');
  if (p.status === 'fulfilled' && !p.value.error) { state.prices = p.value; state.pricesErr = null; }
  else state.pricesErr = String(p.reason?.message || p.value?.error || 'nieznany błąd');
  state.loadedAt = Date.now();
  state.loading = false;
  $('#refresh').classList.remove('spin');
  renderAll();
}

// ---------- widok: Przegląd ----------
function statusBox(what, err) {
  return h('div', { class: 'box' },
    h('p', null, `Nie udało się pobrać: ${what}.`),
    h('p', { class: 'muted small' }, err || ''),
    h('button', { onclick: load }, 'Spróbuj ponownie'),
  );
}

function meter(s) {
  const total = s.up + s.down + s.mixed || 1;
  const seg = (cls, n) => h('i', { class: cls, style: `width:${(n / total) * 100}%` });
  return h('div', { class: 'meter', role: 'img', 'aria-label': `Sygnały: ${s.up} wzrostowe, ${s.down} spadkowe, ${s.mixed} niejednoznaczne` },
    seg('m-up', s.up), seg('m-down', s.down), seg('m-mixed', s.mixed));
}

function assetCard(s, amap) {
  const a = amap[s.asset] || { name: s.asset };
  const q = quoteFor(s.asset);
  const body = h('div', { class: 'card-body', hidden: true });
  const head = h('button', { class: 'card-head', 'aria-expanded': 'false' },
    h('span', { class: 'card-title' }, a.name),
    q ? h('span', { class: 'card-price' }, fmtNum(q.price), ' ', h('span', { class: pctClassFor(s.asset, q.d1) }, fmtPct(q.d1))) : h('span', { class: 'card-price muted' }, ''),
    meter(s),
    h('span', { class: 'card-sub' },
      s.up ? h('span', { class: 'up' }, `▲ ${s.up}`) : null,
      s.down ? h('span', { class: 'down' }, `▼ ${s.down}`) : null,
      s.mixed ? h('span', { class: 'mixed' }, `◆ ${s.mixed}`) : null,
      h('span', null, `${s.reasons.length} ${plural(s.reasons.length, 'temat', 'tematy', 'tematów')}`),
    ),
  );

  for (const r of s.reasons) {
    const d = DIR[r.dir];
    body.append(h('div', { class: 'reason' },
      h('div', { class: 'reason-title' }, h('span', { class: d.cls }, `${d.sym} `), r.label),
      h('p', null, r.why),
      h('ul', { class: 'heads' }, r.headlines.map((x) => h('li', null, link(x.title, x.link), ' ', h('span', { class: 'src' }, `— ${x.source}`)))),
    ));
  }
  if (a.note) body.append(h('p', { class: 'note' }, a.note));

  head.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    head.setAttribute('aria-expanded', String(open));
  });
  return h('div', { class: 'card' }, head, body);
}

function renderOverview() {
  const root = $('#view-overview');
  root.replaceChildren();
  if (!state.news) {
    root.append(state.newsErr ? statusBox('wiadomości', state.newsErr) : h('p', { class: 'empty' }, 'Ładuję wiadomości…'));
    return;
  }
  const { signals, sources, items } = state.news;
  const amap = assetMap();
  const recent = items.filter((i) => i.chips.length && (!i.published || i.published > Date.now() - 48 * HOUR)).length;
  const okSrc = sources.filter((s) => s.ok).length;

  root.append(h('p', { class: 'lead' },
    `Z ostatnich 48 godzin wyłowiłem ${recent} wiadomości, które mogą mieć znaczenie dla rynków (źródła: ${okSrc}/${sources.length}). Kliknij aktywo, żeby zobaczyć powody i nagłówki.`));
  root.append(h('p', { class: 'legend' },
    h('span', { class: 'up' }, '▲ możliwy wzrost'), h('span', { class: 'down' }, '▼ możliwy spadek'), h('span', { class: 'mixed' }, '◆ zależy od szczegółów')));

  const groups = [
    ['Może zyskać', signals.filter((s) => s.score > 0)],
    ['Może stracić', signals.filter((s) => s.score < 0)],
    ['Do obserwacji (sygnały sprzeczne lub niejednoznaczne)', signals.filter((s) => s.score === 0)],
  ];
  let any = false;
  for (const [title, list] of groups) {
    if (!list.length) continue;
    any = true;
    root.append(h('h2', null, title));
    list.forEach((s) => root.append(assetCard(s, amap)));
  }
  if (!any) root.append(h('p', { class: 'empty' }, 'Brak wyraźnych sygnałów w ostatnich 48 godzinach.'));

  root.append(h('p', { class: 'disclaimer' },
    'To narzędzie informacyjne, nie porada inwestycyjna. Powiązania „wydarzenie → aktywo” to ogólne zasady oparte na słowach kluczowych, a nie prognozy – rynki często reagują inaczej, a informacja bywa już „wliczona w cenę”. Zanim zainwestujesz prawdziwe pieniądze, sprawdź źródła i rozważ konsultację z doradcą.'));

  const list = h('ul', { style: 'list-style:none;padding:0;margin:8px 0 0' },
    sources.map((s) => h('li', null, s.ok ? '✓ ' : '✗ ', s.name, ' ', h('span', { class: 'muted' }, s.ok ? `(${s.count})` : `– ${s.error || 'błąd'}`))));
  root.append(h('details', { class: 'sources' }, h('summary', null, 'Źródła wiadomości'), list));
}

// ---------- widok: Wiadomości ----------
function renderNews() {
  const root = $('#view-news');
  root.replaceChildren();
  if (!state.news) {
    root.append(state.newsErr ? statusBox('wiadomości', state.newsErr) : h('p', { class: 'empty' }, 'Ładuję wiadomości…'));
    return;
  }
  const amap = assetMap();

  const langSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Język' },
    [['all', 'Wszystkie'], ['pl', 'PL'], ['en', 'EN']].map(([v, t]) =>
      h('button', { class: state.lang === v ? 'on' : '', 'aria-pressed': String(state.lang === v), onclick: () => { state.lang = v; state.shown = 40; renderNews(); } }, t)));

  const sel = h('select', { 'aria-label': 'Filtruj po aktywie', onchange: (e) => { state.asset = e.target.value; state.shown = 40; renderNews(); } },
    h('option', { value: 'all' }, 'Wszystkie aktywa'),
    state.news.assets.map((a) => h('option', { value: a.id, selected: state.asset === a.id }, a.name)));

  const tog = h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked: state.onlyRelevant, onchange: (e) => { state.onlyRelevant = e.target.checked; state.shown = 40; renderNews(); } }),
    'Tylko istotne dla rynków');

  root.append(h('div', { class: 'filters' }, langSeg, sel, tog));

  let items = state.news.items;
  if (state.lang !== 'all') items = items.filter((i) => i.lang === state.lang);
  if (state.onlyRelevant || state.asset !== 'all') items = items.filter((i) => i.chips.length);
  if (state.asset !== 'all') items = items.filter((i) => i.chips.some((c) => c.asset === state.asset));

  if (!items.length) {
    root.append(h('p', { class: 'empty' }, 'Brak wiadomości dla wybranych filtrów.'));
    return;
  }

  items.slice(0, state.shown).forEach((it) => {
    const chips = it.chips.map((c) => {
      const d = DIR[c.dir];
      return h('span', { class: `chip ${d.cls}`, title: d.word }, `${d.sym} ${(amap[c.asset]?.name) || c.asset}`);
    });
    root.append(h('article', { class: 'news-item' },
      h('div', { class: 'news-meta' }, h('span', null, it.source), h('span', null, '·'), h('span', null, timeAgo(it.published))),
      link(it.title, it.link, 'news-title'),
      it.themes.length ? h('div', { class: 'theme' }, it.themes.join(' · ')) : null,
      chips.length ? h('div', { class: 'chips' }, chips) : null,
      it.chips.length ? h('details', { class: 'why' },
        h('summary', null, 'Dlaczego?'),
        h('ul', null, it.chips.map((c) => h('li', null, h('b', null, `${DIR[c.dir].sym} ${amap[c.asset]?.name || c.asset}: `), c.why)))) : null,
    ));
  });

  if (items.length > state.shown) {
    root.append(h('button', { class: 'more', onclick: () => { state.shown += 40; renderNews(); } }, `Pokaż więcej (${items.length - state.shown})`));
  }
}

// ---------- widok: Ceny ----------
function sparkline(values, up, neutral) {
  const w = 84, hgt = 28, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = hgt - pad - ((v - min) / span) * (hgt - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('aria-hidden', 'true');
  const pl = document.createElementNS(ns, 'polyline');
  pl.setAttribute('points', pts);
  pl.setAttribute('fill', 'none');
  pl.setAttribute('stroke', neutral ? 'var(--muted)' : up ? 'var(--up)' : 'var(--down)');
  pl.setAttribute('stroke-width', '1.8');
  pl.setAttribute('stroke-linejoin', 'round');
  pl.setAttribute('stroke-linecap', 'round');
  svg.append(pl);
  return svg;
}

function renderPrices() {
  const root = $('#view-prices');
  root.replaceChildren();
  if (!state.prices) {
    root.append(state.pricesErr ? statusBox('ceny', state.pricesErr) : h('p', { class: 'empty' }, 'Ładuję ceny…'));
    return;
  }
  const amap = assetMap();
  const quotes = state.prices.quotes;
  if (quotes.every((q) => !q.ok)) {
    root.append(statusBox('ceny (źródło danych nie odpowiada)', 'Spróbuj ponownie za kilka minut.'));
    return;
  }
  root.append(h('p', { class: 'lead' }, 'Zmiana dzienna i w ciągu ostatniego miesiąca. Dane z Yahoo Finance mogą być opóźnione do ok. 15 minut.'));

  const order = ['Surowce', 'Waluty', 'Akcje', 'Krypto', 'Obligacje'];
  const groupOf = (q) => amap[q.asset]?.group || 'Inne';
  for (const g of order) {
    const list = quotes.filter((q) => groupOf(q) === g);
    if (!list.length) continue;
    root.append(h('h2', null, g));
    for (const q of list) {
      if (!q.ok) {
        root.append(h('div', { class: 'row bad' }, h('div', null, h('div', { class: 'nm' }, q.name), h('div', { class: 'sub' }, q.symbol)), h('div', { class: 'sub' }, 'brak danych')));
        continue;
      }
      root.append(h('div', { class: 'row' },
        h('div', null, h('div', { class: 'nm' }, q.name), h('div', { class: 'sub' }, `${q.symbol}${q.currency ? ' · ' + q.currency : ''} · 1 mies. `, h('span', { class: pctClassFor(q.asset, q.m1) }, fmtPct(q.m1)))),
        h('div', { class: 'px' }, h('b', null, fmtNum(q.price)), h('span', { class: pctClassFor(q.asset, q.d1) }, fmtPct(q.d1))),
        sparkline(q.spark, q.m1 >= 0, Boolean(amap[q.asset]?.note)),
      ));
    }
  }
}

// ---------- całość ----------
function renderAll() {
  const t = state.news?.updated || state.prices?.updated;
  $('#updated').textContent = t
    ? `Dane z ${new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    : 'Brak danych';
  renderOverview();
  renderNews();
  renderPrices();
}

function setTab(tab) {
  state.tab = tab;
  safeSet('tab', tab);
  for (const b of document.querySelectorAll('.tab')) {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  for (const id of ['overview', 'news', 'prices']) $('#view-' + id).hidden = id !== tab;
  window.scrollTo({ top: 0 });
}

function init() {
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#refresh').addEventListener('click', load);
  const saved = safeGet('tab', 'overview');
  setTab(['overview', 'news', 'prices'].includes(saved) ? saved : 'overview');
  renderAll();
  load();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - state.loadedAt > 5 * 60 * 1000) load();
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

init();
