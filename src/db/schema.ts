import Dexie, { type EntityTable } from 'dexie';
import type { MatchLog, HeroStats, AppSettings, MastermindStats, SchemeStats } from '../types/stats';

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

export { db };


