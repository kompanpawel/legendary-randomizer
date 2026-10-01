import { z } from 'zod';
import { db } from '../db/schema';
import type { HeroStats, MastermindStats, MatchLog, SchemeStats } from '../types/stats';
import { backfillLegacyMatchMetrics } from './legacyMatchMetrics';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const MatchLogSchema = z.object({
  id: z.number().optional(),
  date: z.string(),
  result: z.enum(['win', 'loss']),
  score: z.number().optional(),
  threatScore: z.number().optional(),
  playerCount: z.number(),
  mastermindId: z.string(),
  schemeId: z.string(),
  heroIds: z.array(z.string()),
  villainIds: z.array(z.string()),
  henchmanIds: z.array(z.string()),
  randomizationMode: z.enum(['smart', 'dustOff', 'synergy', 'manual']),
  isEpicMastermind: z.boolean().optional(),
  balanceGap: z.number().optional(),
});

const HeroStatsSchema = z.object({
  heroId: z.string(),
  playCount: z.number(),
  wins: z.number(),
  losses: z.number(),
  lastPlayedAt: z.string(),
});

const MastermindStatsSchema = z.object({
  mastermindId: z.string(),
  playCount: z.number(),
  wins: z.number(),
  losses: z.number(),
  lastPlayedAt: z.string(),
  epicPlayCount: z.number().optional(),
  epicWins: z.number().optional(),
  epicLosses: z.number().optional(),
});

const SchemeStatsSchema = z.object({
  schemeId: z.string(),
  playCount: z.number(),
  wins: z.number(),
  losses: z.number(),
  lastPlayedAt: z.string(),
});

const BackupSchemaV1 = z.object({
  exportedAt: z.string(),
  version: z.literal(1),
  matchLog: z.array(MatchLogSchema),
  heroStats: z.array(HeroStatsSchema),
});

const BackupSchemaV2 = z.object({
  exportedAt: z.string(),
  version: z.literal(2),
  matchLog: z.array(MatchLogSchema),
  heroStats: z.array(HeroStatsSchema),
  mastermindStats: z.array(MastermindStatsSchema),
  schemeStats: z.array(SchemeStatsSchema),
});

const BackupSchema = z.union([BackupSchemaV1, BackupSchemaV2]);

export type Backup = z.infer<typeof BackupSchema>;

// ─── Eksport ─────────────────────────────────────────────────────────────────

export async function exportStats(): Promise<void> {
  const matchLog = await db.matchLog.toArray();
  const heroStats = await db.heroStats.toArray();
  const mastermindStats = await db.mastermindStats.toArray();
  const schemeStats = await db.schemeStats.toArray();

  const backup: Backup = {
    exportedAt: new Date().toISOString(),
    version: 2,
    matchLog,
    heroStats,
    mastermindStats,
    schemeStats,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `legendary-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import kopii zapasowej ───────────────────────────────────────────────────

export async function importStats(
  file: File,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ imported: number; errors: string[] }> {
  const text = await file.text();
  const json: unknown = JSON.parse(text);

  const parsed = BackupSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid file format: ${parsed.error.message}`);
  }

  const { matchLog, heroStats } = parsed.data;
  const mastermindStats = parsed.data.version === 2 ? parsed.data.mastermindStats : [];
  const schemeStats = parsed.data.version === 2 ? parsed.data.schemeStats : [];
  const normalizedMastermindStats: MastermindStats[] = mastermindStats.map((stats) => ({
    ...stats,
    epicPlayCount: stats.epicPlayCount ?? 0,
    epicWins: stats.epicWins ?? 0,
    epicLosses: stats.epicLosses ?? 0,
  }));
  const errors: string[] = [];

  const migratedMatchLog = backfillLegacyMatchMetrics(matchLog, heroStats, normalizedMastermindStats, schemeStats);
  const logsToImport: Omit<MatchLog, 'id'>[] = migratedMatchLog.map(({ id: _id, ...log }) => log);

  if (mode === 'replace') {
    await db.transaction('rw', db.matchLog, db.heroStats, db.mastermindStats, db.schemeStats, async () => {
      await db.matchLog.clear();
      await db.heroStats.clear();
      await db.mastermindStats.clear();
      await db.schemeStats.clear();

      if (logsToImport.length > 0) {
        await db.matchLog.bulkPut(logsToImport as MatchLog[]);
      }
      if (heroStats.length > 0) {
        await db.heroStats.bulkPut(heroStats as HeroStats[]);
      }
      if (normalizedMastermindStats.length > 0) {
        await db.mastermindStats.bulkPut(normalizedMastermindStats);
      }
      if (schemeStats.length > 0) {
        await db.schemeStats.bulkPut(schemeStats as SchemeStats[]);
      }
    });
  } else {
    await db.matchLog.bulkPut(logsToImport as MatchLog[]);
    await db.heroStats.bulkPut(heroStats as HeroStats[]);

    if (normalizedMastermindStats.length > 0) {
      await db.mastermindStats.bulkPut(normalizedMastermindStats);
    }

    if (schemeStats.length > 0) {
      await db.schemeStats.bulkPut(schemeStats as SchemeStats[]);
    }
  }

  return { imported: matchLog.length + heroStats.length + mastermindStats.length + schemeStats.length, errors };
}

// ─── Walidacja pliku cards.json ───────────────────────────────────────────────

const HeroClassSchema = z.enum(['Covert', 'Instinct', 'Ranged', 'Strength', 'Tech']);

const HeroCardSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  cost: z.number(),
  class: HeroClassSchema,
  attack: z.string(),
  recruit: z.string(),
  abilities: z.string(),
});

const HeroSchema = z.object({
  id: z.string(),
  name: z.string(),
  expansionId: z.number(),
  faction: z.string(),
  primaryClasses: z.array(HeroClassSchema).default([]),
  keywords: z.array(z.string()).default([]),
  powerLevel: z.number().min(1).max(5).default(3),
  countersProvided: z.array(z.string()).default([]),
  cards: z.array(HeroCardSchema),
});

const CardsDatabaseSchema = z.object({
  expansions: z.array(z.object({ id: z.number(), label: z.string(), value: z.string(), initials: z.string(), cardTypes: z.array(z.number()) })),
  heroes: z.array(HeroSchema),
  masterminds: z.array(z.object({ id: z.string(), name: z.string(), expansionId: z.number() }).passthrough()),
  schemes: z.array(z.object({ id: z.string(), name: z.string(), expansionId: z.number() }).passthrough()),
  villains: z.array(z.object({ id: z.string(), name: z.string(), expansionId: z.number() }).passthrough()),
  henchmen: z.array(z.object({ id: z.string(), name: z.string(), expansionId: z.number() }).passthrough()),
});

export function validateCardsJson(json: unknown): { valid: boolean; error?: string } {
  const result = CardsDatabaseSchema.safeParse(json);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true };
}
