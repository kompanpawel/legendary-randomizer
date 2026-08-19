# Potencjalne konflikty mechanik — analiza pod kątem losowania grup

Notatka powstała w odpowiedzi na pytanie, czy zawartość `json/keywords.json` i `json/rules.json`
wpływa na strukturę silnika losującego (`src/engine/`). Wnioski wstępne:

- Żaden plik w `src/` nie importuje `keywords.json` ani `rules.json` — to czysty glosariusz
  tekstowy (opisy słów kluczowych i zasad specjalnych), nieużywany jako dane wejściowe silnika.
- Silnik losowania grup (`SmartRandomizerEngine.ts`, `weightCalculator.ts`, `synergyEngine.ts`,
  `smartEqualizer.ts`, `dustOff.ts`) operuje na typach `VillainGroup`, `Mastermind`, `Scheme`, `Hero`
  z `src/assets/cards.json` — osobny zestaw danych, bez odwołań do treści rulebooka.
- Poniższe punkty to potencjalne konflikty mechanik, które **nie są dziś obsłużone w kodzie**
  (poza częściowym `countersNeeded` w `synergyEngine.ts`) i mogłyby stać się podstawą nowych
  reguł walidacji/wykluczeń przy losowaniu grup.

## Uwagi metodologiczne / workflow dla dalszych napraw (ważne dla przyszłych modeli)

- **Naprawiamy po jednym punkcie na raz**, w małych, w pełni przetestowanych inkrementach — nie
  łączyć kilku punktów w jednym PR/commit, żeby łatwo było zweryfikować brak regresji.
- **Komendy weryfikacyjne** (zweryfikowane, działają w tym repo na Windows/PowerShell):
  - Testy: `npm test -- --run` (Vitest) — uruchom PRZED i PO zmianie, żeby potwierdzić brak regresji.
  - Build/typecheck: `npm run build` (`tsc -b && vite build`) — jedyny sposób złapania błędów
    typów, bo `npm run lint` **nie działa** w tym środowisku (eslint nie jest zainstalowany/
    rozpoznawany — `'eslint' is not recognized`).
  - Nowe testy jednostkowe/integracyjne dodawaj w `src/engine/__tests__/*.test.ts`.
- **PUŁAPKA: `npm run migrate`** (`tsx src/utils/jsonMigration.ts`) regeneruje CAŁY
  `src/assets/cards.json` na nowo z `json/*.json`. Uruchomienie go po dodaniu jednej reguły
  detekcji w `jsonMigration.ts` wygeneruje dziesiątki/setki niepowiązanych różnic w całym pliku
  (np. dodanie brakujących `"overrides": {}`, drobne różnice w innych tagach `countersNeeded`
  wynikające z wcześniej niezauważonych niespójności) — **nie rób tego w ramach pojedynczej,
  celowanej naprawy**. Zamiast tego:
  1. Dodaj/zmień regułę detekcji w `jsonMigration.ts` (żeby przyszłe pełne regeneracje były
     poprawne — to jest "źródło prawdy" dla generowania danych),
  2. Ręcznie nanieś **dokładnie tę samą, minimalną zmianę** bezpośrednio w
     `src/assets/cards.json` za pomocą `edit` (nie przez `migrate`),
  3. Zweryfikuj `git diff src/assets/cards.json`, że zawiera WYŁĄCZNIE zamierzone linie.
  4. Jeśli przypadkiem uruchomisz `migrate` i chcesz się cofnąć: `git checkout HEAD -- src/assets/cards.json`
     przywraca plik do stanu z ostatniego commita (uwaga: to też odrzuci wcześniej wprowadzone,
     jeszcze nie scommitowane zmiany w tym pliku — nanieś je ponownie ręcznie).
- **Konwencja oznaczania napraw w tym pliku:** nagłówek punktu dostaje dopisek
  `✅ NAPRAWIONE` (lub `✅ NAPRAWIONE (częściowo — ...)` gdy tylko część punktu wymagała akcji),
  a bezpośrednio pod oryginalnym opisem problemu dodawany jest akapit **„Status:"** z konkretnymi
  ścieżkami plików, które zmieniono, oraz nazwami plików testowych, które to pokrywają.
- **Język aplikacji — OBOWIĄZKOWE:** Wszystkie teksty dodawane do kodu produkcyjnego (string
  literals w `*.ts`/`*.tsx`, klucze i wartości w `src/i18n/en.json`, komunikaty błędów, ARIA
  labels, console.logi skryptów CLI) **muszą być w języku angielskim**. Komentarze deweloperskie
  (`//` i `/** */`) mogą pozostać w języku polskim jako wewnętrzna dokumentacja, jednak nowy kod
  powinien preferować angielski dla spójności. Teksty widoczne dla użytkownika zawsze przez
  `t()` z kluczem zdefiniowanym w `src/i18n/en.json`.
- **Przydatny słownik tagów `countersNeeded` / `countersProvided`** (zebrany przez
  `node -e "require('./src/assets/cards.json')..."` przy pkt. 1-2, przydatny przy kolejnych
  punktach, żeby nie wymyślać nowych tagów, gdy pasujący już istnieje): `ambush`, `aoe`,
  `artifact-synergy`, `bystander-control`, `bystander-rescue`, `city-control`, `conqueror`,
  `dark-memories`, `deck-thinning`, `discard`, `discard-attack`, `dodge-offense`, `empowered`,
  `extra-draws`, `focus`, `heavy-hitter`, `henchman-synergy`, `location-control`, `multi-class`,
  `recruit-boost`, `savior`, `shield-synergy`, `sidekick`, `size-changing`, `time-travel`,
  `top-deck-control`, `transform`, `trap-handling`, `undercover`, `villain-ally-synergy`,
  `villain-control`, `wound-deal`, `wound-removal`, `wound-synergy`.

## 1. Adapting Masterminds vs schematy tasujące Tactics ✅ NAPRAWIONE
`rules.json` wprost ostrzega: nie używać Adapting Masterminds (Hydra Super-Adaptoid,
Sinister Six 2099) ze Schematami, które każą tasować Mastermind Tactics do innych talii kart
jednostronnych. Silnik nie ma flagi wykluczającej taką kombinację — realne ryzyko wylosowania
niegrywalnego zestawu.

**Status:** Naprawione. Dodano `src/engine/utils/mastermindSchemeConflicts.ts` wykrywający
Adapting Masterminds (po `[Adapt]` w abilities: Sinister Six 2099, Alchemax Executives,
Hydra High Council, Hydra Super-Adaptoid) oraz schematy tasujące Mastermind Tactics do
Villain Decku (Hidden Heart of Darkness). `generateSetup()` w `SmartRandomizerEngine.ts`
filtruje teraz pulę losowania tak, by ta kombinacja nigdy nie powstała losowo — chyba że
gracz ręcznie wymusi oba wybory jednocześnie (wtedy jego decyzja jest respektowana bez
filtrowania). Pokryte testami: `src/engine/__tests__/mastermindSchemeConflicts.test.ts`,
`src/engine/__tests__/generateSetup.mastermindSchemeConflict.test.ts`.

## 2. Cosmic Threat / S.H.I.E.L.D. Clearance — zależność od puli Heroes ✅ NAPRAWIONE (częściowo — Cosmic Threat był już OK)
Te mechaniki wymagają obecności konkretnych klas kart w puli (np. `[Ranged]` dla Cosmic Threat,
karty S.H.I.E.L.D./HYDRA dla S.H.I.E.L.D. Clearance), inaczej villain/mastermind staje się
praktycznie niepokonywalny. `synergyEngine.ts` ma koncepcję `countersNeeded`, ale wymaga
weryfikacji, czy pokrywa akurat te dwa keywordy.

**Status:** Zweryfikowane i naprawione.
- **Cosmic Threat** był już poprawnie pokryty: wszystkie 5 encji z `[Cosmic Threat]` (Galactus,
  Beyonder/From Beyond, Heralds of Galactus, Celestials) mają tag `multi-class` w
  `countersNeeded`, a `deriveMastermindCounters()` w `jsonMigration.ts:794` automatycznie dodaje
  ten tag przy wykryciu `[Cosmic Threat]` w opisie. Brak akcji potrzebnej.
- **S.H.I.E.L.D. Clearance miał realną lukę**: heroes mają tag `shield-synergy` (bohaterowie
  frakcji S.H.I.E.L.D./HYDRA), ale żadna z 3 encji wymagających S.H.I.E.L.D. Clearance (Maria
  Hill — mastermind, S.H.I.E.L.D. Elite — Villain Group, Cape-Killers — Henchman) nie miała tego
  tagu w `countersNeeded` — 0 pokrycia. Naprawiono:
  - dodano `shield-synergy` do `countersNeeded` tych 3 encji w `src/assets/cards.json`,
  - dodano regułę `if (/S\.H\.I\.E\.L\.D\. Clearance/i.test(all)) counters.add('shield-synergy')`
    w `deriveMastermindCounters`, `deriveVillainGroupCounters` i `deriveHenchmanCounters` w
    `src/utils/jsonMigration.ts`, żeby przyszłe regeneracje `cards.json` (`npm run migrate`)
    automatycznie łapały ten wzorzec.
  - Test: `src/engine/__tests__/synergyEngine.shieldClearance.test.ts` potwierdza, że
    `synergyEngineMode` realnie faworyzuje bohaterów `shield-synergy`, gdy mastermind tego wymaga.

## 3. Ambush Scheme — tylko jeden na raz ✅ NAPRAWIONE
„There can only be one Ambush Scheme in play at a time" — jeśli losowanie łączy kilka Villain
Groups, z których każda ma własną Ambush Scheme, nadmiarowe kopie są po prostu KO'wane.
Nieszkodliwe dla balansu, ale silnik mógłby to inaczej liczyć przy szacowaniu „zawartości" grupy.

**Status:** Naprawione. Zidentyfikowano dokładnie 4 villain groups zawierające kartę Ambush Scheme
(karta z `Twist:` i `defeat this Scheme` — funkcjonuje jako wtórny schemat w Villain Decku):
Cross Technologies, Ghost Chasers, Armada of Kang, Quantum Realm.
- Dodano pole `hasAmbushScheme?: boolean` do typu `VillainGroup` w `src/types/cards.ts`.
- Oznaczono 4 grupy w `src/assets/cards.json` (`"hasAmbushScheme": true`).
- Dodano funkcję `deriveHasAmbushScheme()` w `src/utils/jsonMigration.ts` (przyszłe regeneracje
  `cards.json` automatycznie wykryją ten wzorzec).
- Dodano pole `setupNotes: string[]` do `GameSetup` w `src/engine/SmartRandomizerEngine.ts`;
  `generateSetup()` wypełnia je komunikatem gdy ≥2 wybrane grupy mają `hasAmbushScheme: true`
  — gracz jest informowany o redundantnej karcie bez blokowania losowania (kombinacja jest
  grywalną, tylko z efektem KO).
- Test: `src/engine/__tests__/ambushSchemeOverlap.test.ts` (7 przypadków testowych).

## 4. Special Sidekicks z różnych setów (Secret Wars / Civil War / Messiah Complex) ✅ NAPRAWIONE (częściowo — nota silnikowa usunięta jako zbędna)
Zasada każe scalić je w jeden stos, a nie traktować niezależnie. Jeśli silnik modeluje dodatki
jako osobne pule bez świadomości tej reguły, może błędnie liczyć unikalność/rzadkość kart przy
losowaniu.

**Status:** Zweryfikowane i częściowo naprawione.
- **Wpływ na trudność: brak.** Zawartość Sidekick Stack nie jest częścią modelu silnika
  (nie wpływa na `threatScore`, `counterCoverage` ani balans losowania). Tag `sidekick` w
  `countersNeeded`/`countersProvided` poprawnie modeluje encje mechanicznie oddziałujące na
  Sidekick Stack — to nie ulega zmianie bez względu na to, ile setów dostarcza Sidekicks.
- **Nota setupowa w silniku: celowo pominięta.** Gracze posiadający te dodatki fizycznie i tak
  scalają stosy zgodnie z zasadami — dodatkowy komunikat byłby zbędnym szumem.
- **Adnotacja danych zachowana:** Dodano pole `hasSpecialSidekicks?: boolean` do typu `Expansion`
  w `src/types/cards.ts` i oznaczono 3 expansions w `src/assets/cards.json`
  (Secret Wars Vol.1 / exp 10, Civil War / exp 13, Messiah Complex / exp 31). Logika w
  `src/utils/jsonMigration.ts` zachowuje tę flagę przy przyszłych regeneracjach.
  Metadane mogą być użyteczne dla UI (np. tooltip w liście dodatków).
- Test: `src/engine/__tests__/specialSidekicks.test.ts` (3 przypadki — weryfikacja danych).

## 5. Grievous Wounds / Enraging Wounds — wspólny stos Wound ✅ NAPRAWIONE (częściowo — analogia do kroku 4, brak zmian w silniku)
Oba typy muszą trafić do jednego, połączonego stosu Wound, a nie być traktowane jako osobne
mechaniki dodatku. To wpływa na trudność (łączna liczba możliwych Wounds w grze) — jeśli
`computeThreatScore.ts` liczy trudność per-dodatek zamiast per-połączony-stos, wynik będzie
zaniżony.

**Status:** Zweryfikowane. Brak zmian w silniku — uzasadnienie analogiczne do kroku 4.
- **`computeThreatScore.ts` nie ma żadnej logiki wound-specific**: grep na `wound` w plikach
  silnika (`weightCalculator.ts`, `computeThreatScore.ts`, `synergyEngine.ts`) zwraca zero
  wyników. Wound Deck nie jest modelowany przez silnik — ani jego rozmiar, ani trudność ran.
- **Tag `wound-removal` wystarczy:** 203 encje mają `wound-removal` w `countersNeeded`, 20
  bohaterów dostarcza ten tag. Sygnał "villain zadaje rany → hero powinien umieć leczyć" jest
  poprawnie zamodelowany niezależnie od tego, czy rany są normalne, Grievous czy Enraging.
- **Grievous Wounds** (Civil War / exp 13): trudniejsze do uleczenia (wymagają 5 Recruit), ale
  Civil War projektuje swoich heroes z myślą o tym (wyższy Recruit). Globalny modyfikator
  rozgrywki, nie specyficzny dla wylosowanych grup.
- **Enraging Wounds** (Weapon X / exp 41): dają bonusy gdy zagrane + zwiększają łączną pulę
  Wounds. Net difficulty effect jest niejednoznaczny — zarówno helpful jak i harmful.
- **Gracze i tak scalają stosy ran** — tak samo jak Sidekick Stacks w kroku 4.
- **Adnotacje danych zachowane** jako metadane dla UI: dodano `hasGrievousWounds?: boolean` i
  `hasEnragingWounds?: boolean` do `Expansion` w `src/types/cards.ts`; oznaczono Civil War
  (`"hasGrievousWounds": true`) i Weapon X (`"hasEnragingWounds": true`) w `src/assets/cards.json`;
  logika w `src/utils/jsonMigration.ts` zachowuje te flagi przy przyszłych regeneracjach.
- Brak nowych testów — istniejące 35 testów pokrywa brak regresji.

## 6. Divided Cards — „printed Attack" liczony inaczej niż realny koszt ✅ NAPRAWIONE (częściowo — brak zmian w silniku, weryfikacja potwierdziła brak faktycznej luki)
Dla efektów typu Abomination/Berserk liczy się sumą obu stron karty, a nie stronę aktualnie
graną. Jeśli `weightCalculator.ts`/`computeThreatScore.ts` bierze tylko jedną wartość
kosztu/ataku karty, próg trudności villaina z Abomination może być źle skalibrowany.

**Status:** Zweryfikowane. Brak zmian w silniku — uzasadnienie analogiczne do kroków 4 i 5.
- **Divided Card heroes: tylko 2 w całej bazie danych**: Cloak & Dagger (Civil War / exp 13)
  i Rocket & Groot (Guardians of the Galaxy 2 / exp 33). Oboje mają `keywords: ['Divided Card']`
  w `src/assets/cards.json` — adnotacja istnieje na poziomie Hero (wystarczająca).
- **W praktyce brak rozbieżności**: dla każdej pary kart (ten sam `cost` wewnątrz Divided Card
  hero) jedna strona zawsze ma atak 0 lub blisko 0, więc `sum(obu_stron) == max(jedna_strona)`.
  Innymi słowy: zasada „licz sumę obu stron" daje identyczny wynik jak naiwne „licz tylko
  wyższy atak z jednej strony" — **miscalibration = 0**.
  Przykłady par: Above(2)/Below(0)→2, Flee(0)/Fight(2)→2, Darkness(3)/Light(0)→3,
  Tricky(0)/Simple(3)→3.
- **Silnik nie używa wartości ataku hero w ogóle**: `computeThreatScore.ts` opiera się wyłącznie
  na `difficulty` (skala 1–5) oraz tagach `countersNeeded`/`countersProvided` — nie ma w nim
  żadnego odczytu `HeroCard.attack`. Modyfikacja modelu threat score nie jest potrzebna.
- **Tag `multi-class` w `countersNeeded` jest wystarczającym sygnałem**: wszystkie villain groups
  z `[Abomination]` (Zola's Creations, Inhuman Rebellion) mają `multi-class` w `countersNeeded`.
  Tag ten poprawnie modeluje mechanikę — Abomination faworyzuje villaina, gdy gracze mają
  różnorodne klasy w HQ (i jednocześnie zachęca do rekrutowania bohaterów wieloklasowych).
- **Villain groups z `[Berserk]`** (Berserkers, Weapon Plus) mają własne `countersNeeded`
  (wound-removal, extra-draws itp.) odpowiednie dla ich mechaniki deck-disruption — nie
  wymagają osobnego tagu dla Divided Cards.
- Test: `src/engine/__tests__/dividedCards.test.ts` (6 przypadków — weryfikacja danych
  i potwierdzenie braku rozbieżności dla wszystkich istniejących par Divided Card).

## 7. Multiple Masterminds (Ascending Villains) — inny próg trudności ✅ NAPRAWIONE
Wchłonięty Mastermind nie ma Tactics — wystarczy go pokonać raz. Jeśli silnik liczy trudność na
podstawie standardowej liczby Tactics per Mastermind, zaniży realną liczbę potrzebnych starć dla
takich Schematów.

**Status:** Naprawione. Zidentyfikowano dokładnie 3 schematy z mechaniką Multiple Masterminds:
**Dark Alliance** (dodaje pełny drugi Mastermind z Tactics), **Enthrone the Barons of Battleworld**
(villains ascendują do Mastermindów; może ich być do 6 — bez Tactics, jeden fight każdy),
**God-Emperor of Battleworld** (schemat sam ascenduje do Masterminda).
- Dodano pole `overrides.multipleMasterminds?: boolean` do typu `Scheme` w `src/types/cards.ts`
  oraz `overrides.requiresSecondMastermind?: boolean` dla schematu wymagającego fizycznie drugiego
  Masterminda z Tactics (wyłącznie Dark Alliance). Zaktualizowano `GameSetup` w
  `src/store/useAppStore.ts` (pole `setupNotes: string[]`, `secondMastermind?: Mastermind`).
- Oznaczono 3 schematy w `src/assets/cards.json` (`"multipleMasterminds": true`);
  Dark Alliance dodatkowo `"requiresSecondMastermind": true`.
- Dodano `deriveMultipleMasterminds()` i `deriveRequiresSecondMastermind()` w
  `src/utils/jsonMigration.ts`; wyniki wbudowane w `overrides` schematu.
- `generateSetup()` w `SmartRandomizerEngine.ts`:
  - Dla **Dark Alliance**: losuje drugiego Masterminda z dostępnej puli (z wyłączeniem głównego),
    zwraca go jako `secondMastermind: Mastermind` w `GameSetup`, a w `setupNotes` podaje
    jego imię i instrukcję (Twist 1, liczba Tactics).
  - Dla **Enthrone / God-Emperor**: dodaje ogólną notę o zasadzie Multiple Masterminds.
- **Naprawiono brakującą funkcję UI**: `src/pages/SetupPage.tsx` nie renderował `setupNotes`
  w ogóle (luka z kroku 3). Dodano sekcję wyświetlającą `setupNotes` jako żółte alerty.
  Dla Dark Alliance renderowany jest pełny `MastermindCard` drugiego Masterminda (z fioletowym
  obramowaniem i etykietą „2nd Mastermind (Dark Alliance — Twist 1)") bezpośrednio pod
  kartą głównego Masterminda.
- Test: `src/engine/__tests__/multipleMasterminds.test.ts` (12 przypadków — weryfikacja danych,
  secondMastermind w GameSetup, setupNotes dla każdego ze 3 schematów i brak false-positive).

## 8. Cross-Dimensional Rampage — zależność nazewnicza kart ✅ NAPRAWIONE
Wymaga obecności konkretnie nazwanych bohaterów (np. „Hulk" w nazwie). Jeśli losowanie Heroes nie
gwarantuje żadnej karty pasującej do tematu Rampage, efekt zawsze kończy się Wound — nie psuje
gry, ale obniża zamierzoną szansę na kontrę.

**Status:** Naprawione. Zidentyfikowano wszystkie typy Cross-Dimensional Rampage w bazie danych
(Hulk, Wolverine, Thor, Party, Deadpool, Ultron, Zombie, Void, Demon, Illuminati) oraz encje
je wywołujące (10 villain groups, 6 mastermindów, 1 schemat).
- Dodano stałą `RAMPAGE_COUNTER_MAP` oraz funkcje `addRampageCounters()` i
  `deriveHeroNameCounters()` w `src/utils/jsonMigration.ts`. Trzy funkcje derive
  (`deriveMastermindCounters`, `deriveVillainGroupCounters`, `deriveSchemeCounters`) wywołują
  teraz `addRampageCounters()` — przyszłe regeneracje `cards.json` automatycznie dodadzą tagi.
  Wywołanie `deriveCounters(h.cards)` zastąpiono
  `[...new Set([...deriveCounters(h.cards), ...deriveHeroNameCounters(h.name)])].sort()`
  by uwzględnić imię bohatera przy obliczaniu `countersProvided`.
- Ręcznie naniesiono **45 dodań tagów** do `src/assets/cards.json` (minimalne zmiany, bez
  uruchamiania `migrate`):
  - **Heroes** (28 encji): tagi `hulk-name` dla 11 bohaterów z „Hulk" w imieniu (incl. Maestro
    jako wyjątek), `wolverine-name` dla 6 bohaterów (Wolverine, Weapon X, Old Man Logan,
    Colossus & Wolverine), `thor-name` dla 5 (w tym Lady Thor, Party Thor), `party-name` dla
    Party Thor, `deadpool-name` dla 2 Deadpoolów, `ultron-name` dla Ultrona.
  - **Villain Groups** (10 encji): `hulk-name` → Wasteland, Illuminati; `wolverine-name` →
    Domain of Apocalypse, Sentinel Territories, X-Men '92; `thor-name` → Manhattan Earth-1610;
    `deadpool-name` → Monster Metropolis; `party-name` → Intergalactic Party Animals;
    `zombie-name` → Zombie Avengers; `demon-name` → Strange's Demons;
    `illuminati-name` → Illuminati.
  - **Masterminds** (6 encji): `hulk-name` → Wasteland Hulk, General Ross, King Hulk;
    `zombie-name` → Zombie Scarlet Witch; `ultron-name` → Ultron Infinity; `void-name` →
    The Sentry.
  - **Schemes** (1 encja): `hulk-name` → Fall of the Hulks.
- Tagi bez bohaterów (`zombie-name`, `void-name`, `demon-name`, `illuminati-name`) poprawnie
  sygnalizują niepokryte zagrożenie — `synergyEngine` rejestruje brak pokrycia bez błędu.
- Test: `src/engine/__tests__/crossDimensionalRampage.test.ts` (25 przypadków: weryfikacja
  danych dla heroes/villains/masterminds/schemes oraz potwierdzenie że `synergyEngineMode`
  faworyzuje bohaterów z `hulk-name` gdy mastermind go wymaga).

## 9. „Add an extra Villain Group" — 18 schematów bez żadnego pokrycia ✅ NAPRAWIONE
Co najmniej 18 z 199 schematów (np. *Change the Outcome of WWII*, *Predict Future Crime*,
*Bank Robbery Hostage Crisis*, *Steal the Weaponized Plutonium*, *Cursed Pages of the Darkhold
Tome*, *Inescapable "Kyln" Space Prison*, *Provoke the Sovereign War Fleet*, *Superhuman Baseball
Game*, *Earthquake Drains the Ocean*, *Deadlands Hordes Charge the Wall*, *Fragmented Realities*,
*Smash Two Dimensions Together*, *Five Families of Crime* — ta ostatnia wymaga aż **dwóch**
dodatkowych grup) wymaga w setupie jednej (lub więcej) dodatkowej grupy Villain Group ponad
standardową liczbę wynikającą z liczby graczy. Pole `overrides.extraVillains` istnieje
w typie (`src/types/cards.ts:88`), ale nie jest ustawione w **żadnym** rekordzie `cards.json`
ani odczytywane w kodzie silnika — to martwe pole. W efekcie każdy z tych 18 schematów jest
dziś losowany z o jedną (lub dwie) grupę Villain za mało względem instrukcji z pudełka.

**Status:** Naprawione. Zidentyfikowano dokładnie 17 schematów bezwarunkowo wymagających
dodatkowych grup Villain Group w setupie (18. przypadek — „Negative Zone Prison Breakout" w
oryginalnym secie dodaje Henchman, nie Villain — nie liczy się do tej listy).
- Pole `overrides.extraVillains?: number` było już zdefiniowane w typie — bez zmian w typach.
- Dodano funkcję `deriveExtraVillains()` w `src/utils/jsonMigration.ts` (przyszłe regeneracje
  `cards.json` automatycznie wykryją wzorce „Add [an/N] extra Villain Group" w tekście Setup:,
  z wyłączeniem warunkowych przypadków z kroku 11: „If playing solo…" i „3-5 players:…").
- Ręcznie naniesiono `"extraVillains": 1` do 16 schematów i `"extraVillains": 2` do
  *Five Families of Crime* w `src/assets/cards.json` (17 zmian — wyłącznie celowane linie).
- `generateSetup()` w `src/engine/SmartRandomizerEngine.ts` odczytuje teraz
  `scheme.overrides.extraVillains` i dodaje tę wartość do `villainCount` po wylosowaniu
  schematu — villain groups są losowane z poprawną łączną liczbą.
- Dodano badge `+N Extra Villain Group(s)` w `src/components/game/SchemeCard.tsx`
  (czerwone obramowanie, ikona Swords) analogicznie do istniejącego badge'a `extraHero`.
  Nowe klucze i18n: `cards.scheme.extraVillain`, `cards.scheme.extraVillainPlural`.
- Schematy warunkowe (*Deadpool Wants a Chimichanga* — tylko 3–5 graczy; *Crush Them With My
  Bare Hands* — tylko solo) celowo pominięte — należą do kroku 11.
- Test: `src/engine/__tests__/extraVillains.test.ts` (30 przypadków: weryfikacja danych dla
  wszystkich 17 schematów, test braku fałszywych pozytywów, i testy silnika potwierdzające
  poprawną liczbę villain groups dla extraVillains=1 i extraVillains=2 przy różnych liczbach graczy).

## 10. Wymuszona konkretna Villain Group na poziomie Schematu — brak odpowiednika `resolveAlwaysLeads` ✅ NAPRAWIONE
`resolveAlwaysLeads.ts` obsługuje wyłącznie pole `alwaysLeads` **Mastermindа**. Wiele schematów ma
analogiczny, ale niezależny wymóg dotyczący konkretnej grupy Villain, kompletnie pomijany przy
losowaniu:

**Status:** Naprawione. Zidentyfikowano 12 schematów z wymogami grup Villain/Henchman/Hero
i wdrożono pełne wsparcie silnika dla wszystkich trybów wymuszeń.

- Dodano pola do `Scheme.overrides` w `src/types/cards.ts`:
  - `requiredVillainGroups?: string[]` — grupy wymuszane zawsze (AND, np. Kree Starforce + Skrulls)
  - `requiredHenchmanGroups?: string[]` — grupy henchmenów wymuszane (AND, np. Khonshu Guardians)
  - `xorVillainGroups?: string[]` — dokładnie jedna z listy (XOR, S.H.I.E.L.D. vs. HYDRA War)
  - `requiredVillainKeyword?: string` — jedna Villain Group z tym słowem w kartach (Marvel Zombies)
  - `requiredHeroes?: string[]` — bohaterowie wymuszani po nazwie (Party Thor)
- Stworzono `src/engine/utils/resolveSchemeVillainRequirements.ts` obsługujący wszystkie 5 trybów,
  w tym fuzzy name matching (analogiczny do resolveAlwaysLeads).
- `generateSetup()` w `SmartRandomizerEngine.ts`: wymuszone grupy z schematu są scalane z
  grupami z mastermind.alwaysLeads (dedup po ID); `effectiveVillainCount = max(standard, forced)`
  — schemat Kree-Skrull War przy 1 graczu (solo) poprawnie daje ≥2 villain groups; wymuszone
  hero są pre-selekcjonowane przed trybem losowania (pool i heroCount odpowiednio redukowane).
- Dodano funkcje derive w `src/utils/jsonMigration.ts`: `deriveRequiredVillainGroups()`,
  `deriveXorVillainGroups()`, `deriveRequiredVillainKeyword()`, `deriveRequiredHeroes()`
  (requiredHenchmanGroups nie jest wykrywalne bez dostępu do puli — wymaga ręcznej adnotacji).
- Naniesiono overrides do 12 schematów w `src/assets/cards.json`:
  Secret Invasion ×2 (Skrulls), Enslave Minds (Chitauri), Kree-Skrull War (Kree+Skrull),
  Forge the Infinity Gauntlet (Infinity Gems), Mark of Khonshu (requiredHenchmanGroups: Khonshu
  Guardians), Splice Humans with Spider DNA (Sinister Six), Dark Phoenix Saga (Hellfire Club),
  Demon Bear Saga (Demons of Limbo), S.H.I.E.L.D. vs. HYDRA War (xorVillainGroups),
  Trash Earth (Party Animals + Party Thor), Marvel Zombies (requiredVillainKeyword).
- Dodano 5 nowych kluczy i18n w `src/i18n/en.json` dla setupNotes.
- Test: `src/engine/__tests__/schemeVillainRequirements.test.ts` (28 przypadków: weryfikacja
  danych, testy resolveSchemeVillainRequirements, testy generateSetup dla każdego trybu).

## 11. Warunkowe (player-count-gated) dodatki do puli Villain/Bystander ✅ NAPRAWIONE
Analogicznie do `heroCountModMinPlayers` (które działa tylko dla Hero), część schematów ma
zależne od liczby graczy modyfikacje **Villain Group** lub **Bystanders**, bez żadnego
odpowiednika w silniku:
- *Deadpool Wants a Chimichanga* — „3-5 players: Add a Villain Group"
- *Crush Them With My Bare Hands* — „If playing solo, add an extra Villain Group"
- *Negative Zone Prison Breakout* — „Add 4 extra Bystanders" (fixed, ale ponad tabelę z
  `playerSetupRules.ts`)
- *Hypnotize Every Human* — „No Bystanders in the Villain Deck" (odwrotność: usunięcie, nie
  dodanie)

`bystanders` w `GameSetup` pochodzi wyłącznie z `PLAYER_SETUP_RULES` — schemat nigdy go nie
modyfikuje.

**Status:** Naprawione. Wdrożono pełne wsparcie silnika dla warunkowych villain groups i modyfikacji bystanders.

- Dodano 4 pola do `Scheme.overrides` w `src/types/cards.ts`:
  - `extraVillainsMinPlayers?: number` — warunek dolny (np. 3 dla „3-5 players")
  - `extraVillainsMaxPlayers?: number` — warunek górny (np. 1 dla solo-only)
  - `bystandersMod?: number` — addytywna modyfikacja liczby Bystanders (+4 dla Negative Zone)
  - `bystandersOverride?: number` — nadpisanie liczby Bystanders (0 dla Hypnotize Every Human)
- Zaktualizowano `generateSetup()` w `SmartRandomizerEngine.ts`:
  - `villainCount` sprawdza `extraVillainsMinPlayers`/`extraVillainsMaxPlayers` względem `playerCount`
    — +1 villain group tylko gdy warunek spełniony.
  - `effectiveBystanders` obliczany z `bystandersOverride` lub `bystandersMod`; zwracany w GameSetup.
  - Dodano `schemeExtraVillainMod: number` do `GameSetup` (oraz `useAppStore.ts`) — analogicznie do
    `schemeHeroMod`, żeby UI wiedziało czy warunkowy mod był aktywny.
- Zaktualizowano `deriveExtraVillains()` w `src/utils/jsonMigration.ts` — usunieto wykluczenie
  wzorców warunkowych; dodano 4 nowe funkcje derive: `deriveExtraVillainsMinPlayers()`,
  `deriveExtraVillainsMaxPlayers()`, `deriveBystandersMod()`, `deriveBystandersOverride()`.
- Ręcznie naniesiono overrides do 4 schematów w `src/assets/cards.json`:
  - Deadpool Wants a Chimichanga: `"extraVillains": 1, "extraVillainsMinPlayers": 3`
  - Crush Them With My Bare Hands: `"extraVillains": 1, "extraVillainsMaxPlayers": 1`
  - Negative Zone Prison Breakout (exp 42): `"bystandersMod": 4`
  - Hypnotize Every Human: `"bystandersOverride": 0`
- Zaktualizowano `SchemeCard.tsx`: conditional villain badge (szary gdy nieaktywny, czerwony gdy aktywny,
  z tekstem „solo only" / „≥N players"), badge bystanders override (UserMinus, szary), badge
  bystanders mod (niebieski, +N Bystanders). Nowe klucze i18n w `src/i18n/en.json`.
- Zaktualizowano `SetupPage.tsx`: przekazuje `schemeExtraVillainMod` do `SchemeCard`.
- Zaktualizowano test `extraVillains.test.ts` (krok 9): liczba schematów 17→19, zmienione asercje
  dla Deadpool/Crush Them na weryfikację nowych pól warunkowych.
- Nowy test: `src/engine/__tests__/conditionalVillainsBystanders.test.ts` (23 przypadki: weryfikacja
  danych dla wszystkich 4 schematów + testy silnika dla każdego wariantu player-count).

## 12. Drugi Mastermind jako część setupu Schematu ✅ NAPRAWIONE
*Symbiotic Absorption*: „Set aside a second 'Drained' Mastermind and its 4 Tactics... Add its
'Always Leads' Villains as an extra Villain Group." To wymaga wylosowania/wybrania **dwóch**
Mastermindów jednocześnie (jeden aktywny, jeden „Drained" tylko jako źródło Tactics i
`alwaysLeads`). Model danych (`GameSetup.mastermind: Mastermind` — pojedynczy obiekt) nie ma
miejsca na drugiego Mastermindа; silnik nie ma pojęcia takiego przypadku.

**Status:** Naprawione. Obsługa analogiczna do Dark Alliance (krok 7), ale z dedykowaną logiką
dla roli „Drained":

- Dodano pole `requiresDrainedMastermind?: boolean` do `Scheme.overrides` w `src/types/cards.ts`.
- Dodano pole `drainedMastermind?: Mastermind` do `GameSetup` w `SmartRandomizerEngine.ts` i
  `useAppStore.ts`.
- `generateSetup()` w `SmartRandomizerEngine.ts`: gdy `scheme.overrides.requiresDrainedMastermind`,
  losuje Drained Masterminda z puli (z wyłączeniem głównego), rozwiązuje jego `alwaysLeads` przez
  `resolveAlwaysLeads()` i dodaje wynik jako wymuszoną Villain Group do `allForcedVillains`.
  `effectiveVillainCount = max(villainCount, allForcedVillains.length)` gwarantuje poprawną
  łączną liczbę grup. Dodaje setupNote z kluczem `setup.notes.symbioticAbsorptionDrained`.
- Oznaczono Symbiotic Absorption w `src/assets/cards.json`:
  `"requiresDrainedMastermind": true, "extraVillains": 1` (extraVillains=1 pozostaje, żeby
  villainCount bazowo uwzględniał +1 ponad standard).
- Dodano `deriveRequiresDrainedMastermind()` w `src/utils/jsonMigration.ts` (przyszłe
  regeneracje automatycznie wykryją wzorzec).
- UI: `SetupPage.tsx` renderuje `drainedMastermind` jako szarą kartę z etykietą
  „Drained Mastermind (Symbiotic Absorption — set aside)" — bezpośrednio pod `secondMastermind`
  (jeśli oba obecne).
- Nowy klucz i18n: `setup.notes.symbioticAbsorptionDrained`.
- Test: `src/engine/__tests__/symbioticAbsorption.test.ts` (18 przypadków: weryfikacja danych,
  drainedMastermind w GameSetup, wymuszona Villain Group, liczba villain groups, setupNotes,
  brak false-positive dla innych schematów).

## 13. Schematy zakładające wiele równoległych talii Villain (multi-deck) ✅ NAPRAWIONE
*Breach the Nexus of All Realities*, *Five Families of Crime*, *Fragmented Realities*,
*Smash Two Dimensions Together* dzielą pulę Villain na kilka niezależnych talii/„rzeczywistości"
(po jednej na gracza lub 3-5 stałych). To fundamentalnie inna struktura niż zakładany przez
silnik jeden płaski `selectedVillains: VillainGroup[]`. Randomizer nie musi symulować rozgrywki,
ale dobrze byłoby oznaczyć te schematy jako wymagające dodatkowej liczby grup Villain
proporcjonalnej do liczby graczy (obecnie brak jakiejkolwiek adnotacji o tym w danych).

**Status:** Naprawione. Wszystkie 4 schematy są teraz w pełni zaannotowane, a dla Breach the
Nexus naprawiono realny błąd z za małą liczbą villain groups przy 1-2 graczach.

- **Nowe pole `isMultiDeck?: boolean`** w `Scheme.overrides` (`src/types/cards.ts`) — metadana
  informująca UI i silnik o konieczności podziału Villain Deck na wiele talii.
- **Nowe pole `minVillainCount?: number`** — minimalna łączna liczba Villain Groups niezależna
  od playerCount; `effectiveVillainCount = max(standard+extra, forced, minVillainCount)`.
- Dodano `deriveIsMultiDeck()` i `deriveMinVillainCount()` w `src/utils/jsonMigration.ts`.
- **Ręczne adnotacje w `src/assets/cards.json`** (4 schematy):
  - **Breach the Nexus of All Realities**: `"isMultiDeck": true, "minVillainCount": 3`
    (naprawia realny błąd: 1 gracz standardowo = 1 villain, schemat wymaga ≥3)
  - **Five Families of Crime**: `"isMultiDeck": true` (miało już `extraVillains: 2` z kroku 9)
  - **Fragmented Realities**: `"isMultiDeck": true` (miało już `extraVillains: 1`)
  - **Smash Two Dimensions Together**: `"isMultiDeck": true` (miało już `extraVillains: 1`)
- **Silnik**: `generateSetup()` w `SmartRandomizerEngine.ts` używa `minVillainCount` przy
  obliczaniu `effectiveVillainCount`; dodaje setup note `setup.notes.multiDeck` dla tych
  schematów.
- **UI**: `SchemeCard.tsx` wyświetla indygowy badge „Multi-Deck Setup" (ikona Layers) gdy
  `scheme.overrides.isMultiDeck === true`.
- Nowe klucze i18n: `cards.scheme.multiDeckBadge`, `setup.notes.multiDeck`.
- Test: `src/engine/__tests__/multiDeckSchemes.test.ts` (20 przypadków: weryfikacja danych
  dla wszystkich 4 schematów, testy silnika dla minVillainCount przy każdym playerCount,
  setup notes, brak false-positive).

## 14. Wymóg konkretnego Hero/keywordu Hero z poziomu Schematu ✅ NAPRAWIONE
*Everybody Hates Deadpool* — „Use at least 1 [Mercs for Money] Hero" wymaga obecności bohatera
z konkretnym keywordem w puli Heroes. Podobnie jak p. 8 w oryginalnej analizie (Cross-Dimensional
Rampage), silnik losujący Heroes (`smartEqualizerMode`/`dustOffMode`/`synergyEngineMode`) nie ma
mechanizmu wymuszania obecności konkretnego keywordu — traktuje to jako zwykłą, niegwarantowaną
szansę.

**Status:** Naprawione. Zidentyfikowano 2 schematy z tym wymogiem (oba używają `Hero.faction`,
nie słowa kluczowego — `[X]` w tekście kart to symbol teamowy = pole faction):

- Dodano pole `requiredHeroFaction?: string` do `Scheme.overrides` w `src/types/cards.ts`.
- `generateSetup()` w `SmartRandomizerEngine.ts`: gdy `scheme.overrides.requiredHeroFaction`
  jest ustawione, silnik losuje 1 bohatera z tej frakcji z dostępnej puli i pre-selekcjonuje go
  (analogicznie do `requiredHeroes` z kroku 10). Pre-wybrany bohater liczy się w heroCount,
  reszta jest losowana normalnie przez wybrany tryb. Jeśli żaden bohater frakcji nie jest
  dostępny w aktywnych dodatkach, dodawana jest nota ostrzegawcza.
- Naniesiono overrides w `src/assets/cards.json`:
  - Everybody Hates Deadpool: `"requiredHeroFaction": "Mercs for Money"`
  - Distract the Hero: `"requiredHeroFaction": "Spider Friends"`
- Dodano `deriveRequiredHeroFaction()` w `src/utils/jsonMigration.ts` (wykrywa wzorzec
  `Use at least N[X] Hero`).
- UI: `SchemeCard.tsx` wyświetla zielony badge „Requires ≥1 [X] Hero" (ikona Shield) gdy
  `requiredHeroFaction` jest ustawione. Nowy klucz i18n: `cards.scheme.requiredHeroFaction`.
- Setup notes: `setup.notes.schemeRequiredHeroFaction` (z nazwą pre-wybranego bohatera) lub
  `setup.notes.schemeRequiredHeroFactionMissing` (gdy frakcja niedostępna).
- Test: `src/engine/__tests__/requiredHeroFaction.test.ts` (14 przypadków: weryfikacja danych,
  testy silnika dla obu schematów przy różnych playerCount, test braku dostępnej frakcji).

## 15. Dobór Heroes wg drużyny (`faction`) lub imienia — 4 schematy, zero pokrycia i zero adnotacji w danych ✅ NAPRAWIONE
Cztery schematy narzucają twardy skład Hero Decku inny niż „N losowych Heroes", a żaden z nich
nie ma niczego w `overrides` (`{}` — puste, bez `specialSetup`, bez `heroCountMod`). To gorsza
odmiana luk z pkt. 9-14: tu nawet UI (`SchemeCard.tsx`) nie pokazuje ostrzeżenia graczowi, bo
`specialSetup` jest puste.

**Status:** Naprawione. Wszystkie 4 schematy mają pełne overrides i silnik respektuje ich
specjalne wymagania.

- Dodano 5 nowych pól do `Scheme.overrides` w `src/types/cards.ts`:
  - `heroCountOverride?: number` — stała liczba hero niezależna od playerCount
  - `heroFactionSplit?: { teamSize: number }` — 2 losowe frakcje po teamSize bohaterów (zastępuje normalny tryb)
  - `requiredFactionCount?: { faction: string; count: number; excludeFromRemainder?: boolean }` — N bohaterów z frakcji
  - `requiredHeroNameSubstring?: { substring: string; exactCount: number }` — dokładnie N hero z substring w nazwie
  - `requiresAllHeroClasses?: boolean` — co najmniej 1 bohater każdej z 5 klas
- Kompletny refactor sekcji hero selection w `SmartRandomizerEngine.ts`:
  - **Avengers vs. X-Men** (`heroCountOverride: 6, heroFactionSplit: {teamSize: 3}`): silnik
    losuje 2 frakcje z ≥3 bohaterami i wybiera po 3 z każdej. Niezależne od playerCount,
    całkowicie zastępuje normalny tryb. Setup note podaje obie wylosowane frakcje.
  - **House of M** (`heroCountOverride: 6, requiredFactionCount: {faction:"X-Men",count:4,excludeFromRemainder:true}`):
    Pre-selekcja 4 X-Menów, pozostałe 2 sloty z puli wykluczonej X-Menów. Setup note wymienia
    wylosowanych X-Menów.
  - **Fall of the Hulks** (`requiredHeroNameSubstring: {substring:"Hulk",exactCount:2}`):
    Pre-selekcja dokładnie 2 bohaterów z „Hulk" w nazwie, pula dla reszty wyklucza Hulków.
    heroCount z normalnych zasad playerCount. Setup note wymienia wylosowanych Hulków.
  - **Divide and Conquer** (`heroCountOverride: 7, requiresAllHeroClasses: true`):
    Zawsze 7 bohaterów, silnik najpierw zapewnia po 1 bohaterze każdej z 5 klas, resztę losuje
    normalnym trybem. Setup note informuje o wymogu sortowania klas.
- Dodano 5 funkcji derive w `src/utils/jsonMigration.ts`.
- Naniesiono overrides do 4 schematów w `src/assets/cards.json`.
- `SchemeCard.tsx`: 5 nowych badge'y (fioletowe) + import Layers/Shield/Split/BookOpen.
- Nowe klucze i18n: `heroCountOverride`, `heroFactionSplitBadge`, `requiredFactionCountBadge`,
  `requiredHeroNameSubstringBadge`, `requiresAllHeroClassesBadge` + 4 setup note keys.
- Test: `src/engine/__tests__/heroSpecialSetup.test.ts` (31 przypadków: dane, silnik dla
  każdego schematu przy różnych playerCount, setup notes, brak false-positive).
Cztery schematy narzucają twardy skład Hero Decku inny niż „N losowych Heroes“, a żaden z nich
nie ma niczego w `overrides` (`{}` — puste, bez `specialSetup`, bez `heroCountMod`). To gorsza
odmiana luk z pkt. 9-14: tu nawet UI (`SchemeCard.tsx`) nie pokazuje ostrzeżenia graczowi, bo
`specialSetup` jest puste.

- **Avengers vs. X-Men** (Civil War): „Hero Deck has 3 Heroes of one Team and 3 Heroes of another
  Team. ([Avengers],[X-Men],[Spider Friends],[Marvel Knights], etc.)" — wymaga podziału 3+3 wg
  `Hero.faction`.
- **House of M**: „Hero Deck is 4[X-Men] Heroes and 2 non-[X-Men] Heroes. (Or substitute another
  team...)" — analogiczny wymóg, ale podział 4:2, z możliwością zamiany drużyny na inną.
- **Fall of the Hulks**: „Use exactly two Heroes with 'Hulk' in their Hero Names." — wymóg
  nazwowy (jak pkt. 8 z oryginalnej analizy — Cross-Dimensional Rampage), ale tu dotyczy
  **głównego** Hero Decku, nie tylko Extra Hero, i jest sformułowany jako twardy warunek
  („exactly"), a nie tylko bonus przy trafieniu.
- **Divide and Conquer**: „Sort the Hero Deck by Hero Class: [Strength],[Instinct],[Covert],
  [Tech],[Ranged]... Put these 5 smaller, shuffled Hero Decks beneath the 5 HQ Spaces." —
  miękki wymóg zróżnicowania klas: przy niefortunnym losowaniu (np. wszystkie Heroes tej samej
  klasy) część z 5 mini-decków HQ będzie pusta od startu, co łamie zamierzoną mechanikę.

**Wspólny rdzeń problemu:** pole `Hero.faction` istnieje w typie i w danych (23 unikalne wartości:
Avengers, X-Men, Spider Friends, Marvel Knights, HYDRA, Brotherhood, itd. —
`src/utils/jsonMigration.ts:1283` mapuje je z `teamLabel`), ale żaden tryb losowania Heroes
(`smartEqualizerMode`, `dustOffMode`, `synergyEngineMode`, `uniformSample` w
`src/engine/SmartRandomizerEngine.ts`) nie grupuje ani nie filtruje po `faction` ani po
`primaryClasses` względem wymagań konkretnego Schematu — potwierdzone grepem: `faction`
występuje w `src/engine/` wyłącznie w jednym fixture testowym (`dustOff.test.ts:11`), zero
użyć produkcyjnych. Dla „Hulk"-owego wymogu (Fall of the Hulks) analogicznie brak filtrowania po
substring w `Hero.name`.

W praktyce dziś wszystkie cztery schematy są losowane identycznie jak każdy inny — bez
gwarancji podziału na drużyny, bez gwarancji obecności bohaterów z „Hulk" w nazwie, bez
gwarancji zróżnicowania klas — a gracz nie dostaje żadnego ostrzeżenia, bo tekst specialSetup
nigdy nie został wyekstrahowany do `overrides` dla tych czterech pozycji.

## 16. Specjalne scheme z nazwą Veiled oraz Unveiled ✅ NAPRAWIONE
Istnieją schematy, które przez kilka pierwszych twistów mają inne mechaniki, a po odwróceniu (Unveiled) zmieniają
się w zupełnie inne schematy. Silnik nie ma mechanizmu rozróżniania Veiled/Unveiled,
więc nie może w pełni symulować rozgrywki. Pytanie, czy narzucić graczowi wylosowany Veiled i Unveiled scheme, czy
pozwolić na wylosowanie tylko Veiled a zostawić Unveiled do ręcznego wylosowania. Jednak niesie to za sobą ryzyko, że 
nie będzie można określić trudności takich rozgrywek. Może warto dodać pewien przełącznik w aplikacji, albo przycisk,
który opcjonalnie wylosuje drugą część scenariusza

**Status:** Naprawione. Zidentyfikowano 4 Veiled Schemes i 4 Unveiled Schemes w ekspansji 31 (X-Force / Messiah Complex).

- Dodano 3 pola do `Scheme.overrides` w `src/types/cards.ts`:
  - `isVeiledScheme?: boolean` — Veiled Scheme (transformuje w losowy Unveiled na Twiście N)
  - `isUnveiledScheme?: boolean` — Unveiled Scheme (nie losowany samodzielnie przez silnik)
  - `veilTransformsTwist?: number` — numer Twista transformacji (6/7/5/4 dla kolejnych Veiled)
- Oznaczono 4 Veiled Schemes w `src/assets/cards.json` (`isVeiledScheme: true, veilTransformsTwist: N`):
  Hack Cerebro Servers To... (Twist 6), Drain Mutant Powers To... (Twist 7),
  Hire Singularity Investigations To... (Twist 5), Raid Gene Banks To... (Twist 4).
- Oznaczono 4 Unveiled Schemes (`isUnveiledScheme: true`):
  ...Control the Mutant Messiah, ...Open Rifts to Future Timelines,
  ...Reveal The Heroes' Evil Clones, ...Unleash an Anti-Mutant Bioweapon.
- Dodano 3 funkcje derive w `src/utils/jsonMigration.ts`: `deriveIsVeiledScheme()`,
  `deriveIsUnveiledScheme()`, `deriveVeilTransformsTwist()` — przyszłe regeneracje `cards.json`
  automatycznie wykryją wzorzec `[Transforms] into a random [Unveiled Scheme]`.
- **Silnik** (`SmartRandomizerEngine.ts`):
  - Unveiled Schemes są **filtrowane z puli automatycznego losowania** — losowane wyłącznie
    gdy gracz ręcznie je wymusi przez Manual Pick (forcedScheme).
  - Gdy Veiled Scheme jest wylosowany, silnik automatycznie pre-wybiera losowy Unveiled Scheme
    z tej samej ekspansji i zwraca go jako `GameSetup.unveiledScheme`.
  - Dodano setup note `setup.notes.veiledScheme` z numerem Twista transformacji.
- **UI** (`SetupPage.tsx`):
  - Gdy `currentSetup.unveiledScheme` jest obecny, wyświetlany jest przycisk
    „🎲 Reveal Phase 2 (Unveiled Scheme — spoiler!)" / „🙈 Hide Unveiled Scheme".
  - Po kliknięciu ujawniany jest SchemeCard Unveiled Scheme z pomarańczowym obramowaniem
    i nagłówkiem „Phase 2: Unveiled Scheme (Revealed at Twist N)".
  - Stan spoilera (`unveiledVisible`) resetuje się przy każdym nowym losowaniu.
- **`SchemeCard.tsx`**: pomarańczowy badge „Veiled Scheme (transforms at Twist N)"
  dla Veiled Schemes oraz „Unveiled Scheme (Phase 2)" dla Unveiled Schemes.
- Nowe klucze i18n w `src/i18n/en.json`:
  `setup.notes.veiledScheme`, `cards.scheme.veiledBadge`, `cards.scheme.unveiledBadge`,
  `setup.unveiledScheme.revealButton/hideButton/heading/subheading`.
- Test: `src/engine/__tests__/veiledSchemes.test.ts` (21 przypadków: weryfikacja danych
  dla wszystkich 8 schematów, filtrowanie z puli auto-losowania, obecność `unveiledScheme`
  w GameSetup, losowość wyboru, setup notes, brak fałszywych pozytywów).

## 17. Scheme Negative Zone Prison Breakout — wymaga dodatkowego Henchmana ✅ NAPRAWIONE
Należy dodać warunek dodający grupę Henchman do setupu, jeśli wylosowany zostanie ten schemat. 
W przeciwnym razie schemat nie będzie zgodny z instrukcją. Dodatkowo sprawdzamy, czy nie ma więcej
takich schematów.

**Status:** Naprawione. Przeskanowano wszystkie schematy w bazie — znaleziono łącznie 10 schematów
z różnymi wymaganiami dotyczącymi dodatkowych grup Henchman. Podzielono je na 4 kategorie:

**Typ A — Generic extra Henchman z puli (`extraHenchmen: 1`)**
Dodano nowe pole `extraHenchmen?: number` do `Scheme.overrides` (`src/types/cards.ts`).
`generateSetup()` w `SmartRandomizerEngine.ts` oblicza `effectiveHenchmanCount = baseHenchmanCount + extraHenchmen`
i losuje odpowiednią liczbę grup. 4 schematy otrzymały `extraHenchmen: 1`:
- Negative Zone Prison Breakout (exp 1): „Add an extra Henchman group to the Villain Deck"
- Asgard Under Siege: „Add an extra Henchman group"
- Invasion of the Venom Symbiotes: „Add an extra Henchman Group"
- Invade the Daily Bugle News HQ: „Add 6 extra Henchmen from a single Henchman Group to the Hero Deck"
  (+ `specialSetup` nota: 6 kart trafia do Hero Deck, nie Villain Deck)

**Typ B — Wymagany konkretny Henchman z puli (`requiredHenchmanGroups`)**
Mechanizm `requiredHenchmanGroups` był już zaimplementowany (krok 10). Naniesiono 2 adnotacje:
- Organized Crime Wave: `requiredHenchmanGroups: ["Maggia Goons"]` (zajmuje normalny slot)
- Mutant-Hunting Super Sentinels: `extraHenchmen: 1` + `requiredHenchmanGroups: ["Sentinel"]`
  (dodatkowy slot, konkretna grupa)

**Typ C — Scheme-specific custom Henchman (nie z puli, `specialSetup` nota)**
Te grupy (10 custom kart) są dołączone do pudełka schematu, nie są losowane z puli:
- Sire Vampires at the Blood Bank: "Vampire Neonates"
- Devolve with Xerogen Crystals: "Xerogen Experiments"
- Scavenge Alien Weaponry: "Smugglers"

**Typ D — Specjalne/złożone mechaniki (`specialSetup` nota)**
- Star-Lord's Awesome Mix Tape: „double the normal number of Villain and Henchman Groups,
  use only half the cards" — zbyt złożone do modelowania w silniku; dodana nota setup.

**Zmiany techniczne:**
- Pole `extraHenchmen?: number` w `src/types/cards.ts`
- `effectiveHenchmanCount = baseHenchmanCount + extraHenchmen` w `SmartRandomizerEngine.ts`
- Setup note `setup.notes.schemeExtraHenchmen` (z liczbą grup)
- Funkcja `deriveExtraHenchmen()` w `src/utils/jsonMigration.ts` (auto-detekcja wzorców
  „Add an extra Henchman group" bez customowej nazwy)
- Badge `+N Extra Henchman Group(s)` w `SchemeCard.tsx` (czerwone obramowanie, ikona ShieldAlert)
- Fix: `specialSetup` w SchemeCard renderuje się teraz zawsze (nie tylko gdy `isModActive`)
- Nowe klucze i18n: `cards.scheme.extraHenchman`, `cards.scheme.extraHenchmanPlural`,
  `setup.notes.schemeExtraHenchmen`
- Test: `src/engine/__tests__/extraHenchmen.test.ts` (19 przypadków: weryfikacja danych
  dla wszystkich 10 schematów, testy silnika dla poprawnej liczby henchmenów przy każdym
  playerCount, setup notes, brak fałszywych pozytywów).

---

### Źródła
- `json/rules.json` — opisy zasad specjalnych (Adapting Masterminds, Multiple Masterminds,
  Ambush Schemes, Sidekicks, Grievous/Enraging Wounds, Divided Card, Villainous Weapons, itd.)
- `json/keywords.json` — opisy słów kluczowych na kartach (Cosmic Threat, S.H.I.E.L.D.
  Clearance, Cross-Dimensional Rampage, Abomination, itd.)
- `src/engine/modes/synergyEngine.ts` — istniejąca logika `countersNeeded`
- `src/engine/utils/computeThreatScore.ts`, `src/engine/weightCalculator.ts` — logika trudności/wag
