import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../../types/cards';
import type { HeroStats } from '../../types/stats';
import { weightedSample } from '../utils/weightedSample';

const DUST_OFF_POOL_RATIO = 0.3;

/**
 * Mnożnik wagi dla bohaterów dostarczających potrzebnych counterów w trybie dustOff.
 * Celowo niższy niż SYNERGY_MULTIPLIER (3) w synergyEngine — dustOff to przede wszystkim
 * tryb "półki wstydu", nie optymalizacji. Synergy jest bonus, nie gwarancją.
 */
const DUST_OFF_SYNERGY_MULT = 2;

/**
 * "Półka Wstydu" – losuje z 30% najrzadziej granych bohaterów.
 *
 * W obrębie tej puli silnik próbuje preferować bohaterów pokrywających countery
 * wynikające ze schematu, masterminda i wrogów (soft-synergy, waga 2×).
 * Jeśli żaden bohater w puli nie pasuje do counterów (lub countery nie są wymagane),
 * wszyscy dostają równe wagi — dobór jest wtedy czysto losowy.
 */
export function dustOffMode(
  heroes: Hero[],
  heroStats: HeroStats[],
  k: number,
  scheme?: Scheme,
  mastermind?: Mastermind,
  selectedVillains: VillainGroup[] = [],
  selectedHenchmen: Henchman[] = [],
): Hero[] {
  if (heroes.length === 0) return [];

  const statsMap = new Map<string, HeroStats>(heroStats.map((s) => [s.heroId, s]));

  // Sortuj rosnąco wg playCount (nigdy nie granie = 0)
  const sorted = [...heroes].sort((a, b) => {
    const pa = statsMap.get(a.id)?.playCount ?? 0;
    const pb = statsMap.get(b.id)?.playCount ?? 0;
    return pa - pb;
  });

  // Weź górne 30% (minimum k bohaterów)
  const threshold = Math.max(k, Math.ceil(sorted.length * DUST_OFF_POOL_RATIO));
  const pool = sorted.slice(0, threshold);

  // Zbierz potrzebne countery z całego zestawu (soft-synergy)
  const neededCounters = [
    ...new Set([
      ...(scheme?.countersNeeded ?? []),
      ...(mastermind?.countersNeeded ?? []),
      ...selectedVillains.flatMap((v) => v.countersNeeded),
      ...selectedHenchmen.flatMap((h) => h.countersNeeded),
    ]),
  ];

  // Wagi: 2× dla bohaterów dostarczających pasujących counterów, 1 dla reszty.
  // Gdy brak wymaganych counterów lub żaden bohater w puli nie pasuje → wszystkie wagi = 1.
  const weights = pool.map((hero) =>
    neededCounters.length > 0 &&
    hero.countersProvided.some((c) => neededCounters.includes(c))
      ? DUST_OFF_SYNERGY_MULT
      : 1
  );

  return weightedSample(pool, k, weights);
}
