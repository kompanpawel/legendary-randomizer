/**
 * W(h) = 1 / (playCount + 1)^alpha * deltaT
 *
 * @param playCount        - łączna liczba rozgrywek danym bohaterem
 * @param lastPlayedIndex  - indeks meczu ostatniej gry (-1 = nigdy)
 * @param totalMatches     - łączna liczba wszystkich meczów w historii
 * @param alpha            - współczynnik konfigurowalny [0.5–2.0]
 */
export function calculateWeight(
  playCount: number,
  lastPlayedIndex: number,
  totalMatches: number,
  alpha: number
): number {
  const deltaT =
    lastPlayedIndex === -1
      ? totalMatches + 1
      : totalMatches - lastPlayedIndex + 1;

  return (1 / Math.pow(playCount + 1, alpha)) * deltaT;
}

/**
 * Oblicz wagi dla tablicy bohaterów na podstawie statystyk
 */
export interface WeightInput {
  heroId: string;
  playCount: number;
  lastPlayedIndex: number;
}

export function calculateWeights(
  heroIds: string[],
  statsMap: Map<string, WeightInput>,
  totalMatches: number,
  alpha: number
): number[] {
  return heroIds.map((id) => {
    const stats = statsMap.get(id);
    if (!stats) {
      // Nigdy nie grany: maksymalny bonus
      return calculateWeight(0, -1, totalMatches, alpha);
    }
    return calculateWeight(stats.playCount, stats.lastPlayedIndex, totalMatches, alpha);
  });
}

