import { describe, it, expect } from 'vitest';
import { weightedSample, uniformSample } from '../../engine/utils/weightedSample';

describe('weightedSample', () => {
  it('zwraca k unikalnych elementów', () => {
    const items = [1, 2, 3, 4, 5];
    const weights = [1, 1, 1, 1, 1];
    const result = weightedSample(items, 3, weights);
    expect(result.length).toBe(3);
    expect(new Set(result).size).toBe(3);
  });

  it('zwraca pustą tablicę gdy k=0', () => {
    const result = weightedSample([1, 2, 3], 0, [1, 1, 1]);
    expect(result).toEqual([]);
  });

  it('zwraca pustą tablicę gdy items jest puste', () => {
    const result = weightedSample([], 3, []);
    expect(result).toEqual([]);
  });

  it('zwraca wszystkie elementy gdy k >= length', () => {
    const items = [1, 2, 3];
    const weights = [1, 1, 1];
    const result = weightedSample(items, 10, weights);
    expect(result.length).toBe(3);
    expect(new Set(result).size).toBe(3);
  });

  it('preferuje elementy z wyższą wagą (statystycznie)', () => {
    const items = ['A', 'B'];
    const weights = [100, 1]; // A powinien być wybierany ~99% czasu
    let countA = 0;
    for (let i = 0; i < 200; i++) {
      const [first] = weightedSample(items, 1, weights);
      if (first === 'A') countA++;
    }
    expect(countA).toBeGreaterThan(150); // przynajmniej 75% razy
  });
});

describe('uniformSample', () => {
  it('zwraca k unikalnych elementów', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = uniformSample(items, 3);
    expect(result.length).toBe(3);
    expect(new Set(result).size).toBe(3);
  });
});

