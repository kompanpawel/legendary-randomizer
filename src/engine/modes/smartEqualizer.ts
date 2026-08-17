import type { Hero } from '../../types/cards';
import type { HeroStats } from '../../types/stats';
import { weightedSample } from '../utils/weightedSample';
import { calculateWeights, type WeightInput } from '../weightCalculator';
import { blendedStrength } from '../../utils/blendedStrength';
import { powerBiasMultiplier } from '../utils/powerBiasMultiplier';

export function smartEqualizerMode(
  heroes: Hero[],
  heroStats: HeroStats[],
  totalMatches: number,
  k: number,
  alpha: number,
  threatScore: number = 6   // domyślnie neutralny środek skali (2–10)
): Hero[] {
  if (heroes.length === 0) return [];

  const sorted = [...heroStats].sort((a, b) =>
    (a.lastPlayedAt || '').localeCompare(b.lastPlayedAt || '')
  );

  const statsMap = new Map<string, WeightInput>(
    sorted.map((s, idx) => [
      s.heroId,
      {
        heroId: s.heroId,
        playCount: s.playCount,
        lastPlayedIndex: idx,
      },
    ])
  );

  const baseWeights = calculateWeights(
    heroes.map((h) => h.id),
    statsMap,
    totalMatches,
    alpha
  );

  // Warstwa difficulty bias: premiuj/penalizuj bohaterów wg siły względem zagrożenia
  const finalWeights = heroes.map((hero, idx) => {
    const stats = heroStats.find((s) => s.heroId === hero.id);
    const heroStrength = blendedStrength(
      hero.powerLevel,
      stats?.playCount ?? 0,
      stats?.wins ?? 0
    );
    const bias = powerBiasMultiplier(heroStrength, threatScore);
    return baseWeights[idx] * bias;
  });

  return weightedSample(heroes, k, finalWeights);
}


