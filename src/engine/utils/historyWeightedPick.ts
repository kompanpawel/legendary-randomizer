import { weightedSample } from './weightedSample';

interface HistoryEntry {
  playCount: number;
  lastPlayedAt: string;
}

/**
 * Losuje 1 element z uwzględnieniem historii rozgrywek (Mastermind / Scheme).
 * W(x) = 1 / (playCount + 1)^alpha * deltaT, gdzie deltaT to pozycja w rankingu
 * „od najdawniej granego” (nigdy niegrane = największy bonus).
 */
export function historyWeightedPick<T extends { id: string }>(
  items: T[],
  stats: Map<string, HistoryEntry>,
  alpha: number
): T {
  if (items.length === 1) return items[0];

  const played = items
    .filter(i => (stats.get(i.id)?.playCount ?? 0) > 0)
    .sort((a, b) =>
      (stats.get(a.id)?.lastPlayedAt || '').localeCompare(stats.get(b.id)?.lastPlayedAt || '')
    );
  const rank = new Map(played.map((i, idx) => [i.id, idx]));
  const n = played.length;

  const weights = items.map(i => {
    const s = stats.get(i.id);
    const playCount = s?.playCount ?? 0;
    const deltaT = rank.has(i.id) ? n - (rank.get(i.id) as number) : n + 1;
    return deltaT / Math.pow(playCount + 1, alpha);
  });

  return weightedSample(items, 1, weights)[0];
}

