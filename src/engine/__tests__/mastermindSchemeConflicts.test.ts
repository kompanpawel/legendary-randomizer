import { describe, it, expect } from 'vitest';
import {
  isAdaptingMastermind,
  shufflesMastermindTacticsIntoVillainDeck,
  isMastermindSchemeIncompatible,
} from '../utils/mastermindSchemeConflicts';
import type { Mastermind, Scheme } from '@/types/cards.ts';

function makeMastermind(abilities: string): Mastermind {
  return {
    id: 'mm-1',
    name: 'Test Mastermind',
    expansionId: 1,
    difficulty: 3,
    alwaysLeads: 'Any Villain Group',
    theme: '',
    vp: 6,
    countersNeeded: [],
    cards: [{ name: 'Tactic 1', isEpic: false, abilities }],
  };
}

function makeScheme(abilities: string): Scheme {
  return {
    id: 'scheme-1',
    name: 'Test Scheme',
    expansionId: 1,
    difficulty: 3,
    countersNeeded: [],
    overrides: {},
    cards: [{ name: 'Test Scheme', abilities }],
  };
}

describe('isAdaptingMastermind', () => {
  it('rozpoznaje Adapting Mastermind po [Adapt] w abilities', () => {
    const mm = makeMastermind('Setup: [Adapt].\nFight: KO one of your grey Heroes. [Adapt].');
    expect(isAdaptingMastermind(mm)).toBe(true);
  });

  it('zwraca false dla zwykłego Mastermind', () => {
    const mm = makeMastermind('Fight: KO one of your Heroes.');
    expect(isAdaptingMastermind(mm)).toBe(false);
  });
});

describe('shufflesMastermindTacticsIntoVillainDeck', () => {
  it('rozpoznaje schemat Hidden Heart of Darkness', () => {
    const scheme = makeScheme(
      'Setup: 8 Twists. Shuffle the Mastermind Tactics into the Villain Deck as Villains.'
    );
    expect(shufflesMastermindTacticsIntoVillainDeck(scheme)).toBe(true);
  });

  it('zwraca false dla zwykłego schematu', () => {
    const scheme = makeScheme('Setup: 8 Twists. Add an extra Villain Group.');
    expect(shufflesMastermindTacticsIntoVillainDeck(scheme)).toBe(false);
  });
});

describe('isMastermindSchemeIncompatible', () => {
  it('wykrywa konflikt Adapting Mastermind + Hidden Heart of Darkness', () => {
    const mm = makeMastermind('Setup: [Adapt].\nFight: KO one of your grey Heroes. [Adapt].');
    const scheme = makeScheme(
      'Setup: 8 Twists. Shuffle the Mastermind Tactics into the Villain Deck as Villains.'
    );
    expect(isMastermindSchemeIncompatible(mm, scheme)).toBe(true);
  });

  it('nie zgłasza konfliktu dla zwykłego Mastermind + Hidden Heart of Darkness', () => {
    const mm = makeMastermind('Fight: KO one of your Heroes.');
    const scheme = makeScheme(
      'Setup: 8 Twists. Shuffle the Mastermind Tactics into the Villain Deck as Villains.'
    );
    expect(isMastermindSchemeIncompatible(mm, scheme)).toBe(false);
  });

  it('nie zgłasza konfliktu dla Adapting Mastermind + zwykłego schematu', () => {
    const mm = makeMastermind('Setup: [Adapt].\nFight: KO one of your grey Heroes. [Adapt].');
    const scheme = makeScheme('Setup: 8 Twists. Add an extra Villain Group.');
    expect(isMastermindSchemeIncompatible(mm, scheme)).toBe(false);
  });
});
