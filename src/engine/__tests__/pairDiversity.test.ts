import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

describe('generateSetup() — różnorodność par Mastermind + Scheme', () => {
  const masterminds = db.masterminds.slice(0, 2);
  const schemes = db.schemes.filter(s => !s.overrides.isUnveiledScheme).slice(0, 4);

  const base = {
    heroes: db.heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds,
    schemes,
    villains: db.villains.slice(0, 8),
    henchmen: db.henchmen.slice(0, 3),
    totalMatches: 0,
    playerCount: 2,
    alpha: 0.5,
    mode: 'smart' as const,
  };

  it('nie powtarza zagranej pary, gdy istnieją niezagrane', () => {
    const played = new Set<string>();
    const matchHistory: Array<{ mastermindId: string; schemeId: string }> = [];
    for (let i = 0; i < masterminds.length * schemes.length; i++) {
      const s = generateSetup({ ...base, matchHistory });
      const key = `${s.mastermind.id}|${s.scheme.id}`;
      expect(played.has(key)).toBe(false);
      played.add(key);
      matchHistory.push({ mastermindId: s.mastermind.id, schemeId: s.scheme.id });
    }
  });
});

