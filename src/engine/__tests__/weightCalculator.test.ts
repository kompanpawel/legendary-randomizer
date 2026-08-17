import { describe, it, expect } from 'vitest';
import { calculateWeight } from '../../engine/weightCalculator';

describe('calculateWeight', () => {
  it('alpha=2.0 penalizuje częściej granego bohatera silniej niż alpha=0.5', () => {
    const w1 = calculateWeight(10, -1, 20, 2.0);
    const w2 = calculateWeight(10, -1, 20, 0.5);
    expect(w1).toBeLessThan(w2);
  });

  it('bohater nigdy nie grany ma wyższą wagę niż często grany (alpha=1.0)', () => {
    const never = calculateWeight(0, -1, 10, 1.0);
    const often = calculateWeight(10, 5, 10, 1.0);
    expect(never).toBeGreaterThan(often);
  });

  it('deltaT rośnie z czasem od ostatniej gry', () => {
    const recent = calculateWeight(5, 9, 10, 1.0);  // grał w meczu 9/10
    const old = calculateWeight(5, 1, 10, 1.0);     // grał w meczu 1/10
    expect(old).toBeGreaterThan(recent);
  });

  it('zwraca wartość dodatnią', () => {
    expect(calculateWeight(0, -1, 0, 1.0)).toBeGreaterThan(0);
    expect(calculateWeight(100, 50, 100, 2.0)).toBeGreaterThan(0);
  });
});

