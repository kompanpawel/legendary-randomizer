/**
 * Punkt 15 — Dobór Heroes wg drużyny (faction) lub imienia — 4 schematy
 *
 * Mechanika:
 *   - Avengers vs. X-Men: heroCountOverride=6, heroFactionSplit={teamSize:3}
 *     → 2 losowe frakcje, 3 bohaterów z każdej (niezależnie od liczby graczy)
 *   - House of M: heroCountOverride=6, requiredFactionCount={faction:"X-Men",count:4,excludeFromRemainder:true}
 *     → 4 X-Meni + 2 z innej frakcji (zawsze 6, niezależnie od playerCount)
 *   - Fall of the Hulks: requiredHeroNameSubstring={substring:"Hulk",exactCount:2}
 *     → dokładnie 2 Hulk-heroes, reszta normalnie (heroCount z playerCount)
 *   - Divide and Conquer: heroCountOverride=7, requiresAllHeroClasses=true
 *     → zawsze 7 hero, co najmniej 1 z każdej klasy (Str/Ins/Cov/Tech/Ranged)
 *
 * Weryfikowane tu:
 *   A. Dane: overrides 4 schematów
 *   B. Silnik — Avengers vs. X-Men: zawsze 6 hero, 2 frakcje po 3
 *   C. Silnik — House of M: zawsze 6 hero, 4 X-Meni, 0 X-Meni w reszcie
 *   D. Silnik — Fall of the Hulks: dokładnie 2 Hulk, heroCount z playerCount
 *   E. Silnik — Divide and Conquer: zawsze 7 hero, ≥1 z każdej klasy
 *   F. Silnik — setup notes dla każdego schematu
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';
import { PLAYER_SETUP_RULES } from '@/engine/playerSetupRules.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

const avengersVsXmen   = db.schemes.find(s => s.name === 'Avengers vs. X-Men')!;
const houseOfM         = db.schemes.find(s => s.name === 'House of M')!;
const fallOfTheHulks   = db.schemes.find(s => s.name === 'Fall of the Hulks')!;
const divideAndConquer = db.schemes.find(s => s.name === 'Divide and Conquer')!;

function makeInput(forcedScheme: Scheme, playerCount = 2) {
  return {
    heroes: db.heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds.slice(0, 3),
    schemes: [forcedScheme],
    villains: db.villains.slice(0, 6),
    henchmen: db.henchmen.slice(0, 2),
    totalMatches: 0,
    playerCount,
    alpha: 0.5,
    mode: 'smart' as const,
    forcedMastermind: db.masterminds[0],
    forcedScheme,
  };
}

// ---------------------------------------------------------------------------
// A. Dane
// ---------------------------------------------------------------------------
describe('Step 15 — dane (overrides)', () => {
  it('Avengers vs. X-Men: heroCountOverride=6, heroFactionSplit={teamSize:3}', () => {
    expect(avengersVsXmen.overrides.heroCountOverride).toBe(6);
    expect(avengersVsXmen.overrides.heroFactionSplit?.teamSize).toBe(3);
  });

  it('House of M: heroCountOverride=6, requiredFactionCount X-Men count=4 excludeFromRemainder', () => {
    expect(houseOfM.overrides.heroCountOverride).toBe(6);
    expect(houseOfM.overrides.requiredFactionCount?.faction).toBe('X-Men');
    expect(houseOfM.overrides.requiredFactionCount?.count).toBe(4);
    expect(houseOfM.overrides.requiredFactionCount?.excludeFromRemainder).toBe(true);
  });

  it('Fall of the Hulks: requiredHeroNameSubstring Hulk exactCount=2', () => {
    expect(fallOfTheHulks.overrides.requiredHeroNameSubstring?.substring).toBe('Hulk');
    expect(fallOfTheHulks.overrides.requiredHeroNameSubstring?.exactCount).toBe(2);
    expect(fallOfTheHulks.overrides.heroCountOverride).toBeUndefined();
  });

  it('Divide and Conquer: heroCountOverride=7, requiresAllHeroClasses=true', () => {
    expect(divideAndConquer.overrides.heroCountOverride).toBe(7);
    expect(divideAndConquer.overrides.requiresAllHeroClasses).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B. Avengers vs. X-Men — heroFactionSplit
// ---------------------------------------------------------------------------
describe('generateSetup() — Avengers vs. X-Men: 3+3 faction split', () => {
  it.each([1, 2, 3, 4, 5])('%i graczy → zawsze 6 hero (heroCountOverride)', (pc) => {
    const setup = generateSetup(makeInput(avengersVsXmen, pc));
    expect(setup.heroes).toHaveLength(6);
  });

  it('hero deck ma dokładnie 2 frakcje po 3 bohaterów', () => {
    const setup = generateSetup(makeInput(avengersVsXmen, 2));
    expect(setup.heroes).toHaveLength(6);
    const factionCounts = new Map<string, number>();
    for (const h of setup.heroes) {
      factionCounts.set(h.faction, (factionCounts.get(h.faction) ?? 0) + 1);
    }
    const uniqueFactions = [...factionCounts.keys()];
    expect(uniqueFactions).toHaveLength(2);
    for (const count of factionCounts.values()) {
      expect(count).toBe(3);
    }
  });

  it('nota setupowa zawiera heroFactionSplit', () => {
    const setup = generateSetup(makeInput(avengersVsXmen, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.heroFactionSplit');
    expect(note).toBeDefined();
    expect(note?.params?.faction1).toBeDefined();
    expect(note?.params?.faction2).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// C. House of M — requiredFactionCount
// ---------------------------------------------------------------------------
describe('generateSetup() — House of M: 4 X-Men + 2 non-X-Men', () => {
  it.each([1, 2, 3, 4, 5])('%i graczy → zawsze 6 hero (heroCountOverride)', (pc) => {
    const setup = generateSetup(makeInput(houseOfM, pc));
    expect(setup.heroes).toHaveLength(6);
  });

  it('dokładnie 4 bohaterów faction=X-Men', () => {
    const setup = generateSetup(makeInput(houseOfM, 2));
    const xmenCount = setup.heroes.filter(h => h.faction === 'X-Men').length;
    expect(xmenCount).toBe(4);
  });

  it('pozostałe 2 hero NIE są X-Men (excludeFromRemainder)', () => {
    const setup = generateSetup(makeInput(houseOfM, 2));
    const nonXmen = setup.heroes.filter(h => h.faction !== 'X-Men');
    expect(nonXmen).toHaveLength(2);
    for (const h of nonXmen) {
      expect(h.faction).not.toBe('X-Men');
    }
  });

  it('nota setupowa zawiera requiredFactionCount z X-Men', () => {
    const setup = generateSetup(makeInput(houseOfM, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.requiredFactionCount');
    expect(note).toBeDefined();
    expect(note?.params?.faction).toBe('X-Men');
  });
});

// ---------------------------------------------------------------------------
// D. Fall of the Hulks — requiredHeroNameSubstring
// ---------------------------------------------------------------------------
describe('generateSetup() — Fall of the Hulks: exactly 2 Hulk heroes', () => {
  it('dokładnie 2 bohaterów z "Hulk" w nazwie', () => {
    const setup = generateSetup(makeInput(fallOfTheHulks, 2));
    const hulkCount = setup.heroes.filter(h => /hulk/i.test(h.name)).length;
    expect(hulkCount).toBe(2);
  });

  it('nie ma WIĘCEJ niż 2 Hulk heroes (exclusion from remainder)', () => {
    for (let i = 0; i < 5; i++) {
      const setup = generateSetup(makeInput(fallOfTheHulks, 5));
      const hulkCount = setup.heroes.filter(h => /hulk/i.test(h.name)).length;
      expect(hulkCount).toBe(2);
    }
  });

  it('łączna liczba bohaterów = heroCount z playerCount (brak override)', () => {
    for (const pc of [1, 2, 3, 4, 5]) {
      const expected = PLAYER_SETUP_RULES[pc].heroCount;
      const setup = generateSetup(makeInput(fallOfTheHulks, pc));
      expect(setup.heroes).toHaveLength(expected);
    }
  });

  it('nota setupowa zawiera requiredHeroNameSubstring z "Hulk"', () => {
    const setup = generateSetup(makeInput(fallOfTheHulks, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.requiredHeroNameSubstring');
    expect(note).toBeDefined();
    expect(note?.params?.substring).toBe('Hulk');
    expect(note?.params?.count).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// E. Divide and Conquer — heroCountOverride=7, requiresAllHeroClasses
// ---------------------------------------------------------------------------
describe('generateSetup() — Divide and Conquer: 7 heroes, all classes', () => {
  it.each([1, 2, 3, 4, 5])('%i graczy → zawsze 7 hero', (pc) => {
    const setup = generateSetup(makeInput(divideAndConquer, pc));
    expect(setup.heroes).toHaveLength(7);
  });

  it('co najmniej 1 bohater każdej z 5 klas', () => {
    const setup = generateSetup(makeInput(divideAndConquer, 2));
    const classes = new Set(setup.heroes.flatMap(h => h.primaryClasses));
    expect(classes.has('Strength')).toBe(true);
    expect(classes.has('Instinct')).toBe(true);
    expect(classes.has('Covert')).toBe(true);
    expect(classes.has('Tech')).toBe(true);
    expect(classes.has('Ranged')).toBe(true);
  });

  it('nota setupowa zawiera requiresAllHeroClasses', () => {
    const setup = generateSetup(makeInput(divideAndConquer, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.requiresAllHeroClasses');
    expect(note).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// F. Brak false-positive dla normalnych schematów
// ---------------------------------------------------------------------------
describe('generateSetup() — normalne schematy: brak step-15 notes', () => {
  it('schemat bez żadnego step-15 override nie generuje tych not', () => {
    const normal = db.schemes.find(s =>
      !s.overrides.heroFactionSplit &&
      !s.overrides.requiredFactionCount &&
      !s.overrides.requiredHeroNameSubstring &&
      !s.overrides.requiresAllHeroClasses &&
      !s.overrides.heroCountOverride
    )!;
    const setup = generateSetup(makeInput(normal, 2));
    const step15Keys = [
      'setup.notes.heroFactionSplit',
      'setup.notes.requiredFactionCount',
      'setup.notes.requiredHeroNameSubstring',
      'setup.notes.requiresAllHeroClasses',
    ];
    for (const key of step15Keys) {
      expect(setup.setupNotes.some(n => n.key === key)).toBe(false);
    }
  });
});


