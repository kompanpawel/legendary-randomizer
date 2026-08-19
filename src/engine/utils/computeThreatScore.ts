import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '@/types/cards.ts';
import type { MastermindStats, SchemeStats } from '@/types/stats.ts';
import { blendedStrength } from '@/utils/blendedStrength.ts';

/** Wagi składowych finalnego ThreatScore */
const POWER_WEIGHT   = 0.30;
const COUNTER_WEIGHT = 0.70;

/**
 * Pomocnicza — oblicza blended strength masterminda (uwzględnia tryb Epic).
 */
function mastermindBlended(
  mastermind: Mastermind,
  mastermindStats: MastermindStats | undefined,
  isEpic: boolean
): number {
  if (isEpic && mastermindStats) {
    return blendedStrength(
      mastermind.difficulty,
      mastermindStats.epicPlayCount ?? 0,
      mastermindStats.epicWins ?? 0,
      1
    );
  }
  return blendedStrength(
    mastermind.difficulty,
    mastermindStats?.playCount ?? 0,
    mastermindStats?.wins ?? 0,
    0
  );
}

/**
 * PRE-SELECTION threat score (wyłącznie power-based).
 * Używany do biasowania losowania bohaterów ZANIM zostaną wybrani.
 *
 * threatScore ∈ [2, 10] = mastermindStrength (1–5) + schemeStrength (1–5)
 */
export function computeThreatScore(
  mastermind: Mastermind,
  mastermindStats: MastermindStats | undefined,
  isEpic: boolean,
  scheme: Scheme,
  schemeStats: SchemeStats | undefined
): number {
  const mmStrength = mastermindBlended(mastermind, mastermindStats, isEpic);
  const scStrength = blendedStrength(
    scheme.difficulty,
    schemeStats?.playCount ?? 0,
    schemeStats?.wins ?? 0,
    0
  );
  return mmStrength + scStrength; // 2–10
}

// ────────────────────────────────────────────────────────────────────────────

/** Szczegółowe informacje o pokryciu kontrników przez drużynę. */
export interface CounterCoverage {
  /** Wszystkie unikalne counter tagi wymagane przez wrogów */
  neededCounters: string[];
  /** Tagi pokryte przez co najmniej jednego bohatera */
  coveredCounters: string[];
  /** Tagi NIEpokryte przez żadnego bohatera */
  uncoveredCounters: string[];
  /** Stosunek pokrycia 0.0–1.0 (1.0 = wszystkie pokryte) */
  coverageRatio: number;
}

/**
 * POST-SELECTION threat score — WYŚWIETLANY graczom.
 *
 * Formuła (zakres 2–10):
 *   powerScore     = mastermindStr + schemeStr           [2–10] (jak wcześniej)
 *   counterGapScore = (1 − coverageRatio) × 8 + 2        [2–10]
 *                     2 = wszystkie countery pokryte
 *                    10 = żaden counter nie pokryty
 *
 *   finalThreat = powerScore × 0.30 + counterGapScore × 0.70
 *
 * Jeśli wrogowie nie mają żadnych countersNeeded → fallback na sam powerScore.
 */
export function computeFullThreatScore(
  heroes: Hero[],
  mastermind: Mastermind,
  mastermindStats: MastermindStats | undefined,
  isEpic: boolean,
  scheme: Scheme,
  schemeStats: SchemeStats | undefined,
  selectedVillains: VillainGroup[],
  selectedHenchmen: Henchman[]
): { threatScore: number; counterCoverage: CounterCoverage } {
  // --- Power component (30%) ---
  const mmStrength = mastermindBlended(mastermind, mastermindStats, isEpic);
  const scStrength = blendedStrength(
    scheme.difficulty,
    schemeStats?.playCount ?? 0,
    schemeStats?.wins ?? 0,
    0
  );
  const powerScore = mmStrength + scStrength; // 2–10

  // --- Counter coverage component (70%) ---
  const neededSet = new Set<string>([
    ...mastermind.countersNeeded,
    ...scheme.countersNeeded,
    ...selectedVillains.flatMap(v => v.countersNeeded),
    ...selectedHenchmen.flatMap(h => h.countersNeeded),
  ]);

  const neededCounters = [...neededSet];

  if (neededCounters.length === 0) {
    // Brak danych o kontrnikach — używamy tylko power score
    return {
      threatScore: parseFloat(powerScore.toFixed(2)),
      counterCoverage: {
        neededCounters: [],
        coveredCounters: [],
        uncoveredCounters: [],
        coverageRatio: 1, // brak wymagań = w pełni "pokryte"
      },
    };
  }

  const heroProvidedSet = new Set<string>(heroes.flatMap(h => h.countersProvided));

  const coveredCounters   = neededCounters.filter(c => heroProvidedSet.has(c));
  const uncoveredCounters = neededCounters.filter(c => !heroProvidedSet.has(c));
  const coverageRatio     = coveredCounters.length / neededCounters.length;

  // counterGapScore: 2 (pełne pokrycie) → 10 (brak pokrycia)
  const counterGapScore = (1 - coverageRatio) * 8 + 2;

  const threatScore = parseFloat(
    (powerScore * POWER_WEIGHT + counterGapScore * COUNTER_WEIGHT).toFixed(2)
  );

  return {
    threatScore,
    counterCoverage: {
      neededCounters,
      coveredCounters,
      uncoveredCounters,
      coverageRatio: parseFloat(coverageRatio.toFixed(3)),
    },
  };
}
