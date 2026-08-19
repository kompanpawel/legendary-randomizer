import type { Hero, Mastermind, Scheme, VillainGroup, Henchman, HeroClass } from '../types/cards';
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
  /**
   * Losowo wybrany Unveiled Scheme będący "drugą fazą" aktywnego Veiled Scheme.
   * Obecny tylko gdy `scheme.overrides.isVeiledScheme === true`.
   * UI może go ukryć za przyciskiem spoilerowym — gracz zdecyduje czy chce wiedzieć
   * jaki schemat go czeka po transformacji.
   */
  unveiledScheme?: Scheme;
  /**
   * „Drained" Mastermind wylosowany dla schematu Symbiotic Absorption.
   * Odłożony poza grę; jego 4 Tactics trafiają do głównego Masterminda na Twistach 1–4.
   * Jego alwaysLeads Villain jest wymuszony jako dodatkowa Villain Group w setupie.
   * Obecny tylko gdy `scheme.overrides.requiresDrainedMastermind === true`.
   */
  drainedMastermind?: Mastermind;
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
   * Efektywny modyfikator liczby villain groups ze schematu (0 jeśli warunek player-count nie spełniony).
   * Uwzględnia extraVillainsMinPlayers / extraVillainsMaxPlayers.
   */
  schemeExtraVillainMod: number;
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
  const { henchmanCount: baseHenchmanCount, bystanders } = rules;
  // villainCount and henchmanCount are finalized after scheme selection

  // Unveiled Schemes (krok 16) NIE są losowane jako samodzielne schematy — tylko jako
  // "druga faza" Veiled Scheme. Filtrujemy je z puli do automatycznego losowania.
  // forcedScheme NIE jest filtrowany — gracz może ręcznie wybrać dowolny schemat.
  const standaloneSchemes = schemes.filter(s => !s.overrides.isUnveiledScheme);

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
    const compatibleSchemes = standaloneSchemes.filter(s => !isMastermindSchemeIncompatible(mastermind, s));
    scheme = uniformSample(compatibleSchemes.length > 0 ? compatibleSchemes : standaloneSchemes, 1)[0];
  } else if (forcedScheme) {
    scheme = forcedScheme;
    const compatibleMasterminds = masterminds.filter(m => !isMastermindSchemeIncompatible(m, scheme));
    mastermind = uniformSample(compatibleMasterminds.length > 0 ? compatibleMasterminds : masterminds, 1)[0];
  } else {
    mastermind = uniformSample(masterminds, 1)[0];
    const compatibleSchemes = standaloneSchemes.filter(s => !isMastermindSchemeIncompatible(mastermind, s));
    scheme = uniformSample(compatibleSchemes.length > 0 ? compatibleSchemes : standaloneSchemes, 1)[0];
  }

  // ── Unveiled Scheme (krok 16 — Veiled/Unveiled) ────────────────────────────
  // Gdy wylosowany schemat jest Veiled, pre-wybieramy losowo jeden z dostępnych
  // Unveiled Schemes (tej samej expansji) jako "drugą fazę". Gracz zdecyduje
  // w UI czy chce zobaczyć wynik (spoiler) przed grą.
  let unveiledScheme: Scheme | undefined;
  if (scheme.overrides.isVeiledScheme) {
    const unveiledPool = schemes.filter(
      s => s.overrides.isUnveiledScheme && s.expansionId === scheme.expansionId
    );
    if (unveiledPool.length > 0) {
      [unveiledScheme] = uniformSample(unveiledPool, 1);
    }
  }

  // Oblicz efektywną liczbę hero (base + modyfikator ze schematu)
  const schemeHeroMod = scheme.overrides.heroCountMod ?? 0;
  const schemeHeroModMinPlayers = scheme.overrides.heroCountModMinPlayers ?? 1;
  const effectiveHeroMod = playerCount >= schemeHeroModMinPlayers ? schemeHeroMod : 0;
  const heroCount = rules.heroCount + effectiveHeroMod;

  // Oblicz efektywną liczbę villain groups (base + bonus ze schematu, krok 9)
  // Dla schematów z warunkiem player-count (krok 11): extraVillainsMinPlayers / extraVillainsMaxPlayers
  const schemeExtraVillains = scheme.overrides.extraVillains ?? 0;
  const extraVillainsMinP = scheme.overrides.extraVillainsMinPlayers ?? 1;
  const extraVillainsMaxP = scheme.overrides.extraVillainsMaxPlayers ?? Infinity;
  const isExtraVillainsActive = playerCount >= extraVillainsMinP && playerCount <= extraVillainsMaxP;
  const effectiveExtraVillains = isExtraVillainsActive ? schemeExtraVillains : 0;
  const villainCount = rules.villainCount + effectiveExtraVillains;

  // Oblicz efektywną liczbę Henchman Groups (base + bonus ze schematu, krok 17)
  // extraHenchmen: schematy dodające dodatkową grupę Henchman ponad standard.
  const schemeExtraHenchmen = scheme.overrides.extraHenchmen ?? 0;
  const henchmanCount = baseHenchmanCount + schemeExtraHenchmen;

  // Oblicz efektywną liczbę Bystanders (krok 11)
  // bystandersOverride → ustawia dokładną wartość; bystandersMod → addytywny; brak → wartość bazowa
  let effectiveBystanders = bystanders;
  if (scheme.overrides.bystandersOverride !== undefined) {
    effectiveBystanders = scheme.overrides.bystandersOverride;
  } else if (scheme.overrides.bystandersMod !== undefined) {
    effectiveBystanders = Math.max(0, bystanders + scheme.overrides.bystandersMod);
  }

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

  // ── Drained Mastermind (Symbiotic Absorption) ─────────────────────────────
  // Schemat Symbiotic Absorption odkłada losowego „Drained" Masterminda poza grę.
  // Jego 4 Tactics trafiają do głównego Masterminda na Twistach 1–4.
  // Jego alwaysLeads Villain jest wymuszoną dodatkową Villain Group.
  let drainedMastermind: Mastermind | undefined;
  let drainedForcedVillain: VillainGroup | undefined;
  if (scheme.overrides.requiresDrainedMastermind) {
    const drainedPool = masterminds.filter(m => m.id !== mastermind.id);
    if (drainedPool.length > 0) {
      [drainedMastermind] = uniformSample(drainedPool, 1);
      const drainedRes = resolveAlwaysLeads(drainedMastermind.alwaysLeads, villains, henchmen);
      if (drainedRes.forcedVillain) {
        drainedForcedVillain = drainedRes.forcedVillain;
      } else if (drainedRes.villainKeywords && drainedRes.villainKeywords.length > 0) {
        const matching = villains.filter(v =>
          drainedRes.villainKeywords!.some(kw => v.name.toLowerCase().includes(kw.toLowerCase()))
        );
        if (matching.length > 0) {
          [drainedForcedVillain] = uniformSample(matching, 1);
        }
      }
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
  // Drained Mastermind (krok 12): wymuszona Villain Group z alwaysLeads Drained Masterminda
  if (drainedForcedVillain && !allForcedVillains.some(fv => fv.id === drainedForcedVillain!.id)) {
    allForcedVillains.push(drainedForcedVillain);
  }

  // Scal wymuszone henchmen (mastermind + schemat), dedup po id
  const allForcedHenchmen: Henchman[] = [...mastermindForcedHenchmen];
  for (const h of schemeRes.forcedHenchmen) {
    if (!allForcedHenchmen.some(fh => fh.id === h.id)) allForcedHenchmen.push(h);
  }

  // Villain pool: wyklucz wszystkie wymuszone
  const villainPool = villains.filter(v => !allForcedVillains.some(fv => fv.id === v.id));
  // Effectivna liczba villain groups: co najmniej tyle, ile wymuszonych,
  // oraz co najmniej minVillainCount (krok 13: np. Breach the Nexus wymaga ≥3 grup).
  const minVillainCount = scheme.overrides.minVillainCount ?? 0;
  const effectiveVillainCount = Math.max(villainCount, allForcedVillains.length, minVillainCount);
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

  // ── Normalizacja flagi Epic ────────────────────────────────────────────────
  // Tryb Epic jest aktywny TYLKO jeśli użytkownik go włączył ORAZ wylosowany
  // mastermind faktycznie posiada kartę z isEpic=true.
  // Dzięki temu kliknięcie togla przed generowaniem nie powoduje błędnych obliczeń
  // dla masterminds bez wersji Epic.
  const effectiveIsEpic = isEpicMastermind && mastermind.cards.some(c => c.isEpic);

  // ── PRE-SELECTION threat score (power-based) – używany do biasowania losowania ──
  const mmStats = mastermindStats.find(s => s.mastermindId === mastermind.id);
  const scStats = schemeStats.find(s => s.schemeId === scheme.id);
  const preSelectionThreat = computeThreatScore(mastermind, mmStats, effectiveIsEpic, scheme, scStats);

  // ── Required heroes from scheme (krok 10) ─────────────────────────────────
  // Pre-select named heroes before running the hero selection mode for the rest.
  const schemeRequiredHeroes = schemeRes.forcedHeroes;

  // ── Required hero faction from scheme (krok 14) ────────────────────────────
  // "Use at least 1 [X] Hero" — losujemy 1 bohatera z wymaganej frakcji.
  // Pomijamy jeśli wymagany bohater z kroku 10 już spełnia warunek frakcji.
  const requiredFaction = scheme.overrides.requiredHeroFaction;
  const schemeFactionHero: Hero[] = [];
  if (requiredFaction) {
    const alreadySatisfied = schemeRequiredHeroes.some(h => h.faction === requiredFaction);
    if (!alreadySatisfied) {
      const factionPool = heroes.filter(
        h => h.faction === requiredFaction && !schemeRequiredHeroes.some(rh => rh.id === h.id)
      );
      if (factionPool.length > 0) {
        schemeFactionHero.push(uniformSample(factionPool, 1)[0]);
      }
    }
  }

  // ── Hero Deck Special Rules (krok 15) ─────────────────────────────────────
  // heroCountOverride: całkowicie zastępuje heroCount (rules.heroCount + effectiveHeroMod)
  const finalHeroCount = scheme.overrides.heroCountOverride !== undefined
    ? scheme.overrides.heroCountOverride
    : heroCount;

  // 15a: heroFactionSplit — 2 drużyny × teamSize (np. Avengers vs. X-Men: 3+3=6)
  // Całkowicie zastępuje normalny tryb wyboru bohaterów.
  let heroFactionSplitFaction1 = '';
  let heroFactionSplitFaction2 = '';
  let heroFactionSplitTeam1: Hero[] = [];
  let heroFactionSplitTeam2: Hero[] = [];
  const useFactionSplit = !!scheme.overrides.heroFactionSplit;

  if (useFactionSplit) {
    const { teamSize } = scheme.overrides.heroFactionSplit!;
    const factionMap = new Map<string, Hero[]>();
    for (const h of heroes) {
      if (!factionMap.has(h.faction)) factionMap.set(h.faction, []);
      factionMap.get(h.faction)!.push(h);
    }
    const eligibleFactions = [...factionMap.entries()]
      .filter(([, fh]) => fh.length >= teamSize)
      .map(([f]) => f);
    if (eligibleFactions.length >= 2) {
      [heroFactionSplitFaction1, heroFactionSplitFaction2] = uniformSample(eligibleFactions, 2) as [string, string];
      heroFactionSplitTeam1 = uniformSample(factionMap.get(heroFactionSplitFaction1)!, teamSize);
      heroFactionSplitTeam2 = uniformSample(factionMap.get(heroFactionSplitFaction2)!, teamSize);
    } else {
      // Fallback: nie ma ≥2 frakcji z wystarczającą pulą — losuj normalnie
      heroFactionSplitTeam1 = uniformSample(heroes, Math.min(teamSize, heroes.length));
      heroFactionSplitTeam2 = uniformSample(
        heroes.filter(h => !heroFactionSplitTeam1.some(t => t.id === h.id)),
        Math.min(teamSize, heroes.length - heroFactionSplitTeam1.length)
      );
    }
  }

  // 15b/c: Pre-selekcja przez requiredFactionCount i requiredHeroNameSubstring
  const factionCountHeroes: Hero[] = [];
  const nameSubstringHeroes: Hero[] = [];

  if (!useFactionSplit) {
    // 15b: requiredFactionCount (np. 4 X-Men dla House of M)
    if (scheme.overrides.requiredFactionCount) {
      const { faction, count } = scheme.overrides.requiredFactionCount;
      const pool = heroes.filter(
        h => h.faction === faction &&
             !schemeRequiredHeroes.some(p => p.id === h.id) &&
             !schemeFactionHero.some(p => p.id === h.id)
      );
      factionCountHeroes.push(...uniformSample(pool, Math.min(count, pool.length)));
    }

    // 15c: requiredHeroNameSubstring (np. dokładnie 2 Hulk dla Fall of the Hulks)
    if (scheme.overrides.requiredHeroNameSubstring) {
      const { substring, exactCount } = scheme.overrides.requiredHeroNameSubstring;
      const substringLower = substring.toLowerCase();
      const alreadyCount = [...schemeRequiredHeroes, ...schemeFactionHero, ...factionCountHeroes]
        .filter(h => h.name.toLowerCase().includes(substringLower)).length;
      const needed = Math.max(0, exactCount - alreadyCount);
      if (needed > 0) {
        const pool = heroes.filter(
          h => h.name.toLowerCase().includes(substringLower) &&
               !schemeRequiredHeroes.some(p => p.id === h.id) &&
               !schemeFactionHero.some(p => p.id === h.id) &&
               !factionCountHeroes.some(p => p.id === h.id)
        );
        nameSubstringHeroes.push(...uniformSample(pool, Math.min(needed, pool.length)));
      }
    }
  }

  // Kompletna lista pre-wybranych bohaterów
  const allPreSelectedHeroes: Hero[] = [
    ...schemeRequiredHeroes,
    ...schemeFactionHero,
    ...factionCountHeroes,
    ...nameSubstringHeroes,
  ];

  // ── Pick heroes based on mode ──────────────────────────────────────────────
  let selectedHeroes: Hero[];

  if (useFactionSplit) {
    // Faction split całkowicie determinuje skład (np. Avengers vs. X-Men)
    selectedHeroes = [...heroFactionSplitTeam1, ...heroFactionSplitTeam2];
  } else {
    // Zbuduj pulę wykluczając pre-wybranych
    let heroPool = heroes.filter(h => !allPreSelectedHeroes.some(p => p.id === h.id));

    // excludeFromRemainder: po requiredFactionCount wyklucz tę frakcję z reszty
    if (scheme.overrides.requiredFactionCount?.excludeFromRemainder) {
      const exFaction = scheme.overrides.requiredFactionCount.faction;
      heroPool = heroPool.filter(h => h.faction !== exFaction);
    }

    // requiredHeroNameSubstring exactCount: wyklucz pozostałe z tym podciągiem
    if (scheme.overrides.requiredHeroNameSubstring) {
      const substringLower = scheme.overrides.requiredHeroNameSubstring.substring.toLowerCase();
      heroPool = heroPool.filter(h => !h.name.toLowerCase().includes(substringLower));
    }

    const remainingHeroCount = Math.max(0, finalHeroCount - allPreSelectedHeroes.length);
    let additionalHeroes: Hero[];

    if (scheme.overrides.requiresAllHeroClasses) {
      // Zapewnij pokrycie wszystkich 5 klas (Divide and Conquer)
      const ALL_CLASSES: HeroClass[] = ['Strength', 'Instinct', 'Covert', 'Tech', 'Ranged'];
      const coveredClasses = new Set(allPreSelectedHeroes.flatMap(h => h.primaryClasses));
      const classPickedHeroes: Hero[] = [];
      let classPool = [...heroPool];

      for (const cls of ALL_CLASSES) {
        if (coveredClasses.has(cls)) continue;
        if (classPickedHeroes.length >= remainingHeroCount) break;
        const eligible = classPool.filter(h => h.primaryClasses.includes(cls));
        if (eligible.length > 0) {
          const [picked] = uniformSample(eligible, 1);
          classPickedHeroes.push(picked);
          classPool = classPool.filter(h => h.id !== picked.id);
          coveredClasses.add(cls);
        }
      }

      const afterClassCount = remainingHeroCount - classPickedHeroes.length;
      let restHeroes: Hero[] = [];
      if (afterClassCount > 0) {
        switch (mode) {
          case 'smart':
            restHeroes = smartEqualizerMode(classPool, heroStats, totalMatches, afterClassCount, alpha, preSelectionThreat);
            break;
          case 'dustOff':
            restHeroes = dustOffMode(classPool, heroStats, afterClassCount, scheme, mastermind, selectedVillains, selectedHenchmen);
            break;
          case 'synergy':
            restHeroes = synergyEngineMode(classPool, heroStats, scheme, mastermind, totalMatches, afterClassCount, alpha, selectedVillains, selectedHenchmen, preSelectionThreat);
            break;
          default:
            restHeroes = uniformSample(classPool, afterClassCount);
        }
      }
      additionalHeroes = [...classPickedHeroes, ...restHeroes];
    } else {
      // Normal mode selection
      switch (mode) {
        case 'smart':
          additionalHeroes = smartEqualizerMode(heroPool, heroStats, totalMatches, remainingHeroCount, alpha, preSelectionThreat);
          break;
        case 'dustOff':
          additionalHeroes = dustOffMode(heroPool, heroStats, remainingHeroCount, scheme, mastermind, selectedVillains, selectedHenchmen);
          break;
        case 'synergy':
          additionalHeroes = synergyEngineMode(
            heroPool, heroStats, scheme, mastermind, totalMatches, remainingHeroCount, alpha,
            selectedVillains, selectedHenchmen, preSelectionThreat
          );
          break;
        default:
          additionalHeroes = uniformSample(heroPool, remainingHeroCount);
      }
    }

    selectedHeroes = [...allPreSelectedHeroes, ...additionalHeroes];
  }

  // ── POST-SELECTION threat score (counter-gap dominant, 30% power + 70% counter) ──
  const { threatScore, counterCoverage } = computeFullThreatScore(
    selectedHeroes,
    mastermind, mmStats, effectiveIsEpic,
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

  // Nota 2b: Drained Mastermind (krok 12 — Symbiotic Absorption)
  if (drainedMastermind) {
    setupNotes.push({
      key: 'setup.notes.symbioticAbsorptionDrained',
      params: {
        name: drainedMastermind.name,
        villain: drainedForcedVillain?.name ?? '—',
      },
    });
  }

  // Nota 2c: Multi-Deck setup (krok 13)
  if (scheme.overrides.isMultiDeck) {
    setupNotes.push({ key: 'setup.notes.multiDeck' });
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

  // Nota 6: Scheme-required hero faction (krok 14)
  if (schemeFactionHero.length > 0 && requiredFaction) {
    setupNotes.push({
      key: 'setup.notes.schemeRequiredHeroFaction',
      params: { faction: requiredFaction, hero: schemeFactionHero[0].name },
    });
  } else if (requiredFaction && schemeFactionHero.length === 0) {
    // Frakcja wymagana, ale brak dostępnych bohaterów w aktywnych dodatkach
    setupNotes.push({
      key: 'setup.notes.schemeRequiredHeroFactionMissing',
      params: { faction: requiredFaction },
    });
  }

  // Nota 7: heroFactionSplit (krok 15 — Avengers vs. X-Men)
  if (useFactionSplit && heroFactionSplitFaction1 && heroFactionSplitFaction2) {
    setupNotes.push({
      key: 'setup.notes.heroFactionSplit',
      params: { faction1: heroFactionSplitFaction1, faction2: heroFactionSplitFaction2 },
    });
  }

  // Nota 8: requiredFactionCount (krok 15 — House of M)
  if (factionCountHeroes.length > 0 && scheme.overrides.requiredFactionCount) {
    const names = factionCountHeroes.map(h => h.name).join(', ');
    setupNotes.push({
      key: 'setup.notes.requiredFactionCount',
      params: { faction: scheme.overrides.requiredFactionCount.faction, heroes: names },
    });
  }

  // Nota 9: requiredHeroNameSubstring (krok 15 — Fall of the Hulks)
  if (nameSubstringHeroes.length > 0 && scheme.overrides.requiredHeroNameSubstring) {
    const names = nameSubstringHeroes.map(h => h.name).join(', ');
    setupNotes.push({
      key: 'setup.notes.requiredHeroNameSubstring',
      params: {
        substring: scheme.overrides.requiredHeroNameSubstring.substring,
        count: String(scheme.overrides.requiredHeroNameSubstring.exactCount),
        heroes: names,
      },
    });
  }

  // Nota 10: requiresAllHeroClasses (krok 15 — Divide and Conquer)
  if (scheme.overrides.requiresAllHeroClasses) {
    setupNotes.push({ key: 'setup.notes.requiresAllHeroClasses' });
  }

  // Nota 11: Veiled Scheme (krok 16) — informacja o transformacji
  if (scheme.overrides.isVeiledScheme) {
    setupNotes.push({
      key: 'setup.notes.veiledScheme',
      params: {
        twist: String(scheme.overrides.veilTransformsTwist ?? '?'),
      },
    });
  }

  // Nota 12: Extra Henchman group (krok 17) — dodatkowa grupa henchmenów z puli
  if (schemeExtraHenchmen > 0) {
    setupNotes.push({
      key: 'setup.notes.schemeExtraHenchmen',
      params: { count: String(schemeExtraHenchmen) },
    });
  }

  const sortByName = <T extends { name: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => a.name.localeCompare(b.name));

  return {
    mastermind,
    ...(secondMastermind ? { secondMastermind } : {}),
    ...(drainedMastermind ? { drainedMastermind } : {}),
    ...(unveiledScheme ? { unveiledScheme } : {}),
    scheme,
    heroes: sortByName(selectedHeroes),
    villains: sortByName(selectedVillains),
    henchmen: sortByName(selectedHenchmen),
    bystanders: effectiveBystanders,
    isEpicMastermind: effectiveIsEpic,
    schemeHeroMod: effectiveHeroMod,
    schemeExtraVillainMod: effectiveExtraVillains,
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

