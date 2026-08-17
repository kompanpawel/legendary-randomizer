import { describe, it, expect } from 'vitest';
import { dustOffMode } from '../../engine/modes/dustOff';
import type { Hero } from '../../types/cards';
import type { HeroStats } from '../../types/stats';

function makeHero(id: string): Hero {
  return {
    id,
    name: id,
    expansionId: 1,
    faction: 'Test',
    primaryClasses: [],
    keywords: [],
    powerLevel: 3,
    countersProvided: [],
    cards: [],
  };
}

describe('dustOffMode', () => {
  it('zwraca poprawną liczbę bohaterów', () => {
    const heroes = Array.from({ length: 20 }, (_, i) => makeHero(`h${i}`));
    const stats: HeroStats[] = heroes.map((h, i) => ({
      heroId: h.id,
      playCount: i * 10, // h0 = 0, h1 = 10, ...h19 = 190
      wins: 0,
      losses: 0,
      lastPlayedAt: '',
    }));
    const result = dustOffMode(heroes, stats, 5);
    expect(result.length).toBe(5);
  });

  it('zwraca bohaterów z puli najrzadziej granych', () => {
    const heroes = Array.from({ length: 10 }, (_, i) => makeHero(`h${i}`));
    const stats: HeroStats[] = heroes.map((h, i) => ({
      heroId: h.id,
      playCount: i * 10,
      wins: 0,
      losses: 0,
      lastPlayedAt: '',
    }));
    // h0..h1 grało 0 i 10 razy – powinny być w puli 20%
    const result = dustOffMode(heroes, stats, 1);
    expect(result.length).toBe(1);
    // Powinien być z puli top 20% (2 bohaterów: h0, h1)
    const ids = result.map(h => h.id);
    expect(['h0', 'h1']).toContain(ids[0]);
  });

  it('działa gdy brak statystyk', () => {
    const heroes = Array.from({ length: 5 }, (_, i) => makeHero(`h${i}`));
    const result = dustOffMode(heroes, [], 3);
    expect(result.length).toBe(3);
    expect(new Set(result.map(h => h.id)).size).toBe(3);
  });
});

