import { describe, it, expect } from 'vitest';
import { synergyEngineMode } from '../modes/synergyEngine';
import type { Hero, Mastermind, Scheme } from '@/types/cards.ts';

function makeHero(id: string, countersProvided: string[]): Hero {
  return {
    id,
    name: id,
    expansionId: 1,
    faction: 'Test',
    primaryClasses: ['Strength'],
    keywords: [],
    powerLevel: 3,
    countersProvided,
    cards: [],
  };
}

function makeMastermind(countersNeeded: string[]): Mastermind {
  return {
    id: 'mm-1',
    name: 'Test Mastermind',
    expansionId: 1,
    difficulty: 3,
    alwaysLeads: 'Any Villain Group',
    theme: '',
    vp: 6,
    countersNeeded,
    cards: [{ name: 'Tactic 1', isEpic: false, abilities: '' }],
  };
}

function makeScheme(): Scheme {
  return {
    id: 'scheme-1',
    name: 'Test Scheme',
    expansionId: 1,
    difficulty: 3,
    countersNeeded: [],
    overrides: {},
    cards: [{ name: 'Test Scheme', abilities: '' }],
  };
}

describe('synergyEngineMode — pokrycie S.H.I.E.L.D. Clearance przez tag shield-synergy', () => {
  it('preferuje bohaterów z countersProvided=shield-synergy, gdy mastermind wymaga shield-synergy (np. Maria Hill)', () => {
    const shieldHeroes = Array.from({ length: 3 }, (_, i) => makeHero(`shield${i}`, ['shield-synergy']));
    const otherHeroes = Array.from({ length: 20 }, (_, i) => makeHero(`other${i}`, []));
    const heroes = [...shieldHeroes, ...otherHeroes];
    const mastermind = makeMastermind(['shield-synergy', 'villain-control']);
    const scheme = makeScheme();

    // Losujemy wielokrotnie małe pule (k=3) i liczymy, jak często pojawiają się shield-heroes.
    let shieldPicks = 0;
    let totalPicks = 0;
    for (let i = 0; i < 200; i++) {
      const picked = synergyEngineMode(heroes, [], scheme, mastermind, 0, 3, 0.5, [], [], 6);
      totalPicks += picked.length;
      shieldPicks += picked.filter(h => h.id.startsWith('shield')).length;
    }

    // Bez synergii oczekiwalibyśmy ok. 3/23 ≈ 13% udziału shield-heroes.
    // Dzięki SYNERGY_MULTIPLIER powinno być wyraźnie wyżej.
    const shieldShare = shieldPicks / totalPicks;
    expect(shieldShare).toBeGreaterThan(0.13);
  });
});
