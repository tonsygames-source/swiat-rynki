# Świat → Rynki

Aplikacja, która zbiera wiadomości ze świata (po polsku i angielsku) z kilkunastu publicznych źródeł,
rozpoznaje, jakich tematów dotyczą, i pokazuje, **które aktywa mogą na tym zyskać lub stracić** –
razem z aktualnymi cenami. Działa jak zwykła aplikacja na iPhonie (PWA) i na komputerze.

> ⚠️ **To nie jest porada inwestycyjna ani prognoza.** Powiązania „wydarzenie → aktywo” to ogólne zasady
> oparte na słowach kluczowych. Rynki często reagują inaczej, a informacja bywa już „wliczona w cenę”,
> zanim ją przeczytasz. Traktuj aplikację jako ściągawkę do własnego myślenia, nie jako sygnał kup/sprzedaj.

## Co jest w środku

```
public/            ← to, co widzisz w telefonie (strona + ikony)
functions/api/     ← serwer: news.js (wiadomości), prices.js (ceny)
functions/_lib/    ← logika: rules.js (reguły), assets.js (aktywa), rss.js (źródła)
tests/             ← testy (npm test)
```

Ekrany: **Przegląd** (co może zyskać / stracić i dlaczego), **Wiadomości** (z filtrami), **Ceny** (z wykresami miesięcznymi).

## Jak to uruchomić (za darmo) – krok po kroku

Potrzebujesz darmowych kont na **GitHub** i **Cloudflare**. Całość zajmuje ok. 15 minut.

### 1. Wrzuć projekt na GitHub
1. Rozpakuj `swiat-rynki.zip` na komputerze.
2. Wejdź na github.com → **New repository** → nazwa np. `swiat-rynki` → **Create repository**.
3. Kliknij **uploading an existing file**, przeciągnij **całą zawartość folderu** `swiat-rynki`
   (foldery `public`, `functions`, `tests` i pliki obok nich) i kliknij **Commit changes**.
   Sprawdź, że w repozytorium widać foldery `public` i `functions` na samym wierzchu.

### 2. Opublikuj na Cloudflare Pages
1. Wejdź na dash.cloudflare.com → **Workers & Pages** → **Create** → zakładka **Pages** → **Connect to Git**.
2. Wybierz repozytorium `swiat-rynki`.
3. Ustawienia budowania:
   - **Framework preset:** None
   - **Build command:** (zostaw puste)
   - **Build output directory:** `public`
4. **Save and Deploy**. Po minucie dostaniesz adres w stylu `https://swiat-rynki.pages.dev`.

Folder `functions` Cloudflare wykrywa sam – to on odpowiada za pobieranie wiadomości i cen.

### 3. Dodaj aplikację do iPhone’a
1. Otwórz swój adres w **Safari** (musi być Safari, nie Chrome).
2. Kliknij przycisk **Udostępnij** (kwadrat ze strzałką) → **Dodaj do ekranu początkowego**.
3. Gotowe – ikona na ekranie głównym otwiera aplikację na pełnym ekranie.

### (Opcjonalnie) Uruchomienie na własnym komputerze
Wymaga Node.js 18+:
```
npx wrangler pages dev public
```
Potem otwórz http://localhost:8788.

## Jak to działa

1. **Wiadomości:** serwer pobiera kanały RSS (BBC, Guardian, Al Jazeera, DW, CNBC, NPR, Bankier, Rzeczpospolita, TVN24),
   usuwa duplikaty i zapamiętuje wynik na 5 minut.
2. **Rozpoznawanie tematów:** każdy nagłówek (+ krótki opis) jest porównywany z regułami z `functions/_lib/rules.js`
   (np. „konflikt na Bliskim Wschodzie” → ropa ▲, gaz ▲, złoto ▲, linie lotnicze ▼).
   Dla części tematów kierunek zależy od tonu nagłówka (np. Bitcoin „plunges” vs „hits record”).
3. **Przegląd:** sygnały z ostatnich 48 godzin są zliczane. Ten sam temat opisany przez kilka źródeł liczy się mocniej,
   ale z limitem (max 3), żeby jedna głośna wiadomość nie przykryła reszty.
4. **Ceny:** z Yahoo Finance (darmowe, nieoficjalne API), opóźnienie do ok. 15 minut.

## Jak to rozbudować

- **Nowe źródło wiadomości:** dopisz wiersz w `functions/_lib/rss.js` (lista `FEEDS`).
- **Nowa reguła:** dopisz blok w `functions/_lib/rules.js` (wzoruj się na istniejących). Słowa z `*` na końcu łapią końcówki
  (`'rosj*'` → Rosja, Rosji, rosyjski…).
- **Nowe aktywo:** dopisz w `functions/_lib/assets.js` (z symbolem z Yahoo Finance) i użyj jego `id` w regułach.
- Po zmianach uruchom `npm test` (testy nie wymagają internetu).

## Ograniczenia, o których warto wiedzieć

- Adresy RSS i API Yahoo bywają zmieniane lub blokowane – aplikacja pokaże w sekcji „Źródła wiadomości”, które działają,
  a pozostałe pominie. Jeśli któreś trzeba poprawić, zmieniasz jeden wiersz.
- Reguły działają na słowach kluczowych, więc mogą się mylić (np. nie zrozumieją ironii ani niuansów). Zawsze otwórz artykuł.
- Bloomberg, FT i część innych serwisów mają płatne artykuły i nie udostępniają darmowego RSS – dlatego ich nie ma na liście.
- Strzałki ▲/▼ oznaczają kierunek **możliwego** wpływu na cenę, nie jego siłę ani czas.
