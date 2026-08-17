import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../schema';
import type { SchemeStats } from '../../types/stats';

export function useSchemeStats(schemeId?: string) {
  return useLiveQuery(
    () => schemeId ? db.schemeStats.get(schemeId) : undefined,
    [schemeId]
  );
}

export function useAllSchemeStats() {
  return useLiveQuery(() => db.schemeStats.toArray(), []);
}

export async function upsertSchemeStats(schemeId: string, playerWon: boolean): Promise<void> {
  const existing = await db.schemeStats.get(schemeId);
  const now = new Date().toISOString();

  // Schemat "wygrywa" kiedy gracze przegrywają
  const schemeWon = !playerWon;

  if (existing) {
    await db.schemeStats.update(schemeId, {
      playCount: existing.playCount + 1,
      wins: schemeWon ? existing.wins + 1 : existing.wins,
      losses: schemeWon ? existing.losses : existing.losses + 1,
      lastPlayedAt: now,
    });
  } else {
    await db.schemeStats.put({
      schemeId,
      playCount: 1,
      wins: schemeWon ? 1 : 0,
      losses: schemeWon ? 0 : 1,
      lastPlayedAt: now,
    } satisfies SchemeStats);
  }
}

export async function resetAllSchemeStats(): Promise<void> {
  await db.schemeStats.clear();
}

