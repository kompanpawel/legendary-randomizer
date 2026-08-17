# Kontynuacja prac nad legendary-randomizer

**Projekt:** `/home/pmiskiewicz/WebstormProjects/legendary-randomizer` — aplikacja PWA (React + TypeScript + Vite) do losowania setupu do gry Marvel Legendary DBG.

---

## Stan obecny — co już zostało zrobione

**`src/assets/cards.json`** to główny plik danych aplikacji (generowany przez `src/utils/jsonMigration.ts` z plików w `json/`).

### Bohaterowie (311 szt.) ✅

Wszystkie trzy pola wypełnione na podstawie tekstów kart:

- `primaryClasses: HeroClass[]` — dominujące klasy kart (≥33% talii)
- `keywords: string[]` — mechaniki kluczowe (Size-Changing, Dodge, Undercover, Ambush, Focus itd.)
- `countersProvided: CounterTag[]` — strategiczne role bohatera (extra-draws, deck-thinning, bystander-rescue, wound-removal, villain-control, heavy-hitter itd.)

### Masterminds (111 szt.) ✅

Pole `countersNeeded: CounterTag[]` wypełnione na podstawie efektów Master Strike i Taktyk.
Implementacja: funkcja `deriveMastermindCounters()` w `src/utils/jsonMigration.ts`.

Przykłady:

| Mastermind | countersNeeded |
|---|---|
| Kang the Conqueror | `conqueror`, `time-travel`, `wound-removal` |
| Galactus | `heavy-hitter`, `multi-class`, `villain-control` |
| Thanos (Infinity Stones) | `extra-draws`, `heavy-hitter`, `recruit-boost`, `villain-control`, `wound-removal` |
| Magneto | `deck-thinning`, `extra-draws`, `multi-class`, `wound-removal` |

### Schematy (199 szt.) ✅

Pole `countersNeeded: CounterTag[]` wypełnione na podstawie tekstów kart (Twist-ów, Special Rules, warunków zwycięstwa).
Implementacja: funkcja `deriveSchemeCounters()` w `src/utils/jsonMigration.ts`. **0 schematów z pustą tablicą.**

Rozkład tagów:
- `villain-control` — 107 · `heavy-hitter` — 70 · `recruit-boost` — 53 · `deck-thinning` — 39
- `wound-removal` — 30 · `bystander-rescue` — 27 · `multi-class` — 15 · `extra-draws` — 14

### Grupy Villainów (134 szt.) ✅

Pole `countersNeeded: CounterTag[]` dodane do interfejsu `VillainGroup` i wypełnione na podstawie analizy całej grupy łotrów (nie poszczególnych kart).
Implementacja: funkcja `deriveVillainGroupCounters()` w `src/utils/jsonMigration.ts`. **0 grup z pustą tablicą.**

Analiza obejmuje: efekty Ambush/Fight/Escape, maksymalną siłę ataku, mechaniki specjalne (`[Prey]`, `[Momentum]`, `[Empowered]`, `[Dark Memories]`, `[Demonic Bargain]`, `Bindings`, `Overrun`, `[Blood Frenzy]` itp.), przechwycone karty bohaterów.

Rozkład tagów:
- `heavy-hitter` — 110 · `wound-removal` — 93 · `recruit-boost` — 83 · `deck-thinning` — 79
- `extra-draws` — 55 · `villain-control` — 53 · `multi-class` — 48 · `bystander-rescue` — 41

### Silnik synergii (`src/engine/modes/synergyEngine.ts`) ✅ (częściowo)

Łączy `scheme.countersNeeded + mastermind.countersNeeded` przy doborze bohaterów (mnożnik ×3 dla pasującego bohatera).

```typescript
const neededCounters = [
  ...new Set([...scheme.countersNeeded, ...mastermind.countersNeeded]),
];
// mnożnik ×3 dla bohatera pasującego do SCHEMATU lub MASTERMINDA
```

**Villainowie i Henchmen są wciąż losowani uniformnie** — silnik nie uwzględnia jeszcze `villain.countersNeeded`.

---

## Co pozostało do zrobienia

### 1. Rozbudowa `synergyEngineMode` o Villainów ⏳ **PRIORYTET**

Aktualnie silnik wybiera Villainów losowo (`uniformSample`). Należy:

**a) Uwzględnić `villain.countersNeeded` przy doborze bohaterów:**

```typescript
// W synergyEngine.ts — rozszerzyć neededCounters o tagi wylosowanych villainów
const neededCounters = [
  ...new Set([
    ...scheme.countersNeeded,
    ...mastermind.countersNeeded,
    ...selectedVillains.flatMap(v => v.countersNeeded),  // ← DO DODANIA
  ]),
];
```

Problem: villainowie są losowani w `SmartRandomizerEngine.ts` PRZED doborem bohaterów, więc synergyEngine musi otrzymać `selectedVillains` jako parametr.

**b) Opcjonalnie: inteligentny dobór Villainów wg synergii ze Schematem/Mastermindem:**

Pole `VillainGroup.theme` jest puste — można rozważyć jego wypełnienie i używanie do doboru Villainów pasujących tematycznie do Masterminda (np. `alwaysLeads` Masterminda sugeruje grupę Villainów).

### 2. `Scheme.overrides` — specjalne setupy ⏳

Pole `overrides: { heroCountMod?, extraVillains?, specialSetup? }` jest puste dla wszystkich schematów. Wiele schematów wymaga niestandardowej liczby bohaterów lub Villainów:

- Schematy z `Setup: Add an extra Hero` → `heroCountMod: +1`
- Schematy z `Setup: Add an extra Villain Group` → `extraVillains: +1`
- Schematy z `Setup: 6 Heroes` (zamiast standardowych 5) → `heroCountMod: +1`
- Schematy z `Setup: 8 Heroes in Hero Deck` → `heroCountMod: +3`

Można derywować automatycznie z tekstu kart w `deriveSchemeOverrides()`.

### 3. `Henchman.countersNeeded` ⏳

Słudzy nie mają żadnych pól analitycznych. Zazwyczaj wybierani losowo, ale kilka grup jest szczególnie agresywnych (np. HYDRA Soldiers z Ambush, Maggia Goons). Niska priorytetowość.

### 4. `VillainGroup.theme` ⏳

Pole `theme: string` jest puste. Niska priorytetowość — `countersNeeded` w zupełności wystarczy do synergii.

---

## Architektura systemu kontr

```
CounterTag = string  (np. "wound-removal", "deck-thinning", "heavy-hitter"...)

Hero.countersProvided  ←→  Scheme.countersNeeded        ✅
Hero.countersProvided  ←→  Mastermind.countersNeeded    ✅
Hero.countersProvided  ←→  VillainGroup.countersNeeded  ← dane gotowe, silnik czeka ⏳
```

Przepływ danych w `SmartRandomizerEngine.ts`:
```
generateSetup()
  1. losuj Mastermind + Scheme               (uniformSample)
  2. losuj Villains + Henchmen               (uniformSample — do zastąpienia przez synergyEngine)
  3. dobierz Heroes wg trybu:
     - 'random'   → uniformSample
     - 'smart'    → smartEqualizerMode
     - 'dustOff'  → dustOffMode
     - 'synergy'  → synergyEngineMode(scheme, mastermind)  ← brakuje villain counters
```

---

## Słownik używanych tagów `CounterTag`

| Tag | Znaczenie |
|---|---|
| `extra-draws` | bohater dobiera dodatkowe karty |
| `deck-thinning` | bohater KOuje karty z talii |
| `bystander-rescue` | bohater ratuje Bystanders |
| `wound-removal` | bohater usuwa/leczy Wounds |
| `wound-deal` | bohater zadaje Wounds Villainowi/Mastermindowi |
| `recruit-boost` | bohater generuje dużo Recruitu |
| `heavy-hitter` | bohater ma wysoką siłę ataku |
| `villain-control` | bohater przesuwa/kontroluje Villainów |
| `top-deck-control` | bohater manipuluje wierzchem talii |
| `multi-class` | bohater ma wiele klas Hero |
| `undercover` | bohater używa mechaniki Undercover |
| `size-changing` | bohater używa Size-Changing |
| `time-travel` | bohater używa Man/Woman Out of Time |
| `ambush` | bohater używa mechaniki Ambush |
| `focus` | bohater używa mechaniki Focus |
| `empowered` | bohater używa mechaniki Empowered |
| `savior` | bohater używa mechaniki Savior |
| `conqueror` | bohater używa mechaniki Conqueror |
| `dark-memories` | bohater używa Dark Memories |
| `sidekick` | bohater generuje Sidekicki |
| `shield-synergy` | bohater synergizuje z S.H.I.E.L.D. |
| `henchman-synergy` | bohater synergizuje z Henchmanami |
| `aoe` | bohater uderza wielu Villainów naraz |
| `discard` | bohater używa efektów odrzucania |
| `discard-attack` | bohater zmusza innych do odrzucania |
| `location-control` | bohater kontroluje lokacje w mieście |
| `artifact-synergy` | bohater używa Artefaktów |
| `wound-synergy` | bohater synergizuje z Wounds |
| `transform` | bohater używa mechaniki Transform |
| `villain-ally-synergy` | bohater synergizuje z Ally/Lair (Villains exp.) |
| `dodge-offense` | bohater używa Dodge ofensywnie |
| `city-control` | bohater kontroluje miasta/Patrol |
| `bystander-control` | świadome unikanie nadmiaru Bystanders w VP |

---

## Skrypty pomocnicze (Python)

- `scripts/assign_hero_metadata.py` — derywuje `primaryClasses`, `keywords`, `countersProvided` dla bohaterów
- `scripts/assign_mastermind_counters.py` — derywuje `countersNeeded` dla mastermindów

Logika obu skryptów jest powielona w `src/utils/jsonMigration.ts` (TypeScript) — migracja jest idempotentna.

