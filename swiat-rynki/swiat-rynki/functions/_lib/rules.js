// Reguły: jakie wydarzenia (po słowach kluczowych, PL + EN) mogą wpływać na jakie aktywa.
//
// To są ZASADY OGÓLNE, nie prognozy. Rynek często reaguje inaczej, niż sugeruje schemat,
// a reakcja bywa już "wliczona w cenę" zanim przeczytasz wiadomość.
//
// Składnia słów kluczowych (funkcja w()):
//   'iran*'  -> słowo zaczynające się od "iran" (Iran, Iranian, Irana, ...)
//   'war'    -> dokładnie słowo "war" (nie "warning")
//   'red sea'-> fraza

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // (myślnik poza klasą znaków nie wymaga ucieczki)
}

export function w(...terms) {
  const parts = terms.map((t) => {
    // każda gwiazdka = "dowolne dalsze litery" (także w środku frazy)
    const base = t.split('*').map(esc).join('\\p{L}*').replace(/\s+/g, '\\s+');
    return t.endsWith('*') ? base : `${base}(?!\\p{L})`;
  });
  return new RegExp(`(?<!\\p{L})(?:${parts.join('|')})`, 'iu');
}

const CONFLICT = w(
  'war', 'wars', 'attack*', 'strike', 'strikes', 'struck', 'missile*', 'troops', 'invasion', 'invade*',
  'airstrike*', 'drone*', 'shelling', 'bomb*', 'offensive', 'clashes', 'escalat*', 'conflict*', 'killed', 'retaliat*',
  'wojn*', 'atak*', 'rakiet*', 'inwazj*', 'ostrzał*', 'nalot*', 'dron*', 'eskalacj*', 'bombard*', 'walki', 'konflikt*', 'zabit*',
);

// Globalne banki centralne (wpływ na dolara, akcje, obligacje, złoto...)
const CENTRAL_BANK = w(
  'fed', 'federal reserve', 'powell', 'ecb', 'lagarde', 'central bank*', 'bank of england', 'boj', 'fomc',
  'ezb', 'bank* centraln*',
);

// Polski bank centralny (wpływ głównie na złotego i polskie akcje)
const POLISH_CB = w('rpp', 'nbp', 'glapiński', 'glapinski', 'rad* polityki pieniężnej');

const RATE_UP = w('rate hike*', 'raise* rates', 'raising rates', 'hawkish', 'higher for longer', 'tighten*', 'podwyżk* stóp', 'podwyższ* stop*', 'jastrzęb*', 'zaostrz*');
const RATE_DOWN = w('rate cut*', 'cut* rates', 'cutting rates', 'dovish', 'lower rates', 'easing', 'obniżk* stóp', 'obniż* stop*', 'obniżył* stop*', 'gołębi*');

export const POS_WORDS = w(
  'surge*', 'jump*', 'soar*', 'rally', 'rallies', 'record', 'beat*', 'gain*', 'rise', 'rises', 'rising', 'boom',
  'growth', 'upgrade*', 'approve*', 'rebound*', 'recover*',
  'wzrost*', 'rośnie', 'rosną', 'rekord*', 'zysk*', 'odbicie', 'odbija', 'poprawa', 'zwyżk*',
);

export const NEG_WORDS = w(
  'plunge*', 'fall', 'falls', 'falling', 'fell', 'drop*', 'slump*', 'crash*', 'miss', 'misses', 'loss', 'losses',
  'fear*', 'warning', 'warns', 'ban', 'bans', 'banned', 'probe', 'lawsuit', 'selloff', 'sell-off', 'tumble*',
  'decline*', 'downgrade*', 'hack*', 'fraud',
  'spadek', 'spadki', 'spada', 'spadają', 'strat*', 'ostrzega*', 'zakaz*', 'kryzys*', 'krach*', 'załamanie', 'obniżk*', 'oszustw*',
);

// impacts: [aktywo, kierunek, uzasadnienie]
//   kierunek: 'up' | 'down' | 'mixed' | 'tone'
//   'tone' = kierunek zależy od tonu nagłówka (pozytywny -> up, negatywny -> down, inaczej mixed)
export const RULES = [
  {
    id: 'mideast',
    label: 'Konflikt na Bliskim Wschodzie',
    all: [
      w('iran*', 'israel*', 'izrael*', 'gaza', 'gazy', 'hormuz', 'ormuz*', 'red sea', 'morze czerwone', 'morza czerwonego',
        'houthi*', 'huti', 'yemen', 'jemen*', 'lebanon', 'liban*', 'hezbollah*', 'hamas', 'syria*', 'saudi*',
        'arabia saudyjska', 'arabii saudyjskiej', 'tehran', 'teheran*', 'iraq', 'irak*'),
      CONFLICT,
    ],
    impacts: [
      ['ropa', 'up', 'Region produkuje dużo ropy i leży na ważnych szlakach – ryzyko przerw w dostawach podnosi ceny.'],
      ['gaz', 'up', 'Ryzyko dla dostaw gazu LNG i szlaków morskich.'],
      ['zloto', 'up', 'Niepewność geopolityczna zwykle zwiększa popyt na „bezpieczne przystanie”.'],
      ['obronnosc', 'up', 'Konflikty zwykle zwiększają zamówienia na uzbrojenie.'],
      ['transport', 'down', 'Droższe paliwo i zakłócone trasy obciążają linie lotnicze i transport.'],
      ['akcje_usa', 'down', 'Rosnąca niepewność zwykle osłabia nastroje na giełdach.'],
    ],
  },
  {
    id: 'ru_ua',
    label: 'Wojna w Ukrainie / napięcia z Rosją',
    all: [
      w('russia*', 'russian*', 'ukrain*', 'putin*', 'kremlin', 'moscow', 'kyiv', 'kiev', 'rosj*', 'rosyjsk*', 'kijów', 'kijow*',
        'kreml*', 'moskw*', 'zełensk*', 'zelensk*', 'donbas*'),
      CONFLICT,
    ],
    impacts: [
      ['gaz', 'up', 'Europa jest wrażliwa na przerwy w dostawach gazu.'],
      ['zboza', 'up', 'Rosja i Ukraina to wielcy eksporterzy pszenicy i kukurydzy.'],
      ['obronnosc', 'up', 'Wyższe wydatki zbrojeniowe w Europie i NATO.'],
      ['zloto', 'up', 'Popyt na bezpieczne aktywa.'],
      ['akcje_europa', 'down', 'Europa jest bliżej konfliktu i bardziej narażona gospodarczo.'],
      ['akcje_pl', 'down', 'Polska graniczy z regionem konfliktu – inwestorzy żądają wyższej premii za ryzyko.'],
      ['pln', 'down', 'Ryzyko regionalne zwykle osłabia złotego.'],
    ],
  },
  {
    id: 'peace',
    label: 'Rozejm / rozmowy pokojowe',
    any: [w('ceasefire', 'cease-fire', 'peace deal', 'peace talks', 'peace agreement', 'truce', 'rozejm*', 'zawieszeni* broni', 'rozmow* pokojow*', 'porozumieni* pokojow*')],
    impacts: [
      ['ropa', 'down', 'Mniejsze ryzyko przerw w dostawach.'],
      ['gaz', 'down', 'Mniejsze ryzyko dla dostaw.'],
      ['zloto', 'down', 'Mniejszy popyt na bezpieczne przystanie.'],
      ['obronnosc', 'down', 'Mniej powodów do wzrostu zamówień zbrojeniowych.'],
      ['akcje_europa', 'up', 'Niższa niepewność sprzyja akcjom.'],
      ['akcje_pl', 'up', 'Niższa premia za ryzyko regionalne.'],
    ],
  },
  {
    id: 'sanctions',
    label: 'Sankcje / embargo',
    any: [w('sanction*', 'embargo*', 'price cap', 'sankcj*', 'limit cen')],
    impacts: [
      ['ropa', 'up', 'Sankcje na eksporterów ograniczają podaż lub komplikują handel.'],
      ['gaz', 'up', 'Podobnie – ograniczenia handlu energią podnoszą ceny.'],
      ['zboza', 'mixed', 'Zależy, czy sankcje dotykają rolnictwa i logistyki.'],
    ],
  },
  {
    id: 'opec',
    label: 'OPEC / podaż ropy',
    any: [w('opec*', 'oil output', 'oil production', 'production cut*', 'output cut*', 'wydobyci* rop*', 'cięci* produkcji')],
    impacts: [
      ['ropa', 'mixed', 'Cięcia produkcji zwykle podnoszą ceny, zwiększanie wydobycia – obniża. Sprawdź treść wiadomości.'],
      ['transport', 'mixed', 'Droższa ropa obciąża transport, tańsza – pomaga.'],
    ],
  },
  {
    id: 'oil_disruption',
    label: 'Przerwa w dostawach ropy / awaria',
    all: [
      w('oil', 'crude', 'refiner*', 'pipeline*', 'tanker*', 'ropa', 'ropy', 'ropie', 'ropę', 'ropą', 'rafineri*', 'tankowc*', 'ropociąg*'),
      w('outage*', 'halt*', 'explosion*', 'fire', 'disrupt*', 'shutdown*', 'blockade*', 'attack*', 'awari*', 'pożar*', 'wstrzym*', 'atak*', 'blokad*', 'przerw*'),
    ],
    impacts: [
      ['ropa', 'up', 'Mniejsza dostępna podaż podnosi ceny.'],
      ['transport', 'down', 'Droższe paliwo.'],
    ],
  },
  {
    id: 'oil_glut',
    label: 'Nadpodaż ropy',
    any: [w('oil glut', 'oil surplus', 'oversupply', 'inventories rise', 'inventories build', 'stockpiles rise', 'nadpodaż*', 'rosną zapasy', 'wzrost zapasów rop*')],
    impacts: [
      ['ropa', 'down', 'Więcej ropy niż popytu obniża ceny.'],
      ['transport', 'up', 'Tańsze paliwo poprawia marże przewoźników.'],
    ],
  },
  {
    id: 'gas_supply',
    label: 'Zakłócenia dostaw gazu',
    all: [
      w('gas', 'lng', 'pipeline*', 'gaz', 'gazu', 'gazie', 'gazem', 'gazow*', 'gazociąg*'),
      w('cut*', 'halt*', 'shutdown*', 'outage*', 'disrupt*', 'shortage*', 'wstrzym*', 'odcięt*', 'odcięci*', 'awari*', 'przerw*', 'niedobór*', 'niedobor*'),
    ],
    impacts: [
      ['gaz', 'up', 'Mniejsza podaż podnosi ceny, szczególnie w Europie.'],
      ['akcje_europa', 'down', 'Droższa energia obciąża przemysł.'],
    ],
  },
  {
    id: 'hurricane',
    label: 'Huragan / burza w rejonie wydobycia',
    all: [
      w('hurricane*', 'tropical storm*', 'huragan*'),
      w('gulf', 'texas', 'louisiana', 'zatok* meksyka*'),
    ],
    impacts: [
      ['ropa', 'up', 'Zatoka Meksykańska to ważny rejon wydobycia i rafinacji.'],
      ['gaz', 'up', 'Ryzyko dla wydobycia i terminali LNG.'],
    ],
  },
  {
    id: 'rates_up',
    label: 'Presja na podwyżki stóp / „jastrzębie” banki centralne',
    all: [CENTRAL_BANK, RATE_UP],
    impacts: [
      ['akcje_usa', 'down', 'Droższy kredyt obniża wyceny firm.'],
      ['technologia', 'down', 'Spółki wzrostowe są szczególnie wrażliwe na wyższe stopy.'],
      ['krypto', 'down', 'Aktywa ryzykowne zwykle tracą przy wyższych stopach.'],
      ['obligacje', 'down', 'Wyższe stopy obniżają ceny istniejących obligacji.'],
      ['zloto', 'down', 'Wyższe stopy zwiększają atrakcyjność lokat względem złota (które nie płaci odsetek).'],
      ['usd', 'up', 'Wyższe stopy przyciągają kapitał do dolara.'],
      ['banki', 'up', 'Banki zwykle zyskują na wyższej marży odsetkowej.'],
    ],
  },
  {
    id: 'rates_down',
    label: 'Obniżki stóp / „gołębie” banki centralne',
    all: [CENTRAL_BANK, RATE_DOWN],
    impacts: [
      ['akcje_usa', 'up', 'Tańszy kredyt zwykle wspiera wyceny.'],
      ['technologia', 'up', 'Spółki wzrostowe zyskują na niższych stopach.'],
      ['krypto', 'up', 'Aktywa ryzykowne zwykle zyskują.'],
      ['obligacje', 'up', 'Niższe stopy podnoszą ceny istniejących obligacji.'],
      ['zloto', 'up', 'Niższe stopy zmniejszają koszt trzymania złota.'],
      ['usd', 'down', 'Niższe stopy osłabiają dolara.'],
      ['pln', 'up', 'Słabszy dolar i apetyt na ryzyko zwykle wspierają złotego.'],
    ],
  },
  {
    id: 'pl_rates_down',
    label: 'RPP / NBP – obniżki stóp w Polsce',
    all: [POLISH_CB, RATE_DOWN],
    impacts: [
      ['pln', 'down', 'Niższe stopy zmniejszają atrakcyjność złotego dla inwestorów szukających oprocentowania.'],
      ['akcje_pl', 'up', 'Tańszy kredyt zwykle wspiera polskie spółki.'],
      ['banki', 'mixed', 'Niższe stopy zmniejszają marże banków, ale mogą ożywić akcję kredytową.'],
    ],
  },
  {
    id: 'pl_rates_up',
    label: 'RPP / NBP – podwyżki stóp w Polsce',
    all: [POLISH_CB, RATE_UP],
    impacts: [
      ['pln', 'up', 'Wyższe stopy zwykle wzmacniają złotego.'],
      ['akcje_pl', 'down', 'Droższy kredyt obciąża spółki.'],
      ['banki', 'up', 'Wyższe marże odsetkowe.'],
    ],
  },
  {
    id: 'inflation',
    label: 'Inflacja',
    any: [w('inflation*', 'cpi', 'consumer prices', 'inflacj*', 'ceny konsumpcyjne')],
    impacts: [
      ['zloto', 'mixed', 'Wysoka inflacja bywa wsparciem dla złota, ale wymusza też wyższe stopy, które mu szkodzą.'],
      ['obligacje', 'mixed', 'Wyższa inflacja zwykle obniża ceny obligacji, niższa – podnosi.'],
      ['akcje_usa', 'mixed', 'Reakcja zależy od tego, czy dane są lepsze czy gorsze od oczekiwań.'],
    ],
  },
  {
    id: 'recession',
    label: 'Obawy o recesję / słabe dane',
    any: [w('recession*', 'economy shrinks', 'gdp contraction', 'unemployment rises', 'unemployment jumps', 'job losses', 'layoffs surge', 'recesj*', 'spadek pkb', 'bezrobocie rośnie', 'wzrost bezrobocia', 'masowe zwolnienia')],
    impacts: [
      ['akcje_usa', 'down', 'Słabsza gospodarka obniża zyski firm.'],
      ['akcje_europa', 'down', 'Jak wyżej.'],
      ['ropa', 'down', 'Mniejszy popyt na energię.'],
      ['miedz', 'down', 'Miedź jest wrażliwa na kondycję przemysłu („doktor Miedź”).'],
      ['zloto', 'up', 'Popyt na bezpieczne aktywa.'],
      ['obligacje', 'up', 'Inwestorzy uciekają do obligacji, a banki centralne mogą ciąć stopy.'],
      ['transport', 'down', 'Mniej podróży i handlu.'],
    ],
  },
  {
    id: 'growth',
    label: 'Silne dane z gospodarki',
    any: [w('gdp growth', 'economy grows', 'strong jobs', 'jobs report beat*', 'robust growth', 'wzrost pkb', 'silny rynek pracy', 'dobre dane z gospodarki')],
    impacts: [
      ['akcje_usa', 'up', 'Lepsza koniunktura wspiera zyski firm.'],
      ['miedz', 'up', 'Większy popyt przemysłowy.'],
      ['ropa', 'up', 'Większy popyt na energię.'],
      ['transport', 'up', 'Więcej podróży i handlu.'],
    ],
  },
  {
    id: 'tariffs',
    label: 'Cła / wojna handlowa',
    any: [w('tariff*', 'trade war*', 'trade tension*', 'export control*', 'trade barrier*', 'cła', 'cło', 'cłow*', 'wojn* handlow*', 'ograniczeni* eksportu')],
    impacts: [
      ['akcje_usa', 'down', 'Cła podnoszą koszty firm i hamują handel.'],
      ['technologia', 'down', 'Łańcuchy dostaw i ograniczenia eksportu uderzają w sektor technologiczny.'],
      ['miedz', 'down', 'Handel światowy słabnie, a miedź to metal przemysłowy.'],
      ['zboza', 'mixed', 'Odwety handlowe często uderzają w rolnictwo.'],
      ['zloto', 'up', 'Niepewność zwiększa popyt na bezpieczne aktywa.'],
    ],
  },
  {
    id: 'china',
    label: 'Chiny – gospodarka',
    all: [
      w('china', 'chinese', 'beijing', 'chiny', 'chin', 'chinach', 'chińsk*', 'pekin*'),
      w('stimulus', 'growth', 'slowdown', 'property', 'evergrande', 'demand', 'pmi', 'exports', 'imports', 'stymul*', 'zwolnieni*', 'popyt', 'nieruchomo*', 'eksport*', 'import*'),
    ],
    impacts: [
      ['miedz', 'mixed', 'Chiny to największy odbiorca miedzi: dobre dane podnoszą cenę, słabe – obniżają.'],
      ['ropa', 'mixed', 'Chiny to duży importer ropy – popyt zależy od ich koniunktury.'],
      ['akcje_europa', 'mixed', 'Europejskie firmy eksportujące do Chin są wrażliwe na ich koniunkturę.'],
    ],
  },
  {
    id: 'taiwan',
    label: 'Napięcia wokół Tajwanu',
    all: [
      w('taiwan*', 'tajwan*'),
      w('tension*', 'drills', 'blockade*', 'invasion', 'military', 'warship*', 'napięci*', 'blokad*', 'manewr*', 'wojsk*'),
    ],
    impacts: [
      ['technologia', 'down', 'Tajwan produkuje większość zaawansowanych chipów – ryzyko dla łańcuchów dostaw.'],
      ['akcje_usa', 'down', 'Niepewność i zależność od chipów.'],
      ['obronnosc', 'up', 'Wyższe wydatki zbrojeniowe.'],
      ['zloto', 'up', 'Popyt na bezpieczne aktywa.'],
    ],
  },
  {
    id: 'ai_chips',
    label: 'Sztuczna inteligencja / chipy',
    any: [w('nvidia', 'ai chip*', 'ai spending', 'semiconductor*', 'chipmaker*', 'artificial intelligence', 'openai', 'sztuczn* inteligencj*', 'półprzewodnik*')],
    impacts: [
      ['technologia', 'tone', 'Dobre wieści (zamówienia, wyniki) wspierają sektor, złe (regulacje, ograniczenia) – obciążają.'],
    ],
  },
  {
    id: 'crypto',
    label: 'Kryptowaluty',
    any: [w('bitcoin', 'btc', 'ethereum', 'crypto*', 'krypto*', 'stablecoin*', 'bitcoina', 'ethereum*')],
    impacts: [
      ['krypto', 'tone', 'Kierunek zależy od tonu wiadomości (regulacje, napływy do ETF, hacki).'],
    ],
  },
  {
    id: 'bank_stress',
    label: 'Kłopoty banków',
    any: [w('bank run*', 'bank collapse*', 'bank failure*', 'banking crisis', 'credit crunch', 'upadłość banku', 'upadek banku', 'kryzys bankow*')],
    impacts: [
      ['banki', 'down', 'Obawy o stabilność sektora.'],
      ['akcje_usa', 'down', 'Ryzyko zarażenia całego rynku.'],
      ['zloto', 'up', 'Ucieczka do bezpiecznych aktywów.'],
      ['obligacje', 'up', 'Ucieczka do bezpiecznych obligacji rządowych.'],
    ],
  },
  {
    id: 'gold_demand',
    label: 'Popyt na złoto / banki centralne',
    any: [w('central banks buy*', 'central bank buying', 'gold record', 'gold rally', 'record gold', 'gold hits', 'banki centralne kupują', 'złoto rekord*', 'rekord* złot*')],
    impacts: [['zloto', 'up', 'Silny popyt i rekordy zwykle przyciągają kolejnych kupujących (ale po dużych wzrostach rośnie też ryzyko korekty).']],
  },
  {
    id: 'mining',
    label: 'Strajki / problemy w kopalniach',
    all: [
      w('mine', 'mines', 'mining', 'copper', 'kopalni*', 'kopalń', 'miedź', 'miedzi'),
      w('strike', 'strikes', 'closure*', 'shortage*', 'shutdown*', 'landslide', 'strajk*', 'niedobór*', 'zamknięci*', 'awari*'),
    ],
    impacts: [
      ['miedz', 'up', 'Mniejsza podaż podnosi cenę.'],
      ['srebro', 'up', 'Srebro często jest wydobywane razem z miedzią i innymi metalami.'],
    ],
  },
  {
    id: 'shipping',
    label: 'Zakłócenia w żegludze i portach',
    any: [w('suez', 'panama canal', 'shipping disruption*', 'port strike*', 'freight rates', 'kanał sueski', 'kanału sueskiego', 'strajk* w portach', 'stawki frachtowe')],
    impacts: [
      ['transport', 'down', 'Dłuższe trasy i droższy fracht.'],
      ['ropa', 'mixed', 'Przekierowanie statków zwiększa zużycie paliwa, ale zakłóca też handel.'],
    ],
  },
  {
    id: 'agri_bad',
    label: 'Susza / powódź / słabe zbiory',
    any: [w('drought*', 'heatwave*', 'flood*', 'crop failure*', 'crop damage', 'poor harvest', 'el niño', 'el nino', 'susz*', 'powodz*', 'powódź', 'powodzi*', 'nieurodzaj*', 'słabe zbiory', 'klęsk* urodzaju')],
    impacts: [['zboza', 'up', 'Mniejsze zbiory ograniczają podaż i podnoszą ceny.']],
  },
  {
    id: 'agri_good',
    label: 'Rekordowe zbiory',
    any: [w('record harvest*', 'bumper crop*', 'bumper harvest*', 'good harvest', 'rekordow* zbior*', 'dobre zbiory')],
    impacts: [['zboza', 'down', 'Duża podaż obniża ceny.']],
  },
  {
    id: 'pandemic',
    label: 'Epidemia / pandemia',
    any: [w('outbreak*', 'pandemic*', 'epidemic*', 'new virus', 'virus spreads', 'epidemi*', 'pandemi*', 'ognisko wirusa', 'nowy wirus')],
    impacts: [
      ['akcje_usa', 'down', 'Ryzyko dla popytu i łańcuchów dostaw.'],
      ['transport', 'down', 'Ograniczenia w podróżowaniu.'],
      ['ropa', 'down', 'Mniejszy popyt na paliwa.'],
      ['zloto', 'up', 'Popyt na bezpieczne aktywa.'],
    ],
  },
  {
    id: 'energy_transition',
    label: 'Energia odnawialna / elektromobilność',
    any: [w('solar', 'wind farm*', 'offshore wind', 'renewable*', 'ev sales', 'electric vehicle*', 'lithium', 'fotowolta*', 'odnawialn*', 'elektromobilno*', 'samochod* elektryczn*')],
    impacts: [
      ['odnawialne', 'tone', 'Kierunek zależy od tonu (dotacje, nowe projekty vs. cofnięcie wsparcia, spadek sprzedaży).'],
      ['miedz', 'mixed', 'Transformacja energetyczna zwiększa zapotrzebowanie na miedź w długim terminie.'],
    ],
  },
  {
    id: 'strong_dollar',
    label: 'Silny dolar',
    any: [w('dollar surges', 'dollar strengthens', 'strong dollar', 'dollar rally', 'dollar jumps', 'silny dolar', 'umocnienie dolara', 'dolar zyskuje')],
    impacts: [
      ['usd', 'up', 'Z definicji – dolar zyskuje.'],
      ['zloto', 'down', 'Złoto jest wyceniane w dolarach – silniejszy dolar je zwykle obciąża.'],
      ['pln', 'down', 'Silny dolar zwykle oznacza słabszego złotego.'],
    ],
  },
  {
    id: 'poland_macro',
    label: 'Polska – gospodarka / NBP / rating',
    all: [
      w('poland', 'polish', 'polska', 'polski', 'polskie', 'polskiej', 'nbp', 'rpp', 'złoty', 'zloty', 'złotego'),
      w('rate*', 'inflation', 'rating*', 'deficit', 'budget', 'stóp*', 'inflacj*', 'deficyt*', 'budżet*'),
    ],
    impacts: [
      ['pln', 'mixed', 'Decyzje RPP, inflacja i rating wpływają na kurs złotego – kierunek zależy od treści.'],
      ['akcje_pl', 'mixed', 'Jak wyżej – zależy od treści informacji.'],
    ],
  },
  {
    id: 'elections',
    label: 'Wybory / zmiany polityczne',
    any: [w('election*', 'referendum*', 'snap vote', 'wybor*')],
    impacts: [['akcje_usa', 'mixed', 'Wybory zwykle zwiększają zmienność – kierunek zależy od wyniku i oczekiwań rynku.']],
  },
];
