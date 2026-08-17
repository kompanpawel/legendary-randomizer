/**
 * Algorytm ważonego losowania bez powtórzeń – O(n*k)
 */
export function weightedSample<T>(items: T[], k: number, weights: number[]): T[] {
  if (items.length === 0 || k <= 0) return [];

  const pool = [...items];
  const w = [...weights];
  const result: T[] = [];
  const count = Math.min(k, pool.length);

  for (let i = 0; i < count; i++) {
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      // Fallback: wybierz losowo
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool[idx]);
      pool.splice(idx, 1);
      w.splice(idx, 1);
      continue;
    }

    let r = Math.random() * sum;
    let chosen = pool.length - 1; // domyślnie ostatni

    for (let j = 0; j < pool.length; j++) {
      r -= w[j];
      if (r <= 0) {
        chosen = j;
        break;
      }
    }

    result.push(pool[chosen]);
    pool.splice(chosen, 1);
    w.splice(chosen, 1);
  }

  return result;
}

/** Równomierne losowanie bez powtórzeń (fallback) */
export function uniformSample<T>(items: T[], k: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  const count = Math.min(k, pool.length);

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return result;
}

