import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../schema';
import type { HeroStats } from '../../types/stats';

export function useHeroStats(heroId?: string) {
  return useLiveQuery(
    () => heroId ? db.heroStats.get(heroId) : undefined,
    [heroId]
  );
}

export function useAllHeroStats() {
  return useLiveQuery(() => db.heroStats.toArray(), []);
}

export async function upsertHeroStats(heroId: string, win: boolean): Promise<void> {
  const existing = await db.heroStats.get(heroId);
  const now = new Date().toISOString();

  if (existing) {
    await db.heroStats.update(heroId, {
      playCount: existing.playCount + 1,
      wins: win ? existing.wins + 1 : existing.wins,
      losses: win ? existing.losses : existing.losses + 1,
      lastPlayedAt: now,
    });
  } else {
    await db.heroStats.put({
      heroId,
      playCount: 1,
      wins: win ? 1 : 0,
      losses: win ? 0 : 1,
      lastPlayedAt: now,
    } satisfies HeroStats);
  }
}

export async function resetAllHeroStats(): Promise<void> {
  await db.heroStats.clear();
}

