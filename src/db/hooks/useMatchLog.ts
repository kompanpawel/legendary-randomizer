import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../schema';
import type { MatchLog } from '../../types/stats';

export function useRecentMatchLog(limit = 10) {
  return useLiveQuery(
    () => db.matchLog.orderBy('date').reverse().limit(limit).toArray(),
    []
  );
}

export function useMatchLog() {
  return useLiveQuery(() => db.matchLog.orderBy('date').reverse().toArray(), []);
}

export async function addMatch(log: Omit<MatchLog, 'id'>): Promise<number | undefined> {
  return db.matchLog.add(log);
}

export async function clearMatchLog(): Promise<void> {
  await db.matchLog.clear();
}

export function useTotalMatchCount() {
  return useLiveQuery(() => db.matchLog.count(), []);
}


