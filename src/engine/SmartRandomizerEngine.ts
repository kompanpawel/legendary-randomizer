import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../types/cards';
import type { HeroStats, MastermindStats, SchemeStats, RandomizationMode } from '../types/stats';
import { uniformSample } from './utils/weightedSample';
import { smartEqualizerMode } from './modes/smartEqualizer';
import { dustOffMode } from './modes/dustOff';
import { synergyEngineMode } from './modes/synergyEngine';
import { getSetupRules } from './playerSetupRules';
import { resolveAlwaysLeads } from './utils/resolveAlwaysLeads';
import { isMastermindSchemeIncompatible } from './utils/mastermindSchemeConflicts';
import { computeThreatScore, computeFullThreatScore, type CounterCoverage } from './utils/computeThreatScore';
import { computeBalanceGap } from './utils/powerBiasMultiplier';
import { blendedStrength } from '../utils/blendedStrength';

export type { CounterCoverage };

/** Pojedyncza nota setupowa — klucz i18n + opcjonalne parametry interpolacji. */
export interface SetupNote {
  /** Klucz tłumaczenia z en.json (np. "setup.notes.ambushSchemeOverlap") */
  key: string;
  /** Parametry przekazywane do t(key, params) */
  params?: Record<string, string>;
}

export interface GameSetup {
  mastermind: Mastermind;
  /**
   * Drugi Mastermind wylosowany dla schematu Dark Alliance.
   * Dodawany do gry na Twist 1 z jedną Mastermind Tactic (zyskuje kolejne na Twistach 2-4).
   * Obecny tylko gdy `scheme.overrides.requiresSecondMastermind === true`.
   */
  secondMastermind?: Mastermind;
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
  /**
   * Opcjonalne notatki setupowe — klucze i18n do przetłumaczenia w UI.
   * Np. redundantne karty Ambush Scheme, Multiple Masterminds.
   */
  setupNotes: SetupNote[];
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

  // Pick Mastermind and Scheme (forced or random).
  // Gdy tylko jedno z nich jest wymuszone, drugie losujemy z puli oczyszczonej
  // z mechanicznie niegrywalnych kombinacji (np. Adapting Mastermind + schemat
  // tasujący Mastermind Tactics do Villain Decku — patrz mastermindSchemeConflicts.ts).
  // Jeśli oba są wymuszone ręcznie przez gracza, jego wybór nie jest filtrowany.
  let mastermind: Mastermind;
  let scheme: Scheme;

  if (forcedMastermind && forcedScheme) {
    mastermind = forcedMastermind;
    scheme = forcedScheme;
  } else if (forcedMastermind) {
    mastermind = forcedMastermind;
    const compatibleSchemes = schemes.filter(s => !isMastermindSchemeIncompatible(mastermind, s));
    scheme = uniformSample(compatibleSchemes.length > 0 ? compatibleSchemes : schemes, 1)[0];
  } else if (forcedScheme) {
    scheme = forcedScheme;
    const compatibleMasterminds = masterminds.filter(m => !isMastermindSchemeIncompatible(m, scheme));
    mastermind = uniformSample(compatibleMasterminds.length > 0 ? compatibleMasterminds : masterminds, 1)[0];
  } else {
    mastermind = uniformSample(masterminds, 1)[0];
    const compatibleSchemes = schemes.filter(s => !isMastermindSchemeIncompatible(mastermind, s));
    scheme = uniformSample(compatibleSchemes.length > 0 ? compatibleSchemes : schemes, 1)[0];
  }

  // Oblicz efektywną liczbę hero (base + modyfikator ze schematu)
  const schemeHeroMod = scheme.overrides.heroCountMod ?? 0;
  const schemeHeroModMinPlayers = scheme.overrides.heroCountModMinPlayers ?? 1;
  const effectiveHeroMod = playerCount >= schemeHeroModMinPlayers ? schemeHeroMod : 0;
  const heroCount = rules.heroCount + effectiveHeroMod;

  // ── Second Mastermind (Dark Alliance) ────────────────────────────────────
  // Schemat Dark Alliance dodaje na Twist 1 losowego drugiego Masterminda z Tactics.
  // Losujemy go teraz z puli (z wyłączeniem głównego Masterminda), żeby gracz wiedział
  // kogo przygotować przed grą.
  let secondMastermind: Mastermind | undefined;
  if (scheme.overrides.requiresSecondMastermind) {
    const secondPool = masterminds.filter(m => m.id !== mastermind.id);
    if (secondPool.length > 0) {
      [secondMastermind] = uniformSample(secondPool, 1);
    }
  }

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

  // ── Setup Notes ──────────────────────────────────────────────────────────
  const setupNotes: SetupNote[] = [];

  // Nota 1: Redundantna karta Ambush Scheme (krok 3)
  const ambushSchemeGroups = selectedVillains.filter(v => v.hasAmbushScheme);
  if (ambushSchemeGroups.length >= 2) {
    const names = ambushSchemeGroups.map(v => v.name).join(', ');
    setupNotes.push({ key: 'setup.notes.ambushSchemeOverlap', params: { names } });
  }

  // Nota 2: Multiple Masterminds (krok 7)
  if (scheme.overrides.multipleMasterminds) {
    if (scheme.overrides.requiresSecondMastermind && secondMastermind) {
      setupNotes.push({
        key: 'setup.notes.darkAllianceSecondMastermind',
        params: { name: secondMastermind.name },
      });
    } else {
      setupNotes.push({ key: 'setup.notes.multipleMasterminds' });
    }
  }

  const sortByName = <T extends { name: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => a.name.localeCompare(b.name));

  return {
    mastermind,
    ...(secondMastermind ? { secondMastermind } : {}),
    scheme,
    heroes: sortByName(selectedHeroes),
    villains: sortByName(selectedVillains),
    henchmen: sortByName(selectedHenchmen),
    bystanders,
    isEpicMastermind,
    schemeHeroMod: effectiveHeroMod,
    threatScore,
    balanceGap,
    counterCoverage,
    setupNotes,
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

