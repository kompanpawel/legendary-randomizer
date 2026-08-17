# 🤖 AI Skills – Legendary Randomizer PWA

> Dokument opisuje wymagane umiejętności i kontekst dla modelu AI implementującego aplikację.  
> Czytaj łącznie z `IMPLEMENTATION_PLAN.md`.

---

## 1. Scaffold projektu (FAZA 0)

### Vite + React + TypeScript
- Inicjalizacja projektu: `npm create vite@latest . -- --template react-ts` (w istniejącym katalogu)
- Konfiguracja `vite.config.ts`:
  - alias `@/` → `src/`
  - plugin `@vitejs/plugin-react`
  - plugin `vite-plugin-pwa` z `registerType: 'autoUpdate'` i `workbox.globPatterns`
- `tsconfig.json`: `"paths": { "@/*": ["./src/*"] }`, `"strict": true`

### PWA Manifest
```json
{
  "name": "Legendary Randomizer",
  "short_name": "Legendary",
  "theme_color": "#C41E3A",
  "background_color": "#0A0A0A",
  "display": "standalone",
  "orientation": "portrait"
}
```
- Ikony: 192×192 i 512×512 (plik PNG w `public/icons/`)
- Ikona maskable z 80% safe zone

### Tailwind CSS
- Instalacja: `npm install -D tailwindcss @tailwindcss/vite`  
- `tailwind.config.ts` z rozszerzeniem `colors`:
  ```ts
  marvel: { red: '#C41E3A', gold: '#FFD700' }
  ```
- Dodanie do `vite.config.ts` jako plugin (nie PostCSS w v4)
- `@import "tailwindcss"` w `src/index.css`

---

## 2. TypeScript – Typy danych

### Plik `src/types/cards.ts`
Zdefiniuj dokładnie te interfejsy (nie zmieniaj nazw):
- `HeroClass` = `'Covert' | 'Instinct' | 'Ranged' | 'Strength' | 'Tech'`
- `Expansion`, `Hero`, `HeroCard`, `Mastermind`, `MastermindCard`
- `Scheme`, `SchemeCard`, `VillainGroup`, `VillainCard`, `Henchman`, `HenchmanCard`
- `CardsDatabase` – główny obiekt agregujący wszystkie tablice

### Plik `src/types/stats.ts`
- `MatchResult = 'win' | 'loss'`
- `MatchLog` (pole `id?: number` – auto-increment Dexie)
- `HeroStats` (klucz główny: `heroId: string`)
- `AppSettings` (klucz główny: `id?: number`)

### Wzorce TypeScript
- `readonly` dla tablic kart w typach (zapobieganie mutacji)
- Generyki w silniku: `weightedSample<T>(items: T[], k: number, weights: number[]): T[]`
- Discriminated unions dla trybów losowania: `type RandomizationMode = 'smart' | 'dustOff' | 'synergy' | 'manual'`

---

## 3. Dexie.js – IndexedDB

### Schemat (src/db/schema.ts)
```typescript
import Dexie, { type EntityTable } from 'dexie';

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
```

### Hooks (src/db/hooks/)
- `useHeroStats(heroId)` – `useLiveQuery` z Dexie dla reaktywnego odczytu
- `useMatchLog()` – lista 10 ostatnich + `addMatch(log: Omit<MatchLog, 'id'>)`
- Wzorzec CRUD: `db.heroStats.put(...)`, `db.heroStats.update(...)`, `db.heroStats.get(...)`

### Seed danych
- Przy pierwszym uruchomieniu (Dexie `populate` event) wczytaj `cards.json` do pamięci (NIE do IndexedDB – dane kart są statyczne)
- IndexedDB przechowuje TYLKO statystyki i logi gier

---

## 4. Zustand – Stan globalny

### Store (src/store/useAppStore.ts)
```typescript
interface AppState {
  selectedExpansionIds: number[];
  randomizationMode: RandomizationMode;
  heroCount: number;
  alpha: number;
  currentSetup: GameSetup | null;

  setExpansions: (ids: number[]) => void;
  setMode: (mode: RandomizationMode) => void;
  setSetup: (setup: GameSetup) => void;
  clearSetup: () => void;
}
```
- Użyj `persist` middleware Zustand z `localStorage` (ustawienia przeżywają reload)
- NIE persistuj `currentSetup` – generuj przy każdym uruchomieniu

---

## 5. Silnik losowania (src/engine/)

### weightedSample.ts
```typescript
export function weightedSample<T>(items: T[], k: number, weights: number[]): T[] {
  // Algorytm O(n*k): losuj bez powtórzeń, aktualizuj sumę wag
  const pool = [...items];
  const w = [...weights];
  const result: T[] = [];

  for (let i = 0; i < k && pool.length > 0; i++) {
    const sum = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let j = 0; j < pool.length; j++) {
      r -= w[j];
      if (r <= 0) {
        result.push(pool[j]);
        pool.splice(j, 1);
        w.splice(j, 1);
        break;
      }
    }
  }
  return result;
}
```

### weightCalculator.ts
```typescript
// W(h) = 1 / (playCount + 1)^alpha * deltaT
export function calculateWeight(
  playCount: number,
  lastPlayedIndex: number,   // index meczu, w którym ostatnio grał (lub -1)
  totalMatches: number,
  alpha: number
): number {
  const deltaT = lastPlayedIndex === -1
    ? totalMatches + 1
    : totalMatches - lastPlayedIndex + 1;
  return (1 / Math.pow(playCount + 1, alpha)) * deltaT;
}
```

### Tryby losowania
| Plik | Logika |
|---|---|
| `smartEqualizer.ts` | Wagi W(h) dla wszystkich bohaterów z aktywnych dodatków |
| `dustOff.ts` | Sortuj po `playCount` rosnąco, weź górne 20%, potem `weightedSample` |
| `synergyEngine.ts` | Wagi ×3 dla bohaterów, których `countersProvided` ∩ `scheme.countersNeeded` ≠ ∅ |

### SmartRandomizerEngine.ts (fasada)
```typescript
interface RandomizerInput {
  heroes: Hero[];
  heroStats: HeroStats[];
  masterminds: Mastermind[];
  schemes: Scheme[];
  villains: VillainGroup[];
  henchmen: Henchman[];
  totalMatches: number;
  heroCount: number;
  alpha: number;
  mode: RandomizationMode;
}

interface GameSetup {
  mastermind: Mastermind;
  scheme: Scheme;
  heroes: Hero[];
  villains: VillainGroup[];
  henchmen: Henchman[];
}

export function generateSetup(input: RandomizerInput): GameSetup
```

---

## 6. Migracja JSON (src/utils/jsonMigration.ts)

### Mapowanie starych pól na nowe
```typescript
// Stara struktura (json/hero.json):
// { id, name, setId, teamId, teamLabel, cards[] }

// Nowa struktura (src/assets/cards.json → Hero):
// { id, name, expansionId (=setId), faction (=teamLabel),
//   primaryClasses: [], keywords: [], powerLevel: 3,
//   countersProvided: [], cards[] }
```

- `setId` → `expansionId`
- `teamLabel` → `faction`
- Nowe pola (`primaryClasses`, `keywords`, `powerLevel`, `countersProvided`) uzupełnij wartościami domyślnymi
- Walidacja wynikowego obiektu przez `Zod` przed zapisem do `src/assets/cards.json`

### Zod schema dla CardsDatabase
```typescript
const HeroSchema = z.object({
  id: z.string(),
  name: z.string(),
  expansionId: z.number(),
  faction: z.string(),
  primaryClasses: z.array(HeroClassSchema).default([]),
  keywords: z.array(z.string()).default([]),
  powerLevel: z.number().min(1).max(5).default(3),
  countersProvided: z.array(z.string()).default([]),
  cards: z.array(HeroCardSchema),
});
```

---

## 7. Komponenty UI (src/components/)

### Atomic Design
```
ui/          → Button, Badge, ToggleChip, CardSlot, Spinner, Modal
game/        → HeroCard, MastermindCard, SchemeCard, VillainCard
layout/      → BottomNav, PageHeader, FilterPanel
```

### BottomNav
- Fixed `bottom-0`, 4 zakładki: Setup / Stats / Baza / Ustawienia
- Active state: Marvel Red `#C41E3A`
- Ikony: `lucide-react` (Shuffle, BarChart2, Database, Settings)
- Routing: `react-router-dom` v6 z `<NavLink>`

### HeroCard (Komponent)
```
Props: hero: Hero, stats?: HeroStats, onReroll?: () => void
- Gradient obwódki wg primaryClasses[0]:
  Covert=fiolet, Instinct=żółty, Ranged=niebieski, Strength=czerwony, Tech=szary
- Wyświetla: name, faction, powerLevel (gwiazdki), playCount (jeśli stats)
- Przycisk re-roll (ikona RefreshCw) – wywołuje onReroll
```

### SetupPage flow
1. `ExpansionFilter` – `ToggleChip` dla każdego z 42 dodatków (grid 3 kolumny)
2. `ModeSelector` – 3 przyciski: Smart / Dust Off / Synergy
3. `GenerateButton` – `animate-pulse` podczas generowania
4. `SetupResult` – wyniki w sekcjach (Mastermind, Scheme, Villains, Henchmen, Heroes)
5. `SaveMatchModal` – 3-krokowy modal po grze

---

## 8. Strony (src/pages/)

### SetupPage.tsx
- Pobiera `heroes`, `masterminds` itp. z `cards.json` (import statyczny)
- Pobiera `heroStats` przez `useLiveQuery` z Dexie
- Wywołuje `generateSetup()` i zapisuje w Zustand `currentSetup`

### StatsPage.tsx
- `useLiveQuery(() => db.matchLog.orderBy('date').reverse().limit(10).toArray())`
- Top 5 bohaterów: `db.heroStats.orderBy('playCount').reverse().limit(5).toArray()`
- Wykres win/loss: proste SVG lub `recharts` (`BarChart`)

### DatabasePage.tsx
- Import: `<input type="file" accept=".json">` → FileReader → Zod validate → alert sukcesu
- Eksport statystyk: `JSON.stringify(stats)` → `Blob` → `URL.createObjectURL` → `<a>` click
- Import kopii: FileReader → `db.matchLog.bulkPut(...)` + `db.heroStats.bulkPut(...)`

### SettingsPage.tsx
- Suwak `alpha`: `<input type="range" min="0.5" max="2.0" step="0.1">`
- Domyślna liczba graczy: `<select>` 1–5
- "Resetuj statystyki": `db.matchLog.clear()` + `db.heroStats.clear()` po potwierdzeniu w Modal

---

## 9. PWA & Workbox

### vite-plugin-pwa config
```typescript
VitePWA({
  registerType: 'prompt',        // pokaż baner przy aktualizacji
  includeAssets: ['icons/*.png'],
  manifest: { /* ... */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
    runtimeCaching: [
      {
        urlPattern: /\/assets\/cards\.json$/,
        handler: 'CacheFirst',
        options: { cacheName: 'cards-data', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } }
      }
    ]
  }
})
```

### Update prompt
```typescript
// src/components/ui/UpdatePrompt.tsx
const { needRefresh, updateServiceWorker } = useRegisterSW();
// Jeśli needRefresh[0] === true → pokaż baner "Dostępna aktualizacja"
```

---

## 10. Testy (Vitest)

### Setup
```typescript
// vite.config.ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts']
}
```

### Przykładowe testy
```typescript
// weightCalculator.test.ts
it('alpha=2.0 penalizuje częściej granego bohatera silniej niż alpha=0.5', () => {
  const w1 = calculateWeight(10, -1, 20, 2.0);
  const w2 = calculateWeight(10, -1, 20, 0.5);
  expect(w1).toBeLessThan(w2);
});

// weightedSample.test.ts
it('zwraca k unikalnych elementów', () => {
  const items = [1, 2, 3, 4, 5];
  const weights = [1, 1, 1, 1, 1];
  const result = weightedSample(items, 3, weights);
  expect(result.length).toBe(3);
  expect(new Set(result).size).toBe(3);
});
```

---

## 11. Istniejące pliki JSON (json/)

### Struktura katalogu
```
json/
├── expansions.json   → lista 42 dodatków (id, label, value, initials, cardTypes)
├── hero.json         → ~200+ bohaterów (stara struktura z setId, teamLabel)
├── mastermind.json   → arcywrogowie
├── scheme.json       → schematy rozgrywki
├── villain.json      → grupy łotrów
└── henchman.json     → słudzy
```

### Ważne pola do migracji
| Stare pole | Nowe pole | Uwaga |
|---|---|---|
| `setId` | `expansionId` | zmiana nazwy |
| `teamId` | – | można pominąć |
| `teamLabel` | `faction` | zmiana nazwy |
| brak | `primaryClasses` | domyślnie `[]` |
| brak | `keywords` | domyślnie `[]` |
| brak | `powerLevel` | domyślnie `3` |
| brak | `countersProvided` | domyślnie `[]` |

---

## 12. Konwencje kodu

### Importy
```typescript
// Kolejność: zewnętrzne → wewnętrzne absolutne → relatywne
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import type { Hero } from '@/types/cards';
import { HeroCard } from './HeroCard';
```

### Nazewnictwo plików
- Komponenty React: `PascalCase.tsx`
- Hooki: `useCamelCase.ts`
- Utilities/engine: `camelCase.ts`
- Typy: `camelCase.ts`

### Styling (Tailwind)
- Użyj `clsx` + `tailwind-merge` do łączenia klas warunkowych
- Prefiks `dark:` dla dark mode (domyślny: dark)
- Animacje: `transition-all duration-200`, `animate-pulse`, `animate-bounce`

### Błędy i loading
- Każda strona owinięta w `<ErrorBoundary>` + `<Suspense fallback={<Spinner />}>`
- Błędy Dexie: `try/catch` + toast notification (prosta implementacja bez biblioteki)

---

## 13. Skrypty npm (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext ts,tsx",
    "migrate": "tsx src/utils/jsonMigration.ts"
  }
}
```

---

## 14. Kolejność implementacji (dla modelu AI)

```
1. npm create vite + instalacja paczek
2. Konfiguracja vite.config.ts + tailwind.config.ts
3. src/types/cards.ts + src/types/stats.ts
4. src/utils/jsonMigration.ts → wygeneruj src/assets/cards.json
5. src/db/schema.ts + src/db/hooks/
6. src/store/useAppStore.ts
7. src/engine/ (weightedSample → weightCalculator → tryby → fasada)
8. Testy Vitest dla silnika
9. src/components/ui/ (atomowe)
10. src/components/layout/BottomNav + routing
11. src/pages/SetupPage.tsx (główny ekran)
12. src/pages/StatsPage.tsx
13. src/pages/DatabasePage.tsx
14. src/pages/SettingsPage.tsx
15. PWA hardening (manifest, ikony, Workbox)
16. Audyt Lighthouse
```

---

*Wygenerowano: 2026-08-17*  
*Na podstawie: IMPLEMENTATION_PLAN.md v1.0.0*

