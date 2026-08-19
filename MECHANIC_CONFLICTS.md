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
  a bezpośrednio pod oryginalnym opisem problemu dodawany jest akapit **„Status:”** z konkretnymi
  ścieżkami plików, które zmieniono, oraz nazwami plików testowych, które to pokrywają.
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

## 4. Special Sidekicks z różnych setów (Secret Wars / Civil War / Messiah Complex)
Zasada każe scalić je w jeden stos, a nie traktować niezależnie. Jeśli silnik modeluje dodatki
jako osobne pule bez świadomości tej reguły, może błędnie liczyć unikalność/rzadkość kart przy
losowaniu.

## 5. Grievous Wounds / Enraging Wounds — wspólny stos Wound
Oba typy muszą trafić do jednego, połączonego stosu Wound, a nie być traktowane jako osobne
mechaniki dodatku. To wpływa na trudność (łączna liczba możliwych Wounds w grze) — jeśli
`computeThreatScore.ts` liczy trudność per-dodatek zamiast per-połączony-stos, wynik będzie
zaniżony.

## 6. Divided Cards — „printed Attack” liczony inaczej niż realny koszt
Dla efektów typu Abomination/Berserk liczy się sumę obu stron karty, a nie stronę aktualnie
graną. Jeśli `weightCalculator.ts`/`computeThreatScore.ts` bierze tylko jedną wartość
kosztu/ataku karty, próg trudności villaina z Abomination może być źle skalibrowany.

## 7. Multiple Masterminds (Ascending Villains) — inny próg trudności
Wchłonięty Mastermind nie ma Tactics — wystarczy go pokonać raz. Jeśli silnik liczy trudność na
podstawie standardowej liczby Tactics per Mastermind, zaniży realną liczbę potrzebnych starć dla
takich Schematów.

## 8. Cross-Dimensional Rampage — zależność nazewnicza kart
Wymaga obecności konkretnie nazwanych bohaterów (np. „Hulk” w nazwie). Jeśli losowanie Heroes nie
gwarantuje żadnej karty pasującej do tematu Rampage, efekt zawsze kończy się Wound — nie psuje
gry, ale obniża zamierzoną szansę na kontrę.

## 9. „Add an extra Villain Group" — 18 schematów bez żadnego pokrycia
Co najmniej 18 z 199 schematów (np. *Change the Outcome of WWII*, *Predict Future Crime*,
*Bank Robbery Hostage Crisis*, *Steal the Weaponized Plutonium*, *Cursed Pages of the Darkhold
Tome*, *Inescapable "Kyln" Space Prison*, *Provoke the Sovereign War Fleet*, *Superhuman Baseball
Game*, *Earthquake Drains the Ocean*, *Deadlands Hordes Charge the Wall*, *Fragmented Realities*,
*Smash Two Dimensions Together*, *Five Families of Crime* — ta ostatnia wymaga aż **dwóch**
dodatkowych grup) wymaga w setupie jednej (lub więcej) dodatkowej grupy Villain Group ponad
standardową liczbę wynikającą z liczby graczy. `generateSetup()` w `SmartRandomizerEngine.ts`
liczy `villainCount` wyłącznie z `getSetupRules(playerCount)` (linia 72) i **nigdy** nie
odczytuje żadnego pola ze Schematu, by je zwiększyć. Pole `overrides.extraVillains` istnieje
w typie (`src/types/cards.ts:69`), ale nie jest ustawione w **żadnym** rekordzie `cards.json`
ani odczytywane w kodzie silnika (`grep` na `extraVillains` w `src/` daje tylko definicję typu) —
to martwe pole. W efekcie każdy z tych 18 schematów jest dziś losowany z o jedną (lub dwie) grupę
Villain za mało względem instrukcji z pudełka.

## 10. Wymuszona konkretna Villain Group na poziomie Schematu — brak odpowiednika `resolveAlwaysLeads`
`resolveAlwaysLeads.ts` obsługuje wyłącznie pole `alwaysLeads` **Mastermindа**. Wiele schematów ma
analogiczny, ale niezależny wymóg dotyczący konkretnej grupy Villain, kompletnie pomijany przy
losowaniu:
- *Secret Invasion of the Skrull Shapeshifters* (2 warianty) — „Skrull Villain Group required" /
  „Always include the Skrull Villain Group"
- *Enslave Minds with the Chitauri Scepter* — „Chitauri Villain Group required"
- *The Kree-Skrull War* — „Always include Kree Starforce **and** Skrull Villain Groups" (dwie
  jednocześnie)
- *Forge the Infinity Gauntlet* — „Always include the Infinity Gems Villain Group"
- *The Mark of Khonshu* — „Always include Khonshu Guardians"
- *Splice Humans with Spider DNA* — „Include Sinister Six as one of the Villain Groups"
- *The Dark Phoenix Saga* — „Include Hellfire Club as one of the Villain Groups"
- *The Demon Bear Saga* — „Include Demons of Limbo as one of the Villain Groups"
- *S.H.I.E.L.D. vs. HYDRA War* — XOR: „Hydra Elite" **albo** „A.I.M., Hydra Offshoot", ale nie obie
  naraz (silnik nie ma pojęcia „dokładnie jedna z zestawu, wzajemnie wykluczające się")
- *Trash Earth with Hugest Party Ever* — wymaga jednocześnie konkretnego **Hero** (Party Thor) i
  konkretnej Villain Group (Intergalactic Party Animals) — podwójny wymóg międzytypowy
- *Marvel Zombies* — wymóg oparty o keyword na karcie, nie o nazwę: „Include exactly one Villain
  Group with [Rise of The Living Dead]"

Bez wsparcia dla tych przypadków losowanie może w ogóle nie zawrzeć wymaganej grupy (scheme
staje się niegrywalny lub niezgodny z instrukcją) albo — w przypadku S.H.I.E.L.D. vs. HYDRA —
wylosować obie wykluczające się grupy naraz.

## 11. Warunkowe (player-count-gated) dodatki do puli Villain/Bystander
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

## 12. Drugi Mastermind jako część setupu Schematu
*Symbiotic Absorption*: „Set aside a second 'Drained' Mastermind and its 4 Tactics... Add its
'Always Leads' Villains as an extra Villain Group." To wymaga wylosowania/wybrania **dwóch**
Mastermindów jednocześnie (jeden aktywny, jeden „Drained" tylko jako źródło Tactics i
`alwaysLeads`). Model danych (`GameSetup.mastermind: Mastermind` — pojedynczy obiekt) nie ma
miejsca na drugiego Mastermindа; silnik nie ma pojęcia takiego przypadku.

## 13. Schematy zakładające wiele równoległych talii Villain (multi-deck)
*Breach the Nexus of All Realities*, *Five Families of Crime*, *Fragmented Realities*,
*Smash Two Dimensions Together* dzielą pulę Villain na kilka niezależnych talii/„rzeczywistości"
(po jednej na gracza lub 3-5 stałych). To fundamentalnie inna struktura niż zakładany przez
silnik jeden płaski `selectedVillains: VillainGroup[]`. Randomizer nie musi symulować rozgrywki,
ale dobrze byłoby oznaczyć te schematy jako wymagające dodatkowej liczby grup Villain
proporcjonalnej do liczby graczy (obecnie brak jakiejkolwiek adnotacji o tym w danych).

## 14. Wymóg konkretnego Hero/keywordu Hero z poziomu Schematu
*Everybody Hates Deadpool* — „Use at least 1 [Mercs for Money] Hero" wymaga obecności bohatera
z konkretnym keywordem w puli Heroes. Podobnie jak p. 8 w oryginalnej analizie (Cross-Dimensional
Rampage), silnik losujący Heroes (`smartEqualizerMode`/`dustOffMode`/`synergyEngineMode`) nie ma
mechanizmu wymuszania obecności konkretnego keywordu — traktuje to jako zwykłą, niegwarantowaną
szansę.

## 15. Dobór Heroes wg drużyny (`faction`) lub imienia — 4 schematy, zero pokrycia i zero adnotacji w danych
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
  miękki wymóg zróżnicowania klas: przy niefortunnym losowaniu (np. wszystkie 7 Heroes tej samej
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

---

### Źródła
- `json/rules.json` — opisy zasad specjalnych (Adapting Masterminds, Multiple Masterminds,
  Ambush Schemes, Sidekicks, Grievous/Enraging Wounds, Divided Card, Villainous Weapons, itd.)
- `json/keywords.json` — opisy słów kluczowych na kartach (Cosmic Threat, S.H.I.E.L.D.
  Clearance, Cross-Dimensional Rampage, Abomination, itd.)
- `src/engine/modes/synergyEngine.ts` — istniejąca logika `countersNeeded`
- `src/engine/utils/computeThreatScore.ts`, `src/engine/weightCalculator.ts` — logika trudności/wag
