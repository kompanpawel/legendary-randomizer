import type { Hero } from '../../types/cards';
import type { HeroStats } from '../../types/stats';
import { weightedSample } from '../utils/weightedSample';

/**
 * "Półka Wstydu" – losuje z 20% najrzadziej granych bohaterów
 */
export function dustOffMode(
  heroes: Hero[],
  heroStats: HeroStats[],
  k: number
): Hero[] {
  if (heroes.length === 0) return [];

  const statsMap = new Map<string, HeroStats>(heroStats.map((s) => [s.heroId, s]));

  // Sortuj rosnąco wg playCount (nigdy nie granie = 0)
  const sorted = [...heroes].sort((a, b) => {
    const pa = statsMap.get(a.id)?.playCount ?? 0;
    const pb = statsMap.get(b.id)?.playCount ?? 0;
    return pa - pb;
  });

  // Weź górne 20% (minimum k bohaterów)
  const threshold = Math.max(k, Math.ceil(sorted.length * 0.2));
  const pool = sorted.slice(0, threshold);

  // Równe wagi w puli
  const weights = new Array(pool.length).fill(1) as number[];
  return weightedSample(pool, k, weights);
}

