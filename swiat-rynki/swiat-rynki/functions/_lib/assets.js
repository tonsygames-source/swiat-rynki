// Lista aktywów, które aplikacja obserwuje, oraz symbole cen (Yahoo Finance).
// Chcesz dodać coś swojego? Dopisz nowy wpis tutaj (i ewentualnie w rules.js).

export const ASSETS = [
  { id: 'ropa', name: 'Ropa naftowa', group: 'Surowce', symbols: [{ s: 'CL=F', n: 'Ropa WTI' }, { s: 'BZ=F', n: 'Ropa Brent' }] },
  { id: 'gaz', name: 'Gaz ziemny', group: 'Surowce', symbols: [{ s: 'NG=F', n: 'Gaz USA (Henry Hub)' }, { s: 'TTF=F', n: 'Gaz Europa (TTF)' }] },
  { id: 'zloto', name: 'Złoto', group: 'Surowce', symbols: [{ s: 'GC=F', n: 'Złoto' }] },
  { id: 'srebro', name: 'Srebro', group: 'Surowce', symbols: [{ s: 'SI=F', n: 'Srebro' }] },
  { id: 'miedz', name: 'Miedź', group: 'Surowce', symbols: [{ s: 'HG=F', n: 'Miedź' }] },
  { id: 'zboza', name: 'Zboża', group: 'Surowce', symbols: [{ s: 'ZW=F', n: 'Pszenica' }, { s: 'ZC=F', n: 'Kukurydza' }] },

  { id: 'usd', name: 'Dolar (USD)', group: 'Waluty', symbols: [{ s: 'DX-Y.NYB', n: 'Indeks dolara' }] },
  { id: 'pln', name: 'Złoty (PLN)', group: 'Waluty', symbols: [{ s: 'PLN=X', n: 'USD/PLN' }, { s: 'EURPLN=X', n: 'EUR/PLN' }], note: 'Kurs pokazuje, ile złotych kosztuje 1 USD / 1 EUR. Wzrost kursu = słabszy złoty.' },

  { id: 'akcje_usa', name: 'Akcje USA', group: 'Akcje', symbols: [{ s: '^GSPC', n: 'S&P 500' }] },
  { id: 'akcje_europa', name: 'Akcje Europa', group: 'Akcje', symbols: [{ s: '^STOXX50E', n: 'Euro Stoxx 50' }, { s: '^GDAXI', n: 'DAX' }] },
  { id: 'akcje_pl', name: 'Akcje Polska', group: 'Akcje', symbols: [{ s: 'WIG20.WA', n: 'WIG20' }] },
  { id: 'technologia', name: 'Technologia', group: 'Akcje', symbols: [{ s: '^NDX', n: 'Nasdaq 100' }] },
  { id: 'obronnosc', name: 'Obronność', group: 'Akcje', symbols: [{ s: 'ITA', n: 'ETF lotnictwo i obronność (ITA)' }] },
  { id: 'banki', name: 'Banki', group: 'Akcje', symbols: [{ s: 'KBE', n: 'ETF banki (KBE)' }] },
  { id: 'transport', name: 'Linie lotnicze i transport', group: 'Akcje', symbols: [{ s: 'JETS', n: 'ETF linie lotnicze (JETS)' }] },
  { id: 'odnawialne', name: 'Energia odnawialna', group: 'Akcje', symbols: [{ s: 'ICLN', n: 'ETF czysta energia (ICLN)' }] },

  { id: 'krypto', name: 'Kryptowaluty', group: 'Krypto', symbols: [{ s: 'BTC-USD', n: 'Bitcoin' }, { s: 'ETH-USD', n: 'Ethereum' }] },
  { id: 'obligacje', name: 'Obligacje USA', group: 'Obligacje', symbols: [{ s: '^TNX', n: 'Rentowność 10 lat USA (%)' }], note: 'Strzałki dotyczą CEN obligacji. Cena obligacji rośnie, gdy rentowność (pokazana obok) spada.' },
];

export const ASSET_BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a]));
