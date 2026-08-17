import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../schema';
import type { MastermindStats } from '../../types/stats';

export function useMastermindStats(mastermindId?: string) {
  return useLiveQuery(
    () => mastermindId ? db.mastermindStats.get(mastermindId) : undefined,
    [mastermindId]
  );
}

export function useAllMastermindStats() {
  return useLiveQuery(() => db.mastermindStats.toArray(), []);
}

/** Uzupelnia brakujace pola Epic dla rekordow z wersji v2 bazy */
function withEpicDefaults(s: MastermindStats) {
  return {
    ...s,
    epicPlayCount: s.epicPlayCount ?? 0,
    epicWins:      s.epicWins      ?? 0,
    epicLosses:    s.epicLosses    ?? 0,
  };
}

/**
 * Aktualizuje statystyki masterminda po rozgrywce.
 *
 * @param mastermindId - ID masterminda
 * @param playerWon    - true jezeli gracze wygrali (mastermind przegral)
 * @param isEpic       - true jezeli rozgrywka byla w trybie Epic
 */
export async function upsertMastermindStats(
  mastermindId: string,
  playerWon: boolean,
  isEpic = false
): Promise<void> {
  const existing = await db.mastermindStats.get(mastermindId);
  const now = new Date().toISOString();
  const mastermindWon = !playerWon;

  if (existing) {
    const e = withEpicDefaults(existing);
    await db.mastermindStats.update(mastermindId, {
      playCount: e.playCount + 1,
      wins:   mastermindWon ? e.wins + 1 : e.wins,
      losses: mastermindWon ? e.losses   : e.losses + 1,
      lastPlayedAt: now,
      epicPlayCount: isEpic ? e.epicPlayCount + 1 : e.epicPlayCount,
      epicWins:      isEpic && mastermindWon  ? e.epicWins + 1   : e.epicWins,
      epicLosses:    isEpic && !mastermindWon ? e.epicLosses + 1 : e.epicLosses,
    });
  } else {
    await db.mastermindStats.put({
      mastermindId,
      playCount: 1,
      wins:   mastermindWon ? 1 : 0,
      losses: mastermindWon ? 0 : 1,
      lastPlayedAt: now,
      epicPlayCount: isEpic ? 1 : 0,
      epicWins:      isEpic && mastermindWon  ? 1 : 0,
      epicLosses:    isEpic && !mastermindWon ? 1 : 0,
    } as MastermindStats);
  }
}

export async function resetAllMastermindStats(): Promise<void> {
  await db.mastermindStats.clear();
}
