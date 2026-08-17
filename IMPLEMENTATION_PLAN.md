# 🦸 Legendary Randomizer – Plan Implementacji PWA

> **Cel projektu:** Progresywna aplikacja webowa (PWA) działająca w 100% offline, służąca do inteligentnego przygotowywania rozgrywki i śledzenia statystyk w grze **"Legendary: A Marvel Deck Building Game"**. Przeznaczona na urządzenia mobilne z Androidem.

---

## 📋 Spis treści

1. [Wymagane umiejętności (Tech Skills)](#-wymagane-umiejętności-tech-skills)
2. [Architektura i struktura projektu](#-architektura-i-struktura-projektu)
3. [Schemat danych](#-schemat-danych)
4. [Fazy implementacji](#-fazy-implementacji)
5. [Silnik losowania – Smart Equalizer](#-silnik-losowania--smart-equalizer)
6. [Interfejs użytkownika](#-interfejs-użytkownika)
7. [Strategia testowania](#-strategia-testowania)
8. [Ryzyka i mitygacje](#-ryzyka-i-mitygacje)

---

## 🧠 Wymagane umiejętności (Tech Skills)

### Core Frontend
| Technologia | Poziom | Zastosowanie |
|---|---|---|
| **React 18+** | ★★★★★ | Komponenty UI, zarządzanie stanem, hooki |
| **TypeScript 5+** | ★★★★☆ | Silne typowanie, interfejsy kart, generyki dla silnika losowania |
| **Vite 5+** | ★★★☆☆ | Build tool, konfiguracja aliasów, optymalizacja bundle |
| **Tailwind CSS 3+** | ★★★★☆ | Mobile-first styling, dark mode, animacje |

### Zarządzanie stanem
| Technologia | Poziom | Zastosowanie |
|---|---|---|
| **Zustand** | ★★★☆☆ | Globalny stan aplikacji (aktywne filtry, wylosowany setup) |
| **React Query (TanStack)** | ★★★☆☆ | Synchronizacja danych z IndexedDB, cache, invalidation |

### Offline & PWA
| Technologia | Poziom | Zastosowanie |
|---|---|---|
| **Vite PWA Plugin** | ★★★☆☆ | Generowanie Service Worker, manifest, cache strategy |
| **Workbox** | ★★★☆☆ | Cache strategies (Cache First, Network First), precaching |
| **IndexedDB** | ★★★☆☆ | Lokalna baza danych przeglądarkowa |
| **Dexie.js 4+** | ★★★★☆ | Wrapper IndexedDB: migracje schematu, reaktywne zapytania (`useLiveQuery`) |

### Algorytmy i logika
| Umiejętność | Poziom | Zastosowanie |
|---|---|---|
| **Weighted Random Selection** | ★★★★☆ | Algorytm `SmartRandomizerEngine` – serce aplikacji |
| **Algebra liniowa (podstawy)** | ★★☆☆☆ | Wzór na wagę bohatera W(h), normalizacja wag |
| **Programowanie funkcyjne** | ★★★☆☆ | Czyste funkcje w module silnika, kompozycja transformacji |

### Import/Export & Pliki
| Technologia | Poziom | Zastosowanie |
|---|---|---|
| **File System Access API** | ★★★☆☆ | Import pliku `cards.json` z pamięci urządzenia |
| **Blob / URL.createObjectURL** | ★★☆☆☆ | Eksport kopii zapasowej statystyk |
| **JSON Schema / Zod** | ★★★☆☆ | Walidacja importowanego pliku JSON przed wczytaniem do DB |

### Tooling & DevOps
| Technologia | Poziom | Zastosowanie |
|---|---|---|
| **ESLint + Prettier** | ★★★☆☆ | Jednolity styl kodu |
| **Vitest** | ★★★☆☆ | Testy jednostkowe silnika losowania |
| **Lighthouse** | ★★☆☆☆ | Audyt PWA, wydajności i dostępności |

---

## 📁 Architektura i struktura projektu

```
legendary-randomizer/
├── public/
│   ├── icons/                    # Ikony PWA (512x512, 192x192, maskable)
│   └── manifest.webmanifest      # Generowany przez Vite PWA Plugin
│
├── src/
│   ├── assets/
│   │   └── cards.json            # ⚠️ UWAGA: istniejące pliki JSON z /json/ zostaną
│   │                             # zmigrowane i wzbogacone o tagi do nowego formatu
│   │
│   ├── components/               # Komponenty wielokrotnego użytku (Atomic Design)
│   │   ├── ui/                   # Atomowe: Button, Badge, Card, Modal, Spinner
│   │   ├── game/                 # Molekuły: HeroCard, MastermindCard, SchemeCard
│   │   └── layout/               # Organizmy: BottomNav, PageHeader, FilterPanel
│   │
│   ├── db/
│   │   ├── schema.ts             # Konfiguracja Dexie.js + migracje wersji
│   │   └── hooks/
│   │       ├── useHeroStats.ts   # Hook: odczyt/zapis statystyk bohatera
│   │       └── useMatchLog.ts    # Hook: historia meczów
│   │
│   ├── engine/
│   │   ├── SmartRandomizerEngine.ts    # 🧠 Główny silnik losowania ważonego
│   │   ├── weightCalculator.ts         # Wzór W(h): obliczanie wag
│   │   ├── modes/
│   │   │   ├── smartEqualizer.ts       # Tryb domyślny
│   │   │   ├── dustOff.ts              # Tryb "Półka Wstydu"
│   │   │   └── synergyEngine.ts        # Tryb synergii klas/keywords
│   │   └── utils/
│   │       └── weightedSample.ts       # Algorytm ważonego losowania (bez powtórzeń)
│   │
│   ├── pages/
│   │   ├── SetupPage.tsx         # Ekran generowania rozgrywki
│   │   ├── StatsPage.tsx         # Statystyki i historia meczów
│   │   ├── DatabasePage.tsx      # Baza kart + import/export
│   │   └── SettingsPage.tsx      # Konfiguracja Alpha (α), filtr dodatków
│   │
│   ├── store/
│   │   └── useAppStore.ts        # Zustand: stan globalny (filtry, setup, tryb)
│   │
│   ├── types/
│   │   ├── cards.ts              # Typy danych kart (Hero, Mastermind, Scheme...)
│   │   └── stats.ts              # Typy danych statystyk (MatchLog, HeroStats...)
│   │
│   ├── utils/
│   │   ├── jsonMigration.ts      # Migracja starych JSON do nowego formatu z tagami
│   │   └── importExport.ts       # Logika importu/eksportu pliku JSON
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── json/                         # 📂 Istniejące dane (do migracji)
│   ├── expansions.json
│   ├── hero.json
│   ├── mastermind.json
│   ├── scheme.json
│   ├── villain.json
│   └── henchman.json
│
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

### Uwaga o istniejących danych
Pliki w katalogu `/json/` zawierają już bogaty zbiór danych (42 dodatki, setki kart). Strategia migracji:
- `setId` → mapowane na `expansionId`
- `teamId` / `teamLabel` → stają się `faction`
- Nowe pola (`powerLevel`, `keywords`, `primaryClasses`) będą uzupełniane stopniowo (faza 3)
- Stara struktura `cards[]` wewnątrz bohatera pozostaje niezmieniona

---

## 📐 Schemat danych

### `src/types/cards.ts`

```typescript
// Typy bazowe
export type HeroClass = 'Covert' | 'Instinct' | 'Ranged' | 'Strength' | 'Tech';
export type Keyword = string; // np. "X-Men", "Spider Friends", "Avengers"
export type CounterTag = string; // np. "wall-crawler", "cosmic", "mutant"

export interface Expansion {
  id: number;
  label: string;
  value: string;
  initials: string;
  cardTypes: number[];
}

export interface HeroCard {
  name: string;
  quantity: number;
  cost: number;
  class: HeroClass;
  attack: string;
  recruit: string;
  abilities: string;
}

export interface Hero {
  id: string;
  name: string;
  expansionId: number;           // dawniej setId
  faction: string;               // dawniej teamLabel
  primaryClasses: HeroClass[];   // 🆕 Tagi klas
  keywords: Keyword[];           // 🆕 Tagi słów kluczowych
  powerLevel: 1 | 2 | 3 | 4 | 5; // 🆕 Siła (1-5)
  countersProvided: CounterTag[]; // 🆕 Co bohater "kontruje"
  cards: HeroCard[];
}

export interface Mastermind {
  id: string;
  name: string;
  expansionId: number;
  difficulty: 1 | 2 | 3 | 4 | 5; // 🆕
  alwaysLeads: string;            // 🆕 Nazwa grupy łotrów (wyodrębniona z `abilities`)
  theme: string;                  // 🆕 np. "cosmic", "street-level", "mutant"
  vp: number | null;
  cards: MastermindCard[];
}

export interface Scheme {
  id: string;
  name: string;
  expansionId: number;
  difficulty: 1 | 2 | 3 | 4 | 5; // 🆕
  countersNeeded: CounterTag[];   // 🆕 Jakich bohaterów potrzeba do wygrania
  overrides: {                    // 🆕 Modyfikatory setupu
    heroCountMod?: number;        // np. +1 hero
    extraVillains?: number;       // np. dodatkowa grupa łotrów
    specialSetup?: string;        // opis specjalnego setupu
  };
  cards: SchemeCard[];
}

export interface VillainGroup {
  id: string;
  name: string;
  expansionId: number;
  theme: string;                  // 🆕 np. "Sinister", "Hydra"
  cards: VillainCard[];
}

export interface Henchman {
  id: string;
  name: string;
  expansionId: number;
  cards: HenchmanCard[];
}

export interface CardsDatabase {
  expansions: Expansion[];
  heroes: Hero[];
  masterminds: Mastermind[];
  schemes: Scheme[];
  villains: VillainGroup[];
  henchmen: Henchman[];
}
```

### `src/types/stats.ts`

```typescript
export type MatchResult = 'win' | 'loss';

export interface MatchLog {
  id?: number;                  // Auto-increment w Dexie
  date: string;                 // ISO 8601: "2026-08-17T20:30:00Z"
  result: MatchResult;
  score?: number;               // Punkty VP (opcjonalne)
  playerCount: number;          // Liczba graczy (1-5)
  mastermindId: string;
  schemeId: string;
  heroIds: string[];
  villainIds: string[];
  henchmanIds: string[];
  randomizationMode: 'smart' | 'dustOff' | 'synergy' | 'manual';
}

export interface HeroStats {
  heroId: string;               // Primary key
  playCount: number;            // Łączna liczba rozgrywek
  wins: number;
  losses: number;
  lastPlayedAt: string;         // ISO 8601 lub "" jeśli nigdy
}

export interface AppSettings {
  id?: number;
  alpha: number;                // Współczynnik α (0.5 - 2.0), default: 1.0
  selectedExpansionIds: number[]; // Aktywne dodatki
  heroCount: number;            // Liczba bohaterów (default: 5)
}
```

---

## 🗓️ Fazy implementacji

### FAZA 0 – Scaffold & Konfiguracja (Dzień 1-2)

**Cel:** Działający projekt Vite + React + TS z PWA

**Kroki:**
```bash
# 1. Inicjalizacja projektu
npm create vite@latest legendary-randomizer -- --template react-ts

# 2. Instalacja zależności
npm install dexie react-dexie-hooks zustand @tanstack/react-query
npm install -D vite-plugin-pwa tailwindcss @tailwindcss/vite
npm install zod                  # walidacja JSON przy imporcie
npm install lucide-react         # ikony
```

**Pliki do stworzenia:**
- [ ] `vite.config.ts` z `VitePWA({ registerType: 'autoUpdate', ... })`
- [ ] `tailwind.config.ts` z rozszerzeniem kolorów (Marvel red/gold theme)
- [ ] `src/main.tsx` z `QueryClientProvider` + `Suspense`
- [ ] Manifest PWA: `name`, `theme_color: #C41E3A` (Marvel red), `display: standalone`

---

### FAZA 1 – Typy i Baza Danych (Dzień 3-4)

**Cel:** Działające typy TS + Dexie schema + seed danych

**Pliki do stworzenia:**
- [ ] `src/types/cards.ts` – wszystkie interfejsy kart (patrz sekcja Schemat danych)
- [ ] `src/types/stats.ts` – `MatchLog`, `HeroStats`, `AppSettings`
- [ ] `src/db/schema.ts` – konfiguracja Dexie z migracjami

```typescript
// src/db/schema.ts – szkielet
import Dexie, { type EntityTable } from 'dexie';
import type { MatchLog, HeroStats, AppSettings } from '../types/stats';

const db = new Dexie('LegendaryDB') as Dexie & {
  matchLog: EntityTable<MatchLog, 'id'>;
  heroStats: EntityTable<HeroStats, 'heroId'>;
  settings: EntityTable<AppSettings, 'id'>;
};

db.version(1).stores({
  matchLog: '++id, date, result, mastermindId, schemeId',
  heroStats: 'heroId, playCount, lastPlayedAt',
  settings: '++id',
});

export { db };
```

- [ ] `src/db/hooks/useHeroStats.ts` – hook CRUD dla statystyk bohatera
- [ ] `src/db/hooks/useMatchLog.ts` – hook listy meczów + zapis nowego

**Migracja istniejących JSON:**
- [ ] `src/utils/jsonMigration.ts` – skrypt mapujący `setId→expansionId`, `teamLabel→faction`
- [ ] Wynikowy plik `src/assets/cards.json` ze zmigrowanymi danymi

---

### FAZA 2 – Silnik losowania (Dzień 5-7)

**Cel:** W pełni działający `SmartRandomizerEngine`

**Pliki do stworzenia:**
- [ ] `src/engine/utils/weightedSample.ts`
- [ ] `src/engine/weightCalculator.ts`
- [ ] `src/engine/modes/smartEqualizer.ts`
- [ ] `src/engine/modes/dustOff.ts`
- [ ] `src/engine/modes/synergyEngine.ts`
- [ ] `src/engine/SmartRandomizerEngine.ts` – fasada

**Testy (Vitest):**
- [ ] Test jednostkowy: `weightCalculator` – czy alfa=2.0 faworyzuje rzadziej granych
- [ ] Test jednostkowy: `weightedSample` – czy zawsze zwraca unikalne karty
- [ ] Test integracyjny: `dustOff` – czy zwraca ≤20% najrzadziej granych

---

### FAZA 3 – UI Core (Dzień 8-12)

**Cel:** Działający ekran Setup Generator

**Kolejność budowania komponentów:**

```
1. Atomowe (src/components/ui/)
   └─ Button, Badge, ToggleChip, CardSlot, Spinner, Modal

2. Nawigacja
   └─ BottomNav (4 ikony: Setup / Stats / Baza / Ustawienia)

3. SetupPage
   ├─ ExpansionFilter    – wybór dodatków (ToggleChip dla każdego z 42 dodatków)
   ├─ ModeSelector       – Smart / Dust Off / Synergy
   ├─ GenerateButton     – wywołuje SmartRandomizerEngine
   └─ SetupResult        – wyświetla wylosowane karty z re-roll

4. Formularz "Zapisz Mecz" (SaveMatchForm – modal 3-krokowy)
   ├─ Krok 1: Win / Loss (duże przyciski)
   ├─ Krok 2: Wpisz punkty VP (opcjonalne, input numeryczny)
   └─ Krok 3: Podgląd i potwierdzenie → zapis do DB
```

---

### FAZA 4 – Ekrany pomocnicze (Dzień 13-16)

**Cel:** Stats, Historia, Baza, Ustawienia

**Pliki do stworzenia:**
- [ ] `src/pages/StatsPage.tsx`
  - Lista 10 ostatnich meczów
  - Top 5 najczęściej/najrzadziej granych bohaterów
  - Wykres win/loss (SVG lub `recharts`)

- [ ] `src/pages/DatabasePage.tsx`
  - Importowanie `cards.json` (walidacja Zod → zapis do DB)
  - Eksport kopii zapasowej statystyk (JSON download)
  - Import kopii zapasowej statystyk

- [ ] `src/pages/SettingsPage.tsx`
  - Suwak współczynnika Alpha (α): 0.5 – 2.0
  - Domyślna liczba graczy
  - Przycisk "Resetuj statystyki"

---

### FAZA 5 – PWA Hardening & Optymalizacja (Dzień 17-18)

**Cel:** Certyfikacja PWA, pełna praca offline

**Zadania:**
- [ ] Konfiguracja Workbox `Cache First` dla `cards.json` i assets
- [ ] Konfiguracja Workbox `Network First` dla żądań dynamicznych (fallback offline)
- [ ] Ikony PWA we wszystkich wymaganych rozmiarach (72, 96, 128, 144, 152, 192, 384, 512)
- [ ] Ikona `maskable` dla Androida (safe zone 80%)
- [ ] Audyt Lighthouse: cel PWA Score ≥ 90, Performance ≥ 80
- [ ] Test na fizycznym urządzeniu Android: "Dodaj do ekranu głównego"
- [ ] `meta[theme-color]` zsynchronizowany z manifest

---

### FAZA 6 – Tagowanie kart (ongoing, po MVP)

**Cel:** Uzupełnienie tagów dla Silnika Synergii

**Priorytety tagowania (kolejność wg popularności dodatku):**
1. Core Set (42 bohaterów bez tagów `countersProvided`)
2. Dark City
3. Secret Wars Vol. 1 & 2
4. X-Men
5. ...kolejne dodatki

**Narzędzie pomocnicze:**
- [ ] `src/pages/TagEditorPage.tsx` (hidden route) – formularz szybkiego tagowania kart przez użytkownika

---

## 🧮 Silnik losowania – Smart Equalizer

### Wzór na wagę bohatera

$$W(h) = \frac{1}{(\text{playCount}(h) + 1)^{\alpha}} \cdot \Delta t(h)$$

Gdzie:
- **playCount(h)** – liczba rozgrywek danym bohaterem (z `HeroStats.playCount`)
- **α (alpha)** – konfigurowalny współczynnik [0.5–2.0]; im wyższy, tym silniejsza penalizacja często granych
- **Δt(h)** – liczba gier od ostatniego użycia bohatera (cooldown bonus)

### Implementacja `Δt(h)` (Cooldown)

```
Δt(h) = (totalMatchesPlayed - matchIndexOfLastPlay(h)) + 1
```

Jeśli bohater nigdy nie grał → `Δt(h) = totalMatchesPlayed + 1` (maksymalny bonus).

### Algorytm `weightedSample(heroes, k, weights)`

```
1. Oblicz sumę wszystkich wag: S = Σ W(h_i)
2. Dla i = 1..k:
   a. Wylosuj r = random() * S
   b. Iteruj po tablicy bohaterów, odejmując W(h_i) od r
   c. Gdy r ≤ 0 → wybrany bohater h_i
   d. Usuń h_i z puli, zaktualizuj S
3. Zwróć wybranych k bohaterów
```

Złożoność: **O(n·k)** – akceptowalna dla n ≤ 500 bohaterów.

### Tryby losowania

| Tryb | Opis | Filtr wejściowy |
|---|---|---|
| **Smart Equalizer** | Pełna pula z wagami W(h) | Aktywne dodatki |
| **Dust Off** | Tylko 20% najrzadziej granych | Sortuj rosnąco po playCount, weź górne 20% |
| **Synergy Engine** | Priorytet dla bohaterów z `countersProvided` ∩ `scheme.countersNeeded` | Wagi przemnożone ×3 dla pasujących |

---

## 🎨 Interfejs użytkownika

### Konwencje wizualne

| Element | Styl |
|---|---|
| Kolorystyka | Czarne tło `#0A0A0A`, akcenty Marvel Red `#C41E3A`, złoto `#FFD700` |
| Typografia | `Inter` jako font bazowy, `font-mono` dla statystyk |
| Karty | `rounded-2xl`, `shadow-lg`, gradient obwódki wg klasy bohatera |
| Klasy bohaterów | Covert=fiolet, Instinct=żółty, Ranged=niebieski, Strength=czerwony, Tech=szary |
| Animacje | `transition-all`, `animate-pulse` przy generowaniu, `animate-bounce` przy re-roll |
| Nawigacja | Fixed bottom bar, 4 ikony, active state czerwony |

### Mobile-first breakpoints
```
xs: 360px (Galaxy A-series) → layout bazowy
sm: 390px (Pixel 8)         → drobne korekty paddingów
md: 768px (tablet)          → opcjonalne 2-kolumnowe gridy
```

### Ekran Setup Generator – flow

```
[Wybór dodatków] ←→ [Tryb losowania] → [GENERUJ] 
                                            ↓
                                    [Karta: Mastermind]
                                    [Karta: Scheme]
                                    [Karty: Villains (+ re-roll)]
                                    [Karty: Henchmen (+ re-roll)]
                                    [Karty: Heroes (+ re-roll każdego)]
                                            ↓
                                    [Zapisz mecz po grze]
```

---

## 🧪 Strategia testowania

### Testy jednostkowe (Vitest)
```
src/engine/__tests__/
├── weightCalculator.test.ts     # Testy wzoru W(h) dla α=0.5, 1.0, 2.0
├── weightedSample.test.ts       # Unikalność wyników, rozkład statystyczny
├── smartEqualizer.test.ts       # Integracja z mockami DB
└── dustOff.test.ts              # Poprawność progu 20%
```

### Testy manualne (checklist Android)
- [ ] Instalacja PWA przez Chrome → "Dodaj do ekranu głównego"
- [ ] Tryb lotniczy → aplikacja w pełni działa offline
- [ ] Import pliku JSON → walidacja błędnego formatu
- [ ] Eksport → plik zapisuje się do Pobrane/
- [ ] Re-roll pojedynczej karty działa bez zmiany pozostałych
- [ ] Formularz 3-krokowy → dane zapisują się w IndexedDB

---

## ⚠️ Ryzyka i mitygacje

| Ryzyko | Prawdopodobieństwo | Mitygacja |
|---|---|---|
| Migracja ~500 kart bez tagów | Wysokie | Etapowe tagowanie; engine działa bez tagów (fallback: pełna waga) |
| IndexedDB blokada w trybie prywatnym | Średnie | Informacja dla użytkownika + graceful degradation |
| File System Access API – brak wsparcia | Niskie (Chrome Android OK) | Fallback: `<input type="file">` |
| Bundle size > 500kB | Niskie | Code splitting per-page, lazy loading |
| PWA update w tle bez powiadomienia | Średnie | `registerType: 'prompt'` + baner "Dostępna aktualizacja" |

---

## 📦 Kluczowe zależności (package.json)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "dexie": "^4.0.8",
    "dexie-react-hooks": "^1.1.7",
    "zustand": "^4.5.4",
    "@tanstack/react-query": "^5.51.0",
    "zod": "^3.23.8",
    "lucide-react": "^0.414.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.5",
    "typescript": "^5.5.4",
    "tailwindcss": "^3.4.9",
    "@tailwindcss/vite": "^4.0.0",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.0"
  }
}
```

---

## 🚀 Quick Start – pierwsze uruchomienie

```bash
# Klonowanie i instalacja
cd legendary-randomizer
npm install

# Uruchomienie dev server
npm run dev

# Build produkcyjny (z generowaniem SW)
npm run build

# Podgląd build (test PWA lokalnie)
npm run preview

# Testy jednostkowe
npm run test
```

---

*Plan przygotowany: 2026-08-17*  
*Wersja: 1.0.0*  
*Następny krok: FAZA 0 – Scaffold projektu Vite + React + TS*

