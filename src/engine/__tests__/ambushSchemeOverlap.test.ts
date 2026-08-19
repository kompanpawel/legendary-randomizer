/**
 * Testy kroku 3 z MECHANIC_CONFLICTS.md:
 * „Ambush Scheme — tylko jeden na raz"
 *
 * Weryfikuje, że:
 * 1. Dokładnie 4 villain groups w cards.json mają hasAmbushScheme: true.
 * 2. generateSetup() emituje notatkę setupową gdy wylosowane zostaną ≥2 grupy
 *    z Ambush Scheme.
 * 3. Gdy tylko jedna (lub zero) taka grupa jest w setupie, notatka nie pojawia
 *    się.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { CardsDatabase } from '@/types/cards';
import { generateSetup } from '../SmartRandomizerEngine';

const db = cardsDb as CardsDatabase;

// ─── 1. Dane: dokładnie 4 grupy mają flagę hasAmbushScheme ──────────────────

describe('cards.json – hasAmbushScheme annotation', () => {
  it('exactly 4 villain groups are marked hasAmbushScheme: true', () => {
    const marked = db.villains.filter(v => v.hasAmbushScheme);
    expect(marked.map(v => v.name).sort()).toEqual([
      'Armada of Kang',
      'Cross Technologies',
      'Ghost Chasers',
      'Quantum Realm',
    ]);
  });

  it('each marked group has a card with Twist: and "defeat this Scheme"', () => {
    const marked = db.villains.filter(v => v.hasAmbushScheme);
    for (const group of marked) {
      const hasAmbushCard = group.cards.some(
        c => /\bTwist:/i.test(c.abilities) && /defeat this scheme/i.test(c.abilities)
      );
      expect(hasAmbushCard, `${group.name} should have Ambush Scheme card`).toBe(true);
    }
  });

  it('no other villain group has an Ambush Scheme card pattern', () => {
    const unmarked = db.villains.filter(v => !v.hasAmbushScheme);
    for (const group of unmarked) {
      const hasAmbushCard = group.cards.some(
        c => /\bTwist:/i.test(c.abilities) && /defeat this scheme/i.test(c.abilities)
      );
      expect(hasAmbushCard, `${group.name} should NOT have Ambush Scheme card`).toBe(false);
    }
  });
});

// ─── 2. Silnik: setupNotes gdy ≥2 grupy z Ambush Scheme ─────────────────────

const MASTERMIND = db.masterminds[0];
const SCHEME = db.schemes[0];

/** Buduje minimalny input dla generateSetup z wymuszonym zestawem villain groups */
function makeInput(forcedVillains: typeof db.villains) {
  return {
    heroes: db.heroes.slice(0, 10),
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: [MASTERMIND],
    schemes: [SCHEME],
    villains: forcedVillains,
    henchmen: db.henchmen.slice(0, 3),
    totalMatches: 0,
    playerCount: 2,
    alpha: 0.5,
    mode: 'manual' as const,
    forcedMastermind: MASTERMIND,
    forcedScheme: SCHEME,
  };
}

describe('generateSetup() – setupNotes for Ambush Scheme overlap', () => {
  const ambushGroups = db.villains.filter(v => v.hasAmbushScheme);
  const nonAmbushGroups = db.villains.filter(v => !v.hasAmbushScheme);

  it('emits a setupNote when ≥2 Ambush Scheme groups are selected (only those 2 in pool)', () => {
    // Wymuś pulę złożoną wyłącznie z 2 grup Ambush Scheme + wystarczająca pula henchmen
    const input = makeInput(ambushGroups.slice(0, 2));
    const setup = generateSetup(input);

    // Obie grupy powinny być wybrane (są jedynymi dostępnymi)
    expect(setup.villains.filter(v => v.hasAmbushScheme).length).toBe(2);
    expect(setup.setupNotes.length).toBeGreaterThan(0);
    expect(setup.setupNotes[0].key).toBe('setup.notes.ambushSchemeOverlap');
  });

  it('does NOT emit setupNote when only 1 Ambush Scheme group is selected', () => {
    // Jedna grupa Ambush Scheme + wiele bez niej
    const pool = [ambushGroups[0], ...nonAmbushGroups.slice(0, 5)];
    const input = makeInput(pool);
    // Dla playerCount=2 villainCount=2, więc prawdopodobnie 1 z Ambush Scheme + 1 inna
    // Ale żeby to było deterministyczne, sprawdzamy warunek dla konkretnego wyniku:
    const setup = generateSetup(input);
    const ambushCount = setup.villains.filter(v => v.hasAmbushScheme).length;
    if (ambushCount < 2) {
      expect(setup.setupNotes.some(n => n.key === 'setup.notes.ambushSchemeOverlap')).toBe(false);
    }
  });

  it('does NOT emit setupNote when zero Ambush Scheme groups are selected', () => {
    const input = makeInput(nonAmbushGroups.slice(0, 4));
    const setup = generateSetup(input);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.ambushSchemeOverlap')).toBe(false);
  });

  it('GameSetup always has a setupNotes array (even when empty)', () => {
    const input = makeInput(nonAmbushGroups.slice(0, 4));
    const setup = generateSetup(input);
    expect(Array.isArray(setup.setupNotes)).toBe(true);
  });
});


