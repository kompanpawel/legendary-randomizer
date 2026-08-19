import { describe, it, expect } from 'vitest';
import cardsData from '../../assets/cards.json';
import type { CardsDatabase } from '@/types/cards.ts';
import { generateSetup } from '../SmartRandomizerEngine';

const db = cardsData as unknown as CardsDatabase;

const ADAPTING_MASTERMIND_IDS = [
  'sinister-six-2099-40-100',
  'alchemax-executives-40-101',
  'hydra-high-council-25-65',
  'hydra-super-adaptoid-25-66',
];
const HIDDEN_HEART_OF_DARKNESS_ID = 'hidden-heart-of-darkness-15-75';

describe('generateSetup — Adapting Mastermind vs Hidden Heart of Darkness conflict', () => {
  const baseInput = {
    heroes: db.heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds,
    schemes: db.schemes,
    villains: db.villains,
    henchmen: db.henchmen,
    totalMatches: 0,
    playerCount: 3,
    alpha: 0.5,
    mode: 'manual' as const,
  };

  it('nigdy nie losuje tej niegrywalnej kombinacji losowo (100 prób)', () => {
    for (let i = 0; i < 100; i++) {
      const setup = generateSetup(baseInput);
      const isAdapting = ADAPTING_MASTERMIND_IDS.includes(setup.mastermind.id);
      const isConflictScheme = setup.scheme.id === HIDDEN_HEART_OF_DARKNESS_ID;
      expect(isAdapting && isConflictScheme).toBe(false);
    }
  });

  it('gdy Adapting Mastermind jest wymuszony, nigdy nie losuje Hidden Heart of Darkness (100 prób)', () => {
    const forcedMastermind = db.masterminds.find(m => m.id === 'hydra-super-adaptoid-25-66')!;
    for (let i = 0; i < 100; i++) {
      const setup = generateSetup({ ...baseInput, forcedMastermind });
      expect(setup.scheme.id).not.toBe(HIDDEN_HEART_OF_DARKNESS_ID);
    }
  });

  it('gdy Hidden Heart of Darkness jest wymuszony, nigdy nie losuje Adapting Mastermind (100 prób)', () => {
    const forcedScheme = db.schemes.find(s => s.id === HIDDEN_HEART_OF_DARKNESS_ID)!;
    for (let i = 0; i < 100; i++) {
      const setup = generateSetup({ ...baseInput, forcedScheme });
      expect(ADAPTING_MASTERMIND_IDS).not.toContain(setup.mastermind.id);
    }
  });

  it('jeśli oba są wymuszone ręcznie przez gracza, respektuje jego wybór (bez filtrowania)', () => {
    const forcedMastermind = db.masterminds.find(m => m.id === 'hydra-super-adaptoid-25-66')!;
    const forcedScheme = db.schemes.find(s => s.id === HIDDEN_HEART_OF_DARKNESS_ID)!;
    const setup = generateSetup({ ...baseInput, forcedMastermind, forcedScheme });
    expect(setup.mastermind.id).toBe(forcedMastermind.id);
    expect(setup.scheme.id).toBe(forcedScheme.id);
  });
});
