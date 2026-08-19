import { z } from 'zod';
import { db } from '../db/schema';
import type { MatchLog, HeroStats } from '../types/stats';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const MatchLogSchema = z.object({
  id: z.number().optional(),
  date: z.string(),
  result: z.enum(['win', 'loss']),
  score: z.number().optional(),
  playerCount: z.number(),
  mastermindId: z.string(),
  schemeId: z.string(),
  heroIds: z.array(z.string()),
  villainIds: z.array(z.string()),
  henchmanIds: z.array(z.string()),
  randomizationMode: z.enum(['smart', 'dustOff', 'synergy', 'manual']),
});

const HeroStatsSchema = z.object({
  heroId: z.string(),
  playCount: z.number(),
  wins: z.number(),
  losses: z.number(),
  lastPlayedAt: z.string(),
});

const BackupSchema = z.object({
  exportedAt: z.string(),
  version: z.literal(1),
  matchLog: z.array(MatchLogSchema),
  heroStats: z.array(HeroStatsSchema),
});

export type Backup = z.infer<typeof BackupSchema>;

// ─── Eksport ─────────────────────────────────────────────────────────────────

export async function exportStats(): Promise<void> {
  const matchLog = await db.matchLog.toArray();
  const heroStats = await db.heroStats.toArray();

  const backup: Backup = {
    exportedAt: new Date().toISOString(),
    version: 1,
    matchLog,
    heroStats,
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

export async function importStats(file: File): Promise<{ imported: number; errors: string[] }> {
  const text = await file.text();
  const json: unknown = JSON.parse(text);

  const parsed = BackupSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid file format: ${parsed.error.message}`);
  }

  const { matchLog, heroStats } = parsed.data;
  const errors: string[] = [];

  // Import match logs
  const logsToImport: Omit<MatchLog, 'id'>[] = matchLog.map(({ id: _id, ...log }) => log);
  await db.matchLog.bulkPut(logsToImport as MatchLog[]);

  // Import hero stats
  await db.heroStats.bulkPut(heroStats as HeroStats[]);

  return { imported: matchLog.length + heroStats.length, errors };
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

