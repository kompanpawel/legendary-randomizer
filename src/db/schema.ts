import Dexie, { type EntityTable } from 'dexie';
import type { MatchLog, HeroStats, AppSettings, MastermindStats, SchemeStats } from '../types/stats';
import { backfillLegacyMatchMetrics } from '../utils/legacyMatchMetrics';

const db = new Dexie('LegendaryDB') as Dexie & {
  matchLog: EntityTable<MatchLog, 'id'>;
  heroStats: EntityTable<HeroStats, 'heroId'>;
  mastermindStats: EntityTable<MastermindStats, 'mastermindId'>;
  schemeStats: EntityTable<SchemeStats, 'schemeId'>;
  settings: EntityTable<AppSettings, 'id'>;
};

db.version(1).stores({
  matchLog: '++id, date, result, mastermindId, schemeId',
  heroStats: 'heroId, playCount, lastPlayedAt',
  settings: '++id',
});

db.version(2).stores({
  matchLog: '++id, date, result, mastermindId, schemeId',
  heroStats: 'heroId, playCount, lastPlayedAt',
  mastermindStats: 'mastermindId, playCount, lastPlayedAt',
  schemeStats: 'schemeId, playCount, lastPlayedAt',
  settings: '++id',
});

// Wersja 3: dodaje pola Epic do mastermindStats oraz isEpicMastermind/balanceGap do matchLog
db.version(3).stores({
  matchLog: '++id, date, result, mastermindId, schemeId',
  heroStats: 'heroId, playCount, lastPlayedAt',
  mastermindStats: 'mastermindId, playCount, lastPlayedAt',
  schemeStats: 'schemeId, playCount, lastPlayedAt',
  settings: '++id',
});

// Wersja 4: migracja legacy matchLog (uzupełnia threatScore i balanceGap, jeśli brak)
db.version(4).stores({
  matchLog: '++id, date, result, mastermindId, schemeId',
  heroStats: 'heroId, playCount, lastPlayedAt',
  mastermindStats: 'mastermindId, playCount, lastPlayedAt',
  schemeStats: 'schemeId, playCount, lastPlayedAt',
  settings: '++id',
}).upgrade(async (tx) => {
  const [matchLog, heroStats, mastermindStats, schemeStats] = await Promise.all([
    tx.table('matchLog').toArray() as Promise<MatchLog[]>,
    tx.table('heroStats').toArray() as Promise<HeroStats[]>,
    tx.table('mastermindStats').toArray() as Promise<MastermindStats[]>,
    tx.table('schemeStats').toArray() as Promise<SchemeStats[]>,
  ]);

  const migrated = backfillLegacyMatchMetrics(matchLog, heroStats, mastermindStats, schemeStats);
  for (let i = 0; i < migrated.length; i += 1) {
    const before = matchLog[i];
    const after = migrated[i];
    if (before.id === undefined) continue;

    const changes: Partial<Pick<MatchLog, 'threatScore' | 'balanceGap'>> = {};
    if (before.threatScore === undefined && after.threatScore !== undefined) {
      changes.threatScore = after.threatScore;
    }
    if (before.balanceGap === undefined && after.balanceGap !== undefined) {
      changes.balanceGap = after.balanceGap;
    }

    if (Object.keys(changes).length > 0) {
      await tx.table('matchLog').update(before.id, changes);
    }
  }
});

// Wersja 5: odbudowuje statystyki mastermindów i schematów na podstawie historii rozgrywek
db.version(5).stores({
  matchLog: '++id, date, result, mastermindId, schemeId',
  heroStats: 'heroId, playCount, lastPlayedAt',
  mastermindStats: 'mastermindId, playCount, lastPlayedAt',
  schemeStats: 'schemeId, playCount, lastPlayedAt',
  settings: '++id',
}).upgrade(async (tx) => {
  const matchLog = await tx.table('matchLog').toArray() as MatchLog[];
  const mastermindStatsMap = new Map<string, MastermindStats>();
  const schemeStatsMap = new Map<string, SchemeStats>();

  for (const match of matchLog) {
    const playerWon = match.result === 'win';
    const mastermindWon = !playerWon;
    const schemeWon = !playerWon;
    const playedAt = match.date;

    const currentMastermind = mastermindStatsMap.get(match.mastermindId) ?? {
      mastermindId: match.mastermindId,
      playCount: 0,
      wins: 0,
      losses: 0,
      lastPlayedAt: playedAt,
      epicPlayCount: 0,
      epicWins: 0,
      epicLosses: 0,
    };

    currentMastermind.playCount += 1;
    currentMastermind.wins += mastermindWon ? 1 : 0;
    currentMastermind.losses += mastermindWon ? 0 : 1;
    currentMastermind.lastPlayedAt = currentMastermind.lastPlayedAt > playedAt ? currentMastermind.lastPlayedAt : playedAt;
    if (match.isEpicMastermind) {
      currentMastermind.epicPlayCount += 1;
      currentMastermind.epicWins += mastermindWon ? 1 : 0;
      currentMastermind.epicLosses += mastermindWon ? 0 : 1;
    }
    mastermindStatsMap.set(match.mastermindId, currentMastermind);

    const currentScheme = schemeStatsMap.get(match.schemeId) ?? {
      schemeId: match.schemeId,
      playCount: 0,
      wins: 0,
      losses: 0,
      lastPlayedAt: playedAt,
    };

    currentScheme.playCount += 1;
    currentScheme.wins += schemeWon ? 1 : 0;
    currentScheme.losses += schemeWon ? 0 : 1;
    currentScheme.lastPlayedAt = currentScheme.lastPlayedAt > playedAt ? currentScheme.lastPlayedAt : playedAt;
    schemeStatsMap.set(match.schemeId, currentScheme);
  }

  await tx.table('mastermindStats').clear();
  await tx.table('schemeStats').clear();

  if (mastermindStatsMap.size > 0) {
    await tx.table('mastermindStats').bulkPut([...mastermindStatsMap.values()]);
  }
  if (schemeStatsMap.size > 0) {
    await tx.table('schemeStats').bulkPut([...schemeStatsMap.values()]);
  }
});

export { db };
