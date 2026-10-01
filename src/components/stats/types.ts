import type { MatchResult, RandomizationMode } from '@/types/stats.ts';

export interface MatchEntityStats {
  wins: number;
  losses: number;
  playCount: number;
}

export interface MatchHeroView {
  id: string;
  name: string;
  faction: string;
  expansionName?: string;
  stats?: MatchEntityStats;
}

export interface MatchNamedEntity {
  id: string;
  name: string;
  expansionName?: string;
}

export interface RecentMatchViewModel {
  id: string;
  date: string;
  result: MatchResult;
  playerCount: number;
  randomizationMode: RandomizationMode;
  isEpicMastermind: boolean;
  score?: number;
  threatScore?: number;
  balanceGap?: number;
  mastermind: MatchNamedEntity & { stats?: MatchEntityStats };
  scheme: MatchNamedEntity & { stats?: MatchEntityStats };
  villains: MatchNamedEntity[];
  henchmen: MatchNamedEntity[];
  heroes: MatchHeroView[];
  heroAverageWinRate?: number;
}
