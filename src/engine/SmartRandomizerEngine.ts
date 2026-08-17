import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../types/cards';
import type { HeroStats, MastermindStats, SchemeStats, RandomizationMode } from '../types/stats';
import { uniformSample } from './utils/weightedSample';
import { smartEqualizerMode } from './modes/smartEqualizer';
import { dustOffMode } from './modes/dustOff';
import { synergyEngineMode } from './modes/synergyEngine';
import { getSetupRules } from './playerSetupRules';
import { resolveAlwaysLeads } from './utils/resolveAlwaysLeads';
import { computeThreatScore, computeFullThreatScore, type CounterCoverage } from './utils/computeThreatScore';
import { computeBalanceGap } from './utils/powerBiasMultiplier';
import { blendedStrength } from '../utils/blendedStrength';

export type { CounterCoverage };

export interface GameSetup {
  mastermind: Mastermind;
  scheme: Scheme;
  heroes: Hero[];
  villains: VillainGroup[];
  henchmen: Henchman[];
  bystanders: number;
  /** Czy rozgrywka jest w trybie Epic masterminda */
  isEpicMastermind: boolean;
  /** Modyfikator liczby hero wynikający ze schematu (0 jeśli brak) */
  schemeHeroMod: number;
  /**
   * POST-SELECTION threat score ∈ [2,10]
   * 30% power-based + 70% counter-gap (niepokryte countery wrogów)
   */
  threatScore: number;
  /** balanceGap = threatScore - heroTeamScore (>0 = trudniejsza dla graczy) */
  balanceGap: number;
  /** Szczegóły pokrycia kontrników — które zagrożenia są/nie są kontrowalne */
  counterCoverage: CounterCoverage;
}

export interface RandomizerInput {
  heroes: Hero[];
  heroStats: HeroStats[];
  mastermindStats: MastermindStats[];
  schemeStats: SchemeStats[];
  masterminds: Mastermind[];
  schemes: Scheme[];
  villains: VillainGroup[];
  henchmen: Henchman[];
  totalMatches: number;
  playerCount: number;
  alpha: number;
  mode: RandomizationMode;
  /** Wymuszony tryb Epic dla masterminda (np. ręczny wybór) */
  isEpicMastermind?: boolean;
  /** Wymuszony mastermind (wybrany ręcznie przez gracza, pomija losowanie) */
  forcedMastermind?: Mastermind;
  /** Wymuszony schemat (wybrany ręcznie przez gracza, pomija losowanie) */
  forcedScheme?: Scheme;
}

export function generateSetup(input: RandomizerInput): GameSetup {
  const {
    heroes, heroStats, mastermindStats, schemeStats,
    masterminds, schemes, villains, henchmen,
    totalMatches, playerCount, alpha, mode,
    isEpicMastermind = false,
    forcedMastermind,
    forcedScheme,
  } = input;

  if (masterminds.length === 0 && !forcedMastermind) throw new Error('No masterminds in active expansions');
  if (schemes.length === 0 && !forcedScheme) throw new Error('No schemes in active expansions');

  const rules = getSetupRules(playerCount);
  const { villainCount, henchmanCount, bystanders } = rules;

  // Pick Mastermind and Scheme (forced or random)
  const mastermind = forcedMastermind ?? uniformSample(masterminds, 1)[0];
  const scheme = forcedScheme ?? uniformSample(schemes, 1)[0];

  // Oblicz efektywną liczbę hero (base + modyfikator ze schematu)
  const schemeHeroMod = scheme.overrides.heroCountMod ?? 0;
  const schemeHeroModMinPlayers = scheme.overrides.heroCountModMinPlayers ?? 1;
  const effectiveHeroMod = playerCount >= schemeHeroModMinPlayers ? schemeHeroMod : 0;
  const heroCount = rules.heroCount + effectiveHeroMod;

  // ── Always Leads ──────────────────────────────────────────────────────────
  const resolution = resolveAlwaysLeads(mastermind.alwaysLeads, villains, henchmen);

  let forcedVillain: VillainGroup | undefined = resolution.forcedVillain;
  if (!forcedVillain && resolution.villainKeywords && resolution.villainKeywords.length > 0) {
    const matchingVillains = villains.filter(v =>
      resolution.villainKeywords!.some(kw =>
        v.name.toLowerCase().includes(kw.toLowerCase())
      )
    );
    if (matchingVillains.length > 0) {
      [forcedVillain] = uniformSample(matchingVillains, 1);
    }
  }

  let forcedHenchman: Henchman | undefined = resolution.forcedHenchman;
  let additionalForcedHenchman: Henchman | undefined;
  if (resolution.additionalHenchmanKeyword) {
    const kw = resolution.additionalHenchmanKeyword.toLowerCase();
    const matchingHenchmen = henchmen.filter(h => h.name.toLowerCase().includes(kw));
    if (matchingHenchmen.length > 0) {
      [additionalForcedHenchman] = uniformSample(matchingHenchmen, 1);
    }
  }

  const villainPool = villains.filter(v => v.id !== forcedVillain?.id);
  const remainingVillainCount = Math.max(0, villainCount - (forcedVillain ? 1 : 0));
  const selectedVillains: VillainGroup[] = [
    ...(forcedVillain ? [forcedVillain] : []),
    ...uniformSample(villainPool, remainingVillainCount),
  ];

  const forcedHenchmenList = [forcedHenchman, additionalForcedHenchman].filter(
    (h): h is Henchman => h !== undefined
  );
  const henchmanPool = henchmen.filter(h => !forcedHenchmenList.some(fh => fh.id === h.id));
  const remainingHenchmanCount = Math.max(0, henchmanCount - forcedHenchmenList.length);
  const selectedHenchmen: Henchman[] = [
    ...forcedHenchmenList,
    ...uniformSample(henchmanPool, remainingHenchmanCount),
  ];

  // ── PRE-SELECTION threat score (power-based) – używany do biasowania losowania ──
  const mmStats = mastermindStats.find(s => s.mastermindId === mastermind.id);
  const scStats = schemeStats.find(s => s.schemeId === scheme.id);
  const preSelectionThreat = computeThreatScore(mastermind, mmStats, isEpicMastermind, scheme, scStats);

  // ── Pick heroes based on mode ──────────────────────────────────────────────
  let selectedHeroes: Hero[];

  switch (mode) {
    case 'smart':
      selectedHeroes = smartEqualizerMode(heroes, heroStats, totalMatches, heroCount, alpha, preSelectionThreat);
      break;
    case 'dustOff':
      // Dust Off: bez bias siły — zachowuje charakter trybu (grasz zapomnianymi kartami)
      selectedHeroes = dustOffMode(heroes, heroStats, heroCount);
      break;
    case 'synergy':
      selectedHeroes = synergyEngineMode(
        heroes, heroStats, scheme, mastermind, totalMatches, heroCount, alpha,
        selectedVillains, selectedHenchmen, preSelectionThreat
      );
      break;
    default:
      selectedHeroes = uniformSample(heroes, heroCount);
  }

  // ── POST-SELECTION threat score (counter-gap dominant, 30% power + 70% counter) ──
  const { threatScore, counterCoverage } = computeFullThreatScore(
    selectedHeroes,
    mastermind, mmStats, isEpicMastermind,
    scheme, scStats,
    selectedVillains, selectedHenchmen
  );

  // ── Balance Gap (threatScore vs. blended hero power) ─────────────────────
  const heroBlendedPowers = selectedHeroes.map(hero => {
    const stats = heroStats.find(s => s.heroId === hero.id);
    return blendedStrength(hero.powerLevel, stats?.playCount ?? 0, stats?.wins ?? 0);
  });
  const balanceGap = computeBalanceGap(heroBlendedPowers, threatScore);

  return {
    mastermind,
    scheme,
    heroes: selectedHeroes,
    villains: selectedVillains,
    henchmen: selectedHenchmen,
    bystanders,
    isEpicMastermind,
    schemeHeroMod: effectiveHeroMod,
    threatScore,
    balanceGap,
    counterCoverage,
  };
}

/** Re-roll a single hero (skips already-selected heroes) */
export function rerollHero(
  current: Hero[],
  heroToReplace: Hero,
  allHeroes: Hero[],
  heroStats: HeroStats[],
  totalMatches: number,
  alpha: number,
  mode: RandomizationMode,
  threatScore: number = 6
): Hero {
  const excluded = new Set(current.map((h) => h.id));
  const pool = allHeroes.filter((h) => !excluded.has(h.id));

  if (pool.length === 0) return heroToReplace;

  let replacement: Hero | undefined;

  switch (mode) {
    case 'smart':
      [replacement] = smartEqualizerMode(pool, heroStats, totalMatches, 1, alpha, threatScore);
      break;
    case 'dustOff':
      [replacement] = dustOffMode(pool, heroStats, 1);
      break;
    default:
      [replacement] = uniformSample(pool, 1);
  }

  return replacement ?? heroToReplace;
}

