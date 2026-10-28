import { RULES, POS_WORDS, NEG_WORDS } from './rules.js';

const HOUR = 3600 * 1000;

function countMatches(re, text) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return (text.match(g) || []).length;
}

export function tone(text) {
  const score = countMatches(POS_WORDS, text) - countMatches(NEG_WORDS, text);
  return score > 0 ? 'up' : score < 0 ? 'down' : 'mixed';
}

function ruleMatches(rule, text) {
  if (rule.all && !rule.all.every((re) => re.test(text))) return false;
  if (rule.any && !rule.any.some((re) => re.test(text))) return false;
  return Boolean(rule.all || rule.any);
}

// Dla jednej wiadomości zwraca: tematy, surowe wpływy (z informacją o temacie) i scalone "chipy" do wyświetlenia.
export function classify(item) {
  const text = `${item.title || ''}. ${item.summary || ''}`;
  const themes = [];
  const impacts = [];
  const t = tone(text);

  for (const rule of RULES) {
    if (!ruleMatches(rule, text)) continue;
    themes.push({ id: rule.id, label: rule.label });
    for (const [asset, dir, why] of rule.impacts) {
      impacts.push({ asset, dir: dir === 'tone' ? t : dir, why, theme: rule.id });
    }
  }

  // Scalanie: jeśli różne reguły dają przeciwne kierunki dla tego samego aktywa -> "mixed".
  const byAsset = new Map();
  for (const imp of impacts) {
    const cur = byAsset.get(imp.asset) || { asset: imp.asset, dirs: new Set(), whys: [] };
    cur.dirs.add(imp.dir);
    if (!cur.whys.includes(imp.why)) cur.whys.push(imp.why);
    byAsset.set(imp.asset, cur);
  }
  const chips = [...byAsset.values()].map((c) => ({
    asset: c.asset,
    dir: c.dirs.size === 1 ? [...c.dirs][0] : 'mixed',
    why: c.whys.slice(0, 2).join(' '),
  }));

  return { themes, impacts, chips };
}

// Zbiera sygnały z ostatnich ~48 godzin.
// Zasada: ten sam temat opisany przez wiele źródeł liczy się mocniej, ale z limitem (max 3),
// żeby jedna głośna wiadomość nie przykryła wszystkiego.
export function buildSignals(items, now = Date.now(), windowHours = 48) {
  const cutoff = now - windowHours * HOUR;
  const groups = new Map(); // "asset|theme" -> dane

  for (const it of items) {
    if (it.published && it.published < cutoff) continue;
    for (const imp of it.impacts || []) {
      const key = `${imp.asset}|${imp.theme}`;
      let g = groups.get(key);
      if (!g) {
        g = { asset: imp.asset, theme: imp.theme, votes: { up: 0, down: 0, mixed: 0 }, sources: new Set(), headlines: [], why: imp.why };
        groups.set(key, g);
      }
      g.votes[imp.dir] += 1;
      g.sources.add(it.source);
      if (g.headlines.length < 3) g.headlines.push({ title: it.title, link: it.link, source: it.source });
    }
  }

  const labelOf = Object.fromEntries(RULES.map((r) => [r.id, r.label]));
  const assets = new Map();

  for (const g of groups.values()) {
    const { up, down, mixed } = g.votes;
    const dir = up > down && up >= mixed ? 'up' : down > up && down >= mixed ? 'down' : 'mixed';
    const weight = Math.min(g.sources.size, 3);
    const a = assets.get(g.asset) || { asset: g.asset, up: 0, down: 0, mixed: 0, reasons: [] };
    a[dir] += weight;
    a.reasons.push({ theme: g.theme, label: labelOf[g.theme] || g.theme, dir, weight, why: g.why, headlines: g.headlines });
    assets.set(g.asset, a);
  }

  return [...assets.values()]
    .map((a) => ({
      ...a,
      score: a.up - a.down,
      reasons: a.reasons.sort((x, y) => y.weight - x.weight).slice(0, 5),
    }))
    .sort((x, y) => Math.abs(y.score) + y.mixed * 0.1 - (Math.abs(x.score) + x.mixed * 0.1));
}
