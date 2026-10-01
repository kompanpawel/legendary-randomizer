import { describe, expect, it } from 'vitest';
import { calculatePlayerWinRate } from './RecentMatchCard';

describe('calculatePlayerWinRate', () => {
  it('treats scheme losses as player wins', () => {
    expect(calculatePlayerWinRate({ wins: 0, losses: 1 })).toBe(100);
    expect(calculatePlayerWinRate({ wins: 1, losses: 0 })).toBe(0);
  });

  it('returns undefined when stats are missing', () => {
    expect(calculatePlayerWinRate()).toBeUndefined();
  });
});
