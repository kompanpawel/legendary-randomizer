export type MatchResult = 'win' | 'loss';
export type RandomizationMode = 'smart' | 'dustOff' | 'synergy' | 'manual';

export interface MatchLog {
  id?: number;
  date: string;
  result: MatchResult;
  score?: number;
  playerCount: number;
  mastermindId: string;
  schemeId: string;
  heroIds: string[];
  villainIds: string[];
  henchmanIds: string[];
  randomizationMode: RandomizationMode;
  /** Czy rozgrywka była prowadzona przeciw epickiej wersji masterminda */
  isEpicMastermind?: boolean;
  /** Wynik balansu trudności w momencie losowania (threatScore - heroTeamScore) */
  balanceGap?: number;
}

export interface HeroStats {
  heroId: string;
  playCount: number;
  wins: number;
  losses: number;
  lastPlayedAt: string;
}

/** Statystyki masterminda – ile razy pokonał graczy (loss) a ile razy został pokonany (win) */
export interface MastermindStats {
  mastermindId: string;
  playCount: number;
  /** Ile razy mastermind wygrał (gracze przegrali) */
  wins: number;
  /** Ile razy mastermind przegrał (gracze wygrali) */
  losses: number;
  lastPlayedAt: string;
  /** Statystyki trybu Epic – ile razy zagrano w trybie Epic */
  epicPlayCount: number;
  /** Ile razy mastermind wygrał w trybie Epic (gracze przegrali) */
  epicWins: number;
  /** Ile razy mastermind przegrał w trybie Epic (gracze wygrali) */
  epicLosses: number;
}

/** Statystyki schematu – ile razy pokonał graczy (loss) a ile razy gracze go pokonali (win) */
export interface SchemeStats {
  schemeId: string;
  playCount: number;
  /** Ile razy schemat wygrał (gracze przegrali) */
  wins: number;
  /** Ile razy schemat przegrał (gracze wygrali) */
  losses: number;
  lastPlayedAt: string;
}

export interface AppSettings {
  id?: number;
  alpha: number;
  selectedExpansionIds: number[];
  heroCount: number;
  playerCount: number;
}

