export interface PlayerSetupRule {
  heroCount: number;
  villainCount: number;
  henchmanCount: number;
  bystanders: number;
}

/**
 * Setup rules by player count.
 * Source: What If? expansion rulebook
 */
export const PLAYER_SETUP_RULES: Record<number, PlayerSetupRule> = {
  1: { heroCount: 3, villainCount: 1, henchmanCount: 1, bystanders: 1 },
  2: { heroCount: 5, villainCount: 2, henchmanCount: 1, bystanders: 2 },
  3: { heroCount: 5, villainCount: 3, henchmanCount: 1, bystanders: 8 },
  4: { heroCount: 5, villainCount: 4, henchmanCount: 2, bystanders: 8 },
  5: { heroCount: 6, villainCount: 5, henchmanCount: 2, bystanders: 16 },
};

export function getSetupRules(playerCount: number): PlayerSetupRule {
  return PLAYER_SETUP_RULES[playerCount] ?? PLAYER_SETUP_RULES[2];
}

