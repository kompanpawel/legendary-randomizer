import cardsData from '@/assets/cards.json';
import { computeFullThreatScore } from '@/engine/utils/computeThreatScore';
import { computeBalanceGap } from '@/engine/utils/powerBiasMultiplier';
import type { CardsDatabase, Henchman, Hero, Mastermind, Scheme, VillainGroup } from '@/types/cards';
import type { HeroStats, MastermindStats, MatchLog, SchemeStats } from '@/types/stats';
import { blendedStrength } from '@/utils/blendedStrength';

const cardsDb = cardsData as unknown as CardsDatabase;
const heroMap = new Map(cardsDb.heroes.map((h) => [h.id, h]));
const mastermindMap = new Map(cardsDb.masterminds.map((m) => [m.id, m]));
const schemeMap = new Map(cardsDb.schemes.map((s) => [s.id, s]));
const villainMap = new Map(cardsDb.villains.map((v) => [v.id, v]));
const henchmanMap = new Map(cardsDb.henchmen.map((h) => [h.id, h]));

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function computeMissingMetrics(
  match: MatchLog,
  heroStatsMap: Map<string, HeroStats>,
  mastermindStatsMap: Map<string, MastermindStats>,
  schemeStatsMap: Map<string, SchemeStats>
): Partial<Pick<MatchLog, 'threatScore' | 'balanceGap'>> {
  if (match.threatScore !== undefined && match.balanceGap !== undefined) {
    return {};
  }

  const mastermind: Mastermind | undefined = mastermindMap.get(match.mastermindId);
  const scheme: Scheme | undefined = schemeMap.get(match.schemeId);
  const heroes: Hero[] = match.heroIds.map((heroId) => heroMap.get(heroId)).filter(isDefined);
  const villains: VillainGroup[] = match.villainIds.map((villainId) => villainMap.get(villainId)).filter(isDefined);
  const henchmen: Henchman[] = match.henchmanIds.map((henchmanId) => henchmanMap.get(henchmanId)).filter(isDefined);

  if (!mastermind || !scheme || heroes.length === 0) {
    return {};
  }

  const mastermindStats = mastermindStatsMap.get(match.mastermindId);
  const schemeStats = schemeStatsMap.get(match.schemeId);
  const computedThreat = computeFullThreatScore(
    heroes,
    mastermind,
    mastermindStats,
    match.isEpicMastermind ?? false,
    scheme,
    schemeStats,
    villains,
    henchmen
  ).threatScore;

  const threatScore = match.threatScore ?? computedThreat;
  if (match.balanceGap !== undefined) {
    return { threatScore };
  }

  const heroBlendedPowers = heroes.map((hero) => {
    const stats = heroStatsMap.get(hero.id);
    return blendedStrength(hero.powerLevel, stats?.playCount ?? 0, stats?.wins ?? 0, 0);
  });

  return {
    threatScore,
    balanceGap: computeBalanceGap(heroBlendedPowers, threatScore),
  };
}

export function backfillLegacyMatchMetrics(
  matchLog: MatchLog[],
  heroStats: HeroStats[],
  mastermindStats: MastermindStats[],
  schemeStats: SchemeStats[]
): MatchLog[] {
  const heroStatsMap = new Map(heroStats.map((stat) => [stat.heroId, stat]));
  const mastermindStatsMap = new Map(mastermindStats.map((stat) => [stat.mastermindId, stat]));
  const schemeStatsMap = new Map(schemeStats.map((stat) => [stat.schemeId, stat]));

  return matchLog.map((match) => {
    const missing = computeMissingMetrics(match, heroStatsMap, mastermindStatsMap, schemeStatsMap);
    return Object.keys(missing).length > 0 ? { ...match, ...missing } : match;
  });
}
