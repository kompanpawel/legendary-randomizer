import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../types/cards';
import type { HeroStats, MastermindStats, SchemeStats, RandomizationMode } from '../types/stats';
import { uniformSample } from './utils/weightedSample';
import { smartEqualizerMode } from './modes/smartEqualizer';
import { dustOffMode } from './modes/dustOff';
import { synergyEngineMode } from './modes/synergyEngine';
import { getSetupRules } from './playerSetupRules';
import { resolveAlwaysLeads } from './utils/resolveAlwaysLeads';
import { resolveSchemeVillainRequirements } from './utils/resolveSchemeVillainRequirements';
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
  const { henchmanCount, bystanders } = rules;
  // villainCount is finalized after scheme selection (scheme may add extraVillains)

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

  // Oblicz efektywną liczbę villain groups (base + bonus ze schematu, krok 9)
  const villainCount = rules.villainCount + (scheme.overrides.extraVillains ?? 0);

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

  // ── Always Leads (Mastermind) ─────────────────────────────────────────────
  const resolution = resolveAlwaysLeads(mastermind.alwaysLeads, villains, henchmen);

  let mastermindForcedVillain: VillainGroup | undefined = resolution.forcedVillain;
  if (!mastermindForcedVillain && resolution.villainKeywords && resolution.villainKeywords.length > 0) {
    const matchingVillains = villains.filter(v =>
      resolution.villainKeywords!.some(kw =>
        v.name.toLowerCase().includes(kw.toLowerCase())
      )
    );
    if (matchingVillains.length > 0) {
      [mastermindForcedVillain] = uniformSample(matchingVillains, 1);
    }
  }

  const mastermindForcedHenchmen: Henchman[] = [];
  if (resolution.forcedHenchman) mastermindForcedHenchmen.push(resolution.forcedHenchman);
  if (resolution.additionalHenchmanKeyword) {
    const kw = resolution.additionalHenchmanKeyword.toLowerCase();
    const matchingHenchmen = henchmen.filter(h => h.name.toLowerCase().includes(kw));
    if (matchingHenchmen.length > 0) {
      mastermindForcedHenchmen.push(uniformSample(matchingHenchmen, 1)[0]);
    }
  }

  // ── Scheme Villain/Henchman/Hero Requirements (krok 10) ──────────────────
  const schemeRes = resolveSchemeVillainRequirements(scheme, villains, henchmen, heroes);

  // Scal wymuszone villain groups (mastermind + schemat), dedup po id
  const allForcedVillains: VillainGroup[] = [];
  if (mastermindForcedVillain) allForcedVillains.push(mastermindForcedVillain);
  for (const v of schemeRes.forcedVillains) {
    if (!allForcedVillains.some(fv => fv.id === v.id)) allForcedVillains.push(v);
  }

  // Scal wymuszone henchmen (mastermind + schemat), dedup po id
  const allForcedHenchmen: Henchman[] = [...mastermindForcedHenchmen];
  for (const h of schemeRes.forcedHenchmen) {
    if (!allForcedHenchmen.some(fh => fh.id === h.id)) allForcedHenchmen.push(h);
  }

  // Villain pool: wyklucz wszystkie wymuszone
  const villainPool = villains.filter(v => !allForcedVillains.some(fv => fv.id === v.id));
  // Effectivna liczba villain groups: co najmniej tyle, ile wymuszonych
  const effectiveVillainCount = Math.max(villainCount, allForcedVillains.length);
  const remainingVillainCount = Math.max(0, effectiveVillainCount - allForcedVillains.length);
  const selectedVillains: VillainGroup[] = [
    ...allForcedVillains,
    ...uniformSample(villainPool, remainingVillainCount),
  ];

  // Henchman pool: wyklucz wymuszone
  const henchmanPool = henchmen.filter(h => !allForcedHenchmen.some(fh => fh.id === h.id));
  const remainingHenchmanCount = Math.max(0, henchmanCount - allForcedHenchmen.length);
  const selectedHenchmen: Henchman[] = [
    ...allForcedHenchmen,
    ...uniformSample(henchmanPool, remainingHenchmanCount),
  ];

  // ── PRE-SELECTION threat score (power-based) – używany do biasowania losowania ──
  const mmStats = mastermindStats.find(s => s.mastermindId === mastermind.id);
  const scStats = schemeStats.find(s => s.schemeId === scheme.id);
  const preSelectionThreat = computeThreatScore(mastermind, mmStats, isEpicMastermind, scheme, scStats);

  // ── Required heroes from scheme (krok 10) ─────────────────────────────────
  // Pre-select named heroes before running the hero selection mode for the rest.
  const schemeRequiredHeroes = schemeRes.forcedHeroes;
  const heroPoolForMode = heroes.filter(h => !schemeRequiredHeroes.some(rh => rh.id === h.id));
  const remainingHeroCount = Math.max(0, heroCount - schemeRequiredHeroes.length);

  // ── Pick heroes based on mode ──────────────────────────────────────────────
  let additionalHeroes: Hero[];

  switch (mode) {
    case 'smart':
      additionalHeroes = smartEqualizerMode(heroPoolForMode, heroStats, totalMatches, remainingHeroCount, alpha, preSelectionThreat);
      break;
    case 'dustOff':
      additionalHeroes = dustOffMode(heroPoolForMode, heroStats, remainingHeroCount);
      break;
    case 'synergy':
      additionalHeroes = synergyEngineMode(
        heroPoolForMode, heroStats, scheme, mastermind, totalMatches, remainingHeroCount, alpha,
        selectedVillains, selectedHenchmen, preSelectionThreat
      );
      break;
    default:
      additionalHeroes = uniformSample(heroPoolForMode, remainingHeroCount);
  }

  const selectedHeroes: Hero[] = [...schemeRequiredHeroes, ...additionalHeroes];

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

  // Nota 3: Scheme-required villain groups (krok 10)
  if (schemeRes.forcedVillains.length > 0) {
    const names = schemeRes.forcedVillains.map(v => v.name).join(', ');
    if ((scheme.overrides.xorVillainGroups ?? []).length > 0) {
      // XOR — informuj który wylosowano z możliwych opcji
      const options = (scheme.overrides.xorVillainGroups ?? []).join(', ');
      setupNotes.push({
        key: 'setup.notes.schemeXorVillain',
        params: { options, selected: names },
      });
    } else if (scheme.overrides.requiredVillainKeyword) {
      setupNotes.push({
        key: 'setup.notes.schemeRequiredVillainKeyword',
        params: { keyword: scheme.overrides.requiredVillainKeyword, selected: names },
      });
    } else {
      setupNotes.push({
        key: 'setup.notes.schemeRequiredVillains',
        params: { names },
      });
    }
  }

  // Nota 4: Scheme-required henchman groups (krok 10)
  if (schemeRes.forcedHenchmen.length > 0) {
    const names = schemeRes.forcedHenchmen.map(h => h.name).join(', ');
    setupNotes.push({ key: 'setup.notes.schemeRequiredHenchmen', params: { names } });
  }

  // Nota 5: Scheme-required heroes (krok 10)
  if (schemeRes.forcedHeroes.length > 0) {
    const names = schemeRes.forcedHeroes.map(h => h.name).join(', ');
    setupNotes.push({ key: 'setup.notes.schemeRequiredHeroes', params: { names } });
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

