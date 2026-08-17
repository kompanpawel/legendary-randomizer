import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../../types/cards';
import type { HeroStats } from '../../types/stats';
import { weightedSample } from '../utils/weightedSample';
import { calculateWeights, type WeightInput } from '../weightCalculator';
import { blendedStrength } from '../../utils/blendedStrength';
import { powerBiasMultiplier } from '../utils/powerBiasMultiplier';

const SYNERGY_MULTIPLIER = 3;

/**
 * Synergy mode – prioritises heroes that match the counters needed by:
 *   - scheme.countersNeeded    (what the scheme requires to be blocked)
 *   - mastermind.countersNeeded  (what the mastermind requires to be defeated)
 *   - selectedVillains[].countersNeeded  (threats from villain groups)
 *   - selectedHenchmen[].countersNeeded  (threats from henchman groups)
 *
 * Dodatkowo stosuje powerBiasMultiplier, który premiuje bohaterów
 * o sile zbliżonej do poziomu zagrożenia (threatScore).
 */
export function synergyEngineMode(
  heroes: Hero[],
  heroStats: HeroStats[],
  scheme: Scheme,
  mastermind: Mastermind,
  totalMatches: number,
  k: number,
  alpha: number,
  selectedVillains: VillainGroup[] = [],
  selectedHenchmen: Henchman[] = [],
  threatScore: number = 6   // domyślnie neutralny środek skali (2–10)
): Hero[] {
  if (heroes.length === 0) return [];

  const sorted = [...heroStats].sort((a, b) =>
    (a.lastPlayedAt || '').localeCompare(b.lastPlayedAt || '')
  );

  const statsMap = new Map<string, WeightInput>(
    sorted.map((s, idx) => [
      s.heroId,
      { heroId: s.heroId, playCount: s.playCount, lastPlayedIndex: idx },
    ])
  );

  const baseWeights = calculateWeights(
    heroes.map((h) => h.id),
    statsMap,
    totalMatches,
    alpha
  );

  // Combined counters: scheme + mastermind + villains + henchmen (deduped)
  const neededCounters = [
    ...new Set([
      ...scheme.countersNeeded,
      ...mastermind.countersNeeded,
      ...selectedVillains.flatMap((v) => v.countersNeeded),
      ...selectedHenchmen.flatMap((h) => h.countersNeeded),
    ]),
  ];

  const finalWeights = heroes.map((hero, idx) => {
    // Warstwa 1: synergy multiplier (counter matching)
    const synergyMult =
      neededCounters.length > 0 &&
      hero.countersProvided.some((c) => neededCounters.includes(c))
        ? SYNERGY_MULTIPLIER
        : 1;

    // Warstwa 2: difficulty bias (siła bohatera vs zagrożenie)
    const stats = heroStats.find((s) => s.heroId === hero.id);
    const heroStrength = blendedStrength(
      hero.powerLevel,
      stats?.playCount ?? 0,
      stats?.wins ?? 0
    );
    const biasMult = powerBiasMultiplier(heroStrength, threatScore);

    return baseWeights[idx] * synergyMult * biasMult;
  });

  return weightedSample(heroes, k, finalWeights);
}


