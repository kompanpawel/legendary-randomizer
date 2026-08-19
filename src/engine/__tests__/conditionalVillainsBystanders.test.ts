/**
 * Punkt 11 — Warunkowe (player-count-gated) dodatki do puli Villain/Bystander
 *
 * Mechanika: Cztery schematy wymagają specjalnego traktowania Villain Groups
 * lub Bystanders w zależności od liczby graczy:
 *   - Deadpool Wants a Chimichanga: "3-5 players: Add a Villain Group"
 *     → extraVillains: 1, extraVillainsMinPlayers: 3
 *   - Crush Them With My Bare Hands: "If playing solo, add an extra Villain Group"
 *     → extraVillains: 1, extraVillainsMaxPlayers: 1
 *   - Negative Zone Prison Breakout (exp 42): "Add 4 extra Bystanders"
 *     → bystandersMod: 4
 *   - Hypnotize Every Human: "No Bystanders in the Villain Deck"
 *     → bystandersOverride: 0
 *
 * Weryfikowane tu:
 *   A. Dane: poprawne overrides w cards.json dla wszystkich 4 schematów.
 *   B. Silnik: warunkowa liczba villain groups (Deadpool: inactive dla 1-2 graczy, active dla 3-5).
 *   C. Silnik: warunkowa liczba villain groups dla solo (Crush Them: active dla 1, inactive dla 2+).
 *   D. Silnik: bystanders z bystandersMod (Negative Zone: base + 4).
 *   E. Silnik: bystanders z bystandersOverride=0 (Hypnotize: zawsze 0).
 *   F. Silnik: schemeExtraVillainMod poprawnie odzwierciedla aktywność modyfikatora.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';
import { PLAYER_SETUP_RULES } from '@/engine/playerSetupRules.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMinimalInput(forcedScheme: Scheme, playerCount = 2) {
  const mastermind = db.masterminds[0];
  const heroes = db.heroes.slice(0, 6);
  const villains = db.villains.slice(0, 12);
  const henchmen = db.henchmen.slice(0, 2);
  return {
    heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds.slice(0, 3),
    schemes: [forcedScheme],
    villains,
    henchmen,
    totalMatches: 0,
    playerCount,
    alpha: 0.5,
    mode: 'smart' as const,
    forcedMastermind: mastermind,
    forcedScheme,
  };
}

const deadpool = db.schemes.find(s => s.name === 'Deadpool Wants a Chimichanga')!;
const crushThem = db.schemes.find(s => s.name === 'Crush Them With My Bare Hands')!;
const negativeZone42 = db.schemes.find(s => s.id === 'negative-zone-prison-breakout-42-192')!;
const hypnotize = db.schemes.find(s => s.name === 'Hypnotize Every Human')!;

// ---------------------------------------------------------------------------
// A. Testy danych — cards.json
// ---------------------------------------------------------------------------
describe('Conditional Villain Groups & Bystanders — dane (overrides)', () => {
  it('Deadpool Wants a Chimichanga ma extraVillains=1 i extraVillainsMinPlayers=3', () => {
    expect(deadpool).toBeDefined();
    expect(deadpool.overrides.extraVillains).toBe(1);
    expect(deadpool.overrides.extraVillainsMinPlayers).toBe(3);
    expect(deadpool.overrides.extraVillainsMaxPlayers).toBeUndefined();
  });

  it('Crush Them With My Bare Hands ma extraVillains=1 i extraVillainsMaxPlayers=1', () => {
    expect(crushThem).toBeDefined();
    expect(crushThem.overrides.extraVillains).toBe(1);
    expect(crushThem.overrides.extraVillainsMaxPlayers).toBe(1);
    expect(crushThem.overrides.extraVillainsMinPlayers).toBeUndefined();
  });

  it('Negative Zone Prison Breakout (exp 42) ma bystandersMod=4', () => {
    expect(negativeZone42).toBeDefined();
    expect(negativeZone42.overrides.bystandersMod).toBe(4);
    expect(negativeZone42.overrides.bystandersOverride).toBeUndefined();
  });

  it('Hypnotize Every Human ma bystandersOverride=0', () => {
    expect(hypnotize).toBeDefined();
    expect(hypnotize.overrides.bystandersOverride).toBe(0);
    expect(hypnotize.overrides.bystandersMod).toBeUndefined();
  });

  it('Negative Zone Prison Breakout (exp 1, original) NIE ma bystandersMod ani bystandersOverride', () => {
    const nzOriginal = db.schemes.find(s => s.id === 'negative-zone-prison-breakout-1-4')!;
    expect(nzOriginal.overrides.bystandersMod).toBeUndefined();
    expect(nzOriginal.overrides.bystandersOverride).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// B. Deadpool Wants a Chimichanga — minPlayers=3
// ---------------------------------------------------------------------------
describe('generateSetup() — Deadpool Wants a Chimichanga (extraVillainsMinPlayers=3)', () => {
  it('1 gracz (solo) → brak dodatkowej villain group (warunek nie spełniony)', () => {
    const setup = generateSetup(makeMinimalInput(deadpool, 1));
    // 1 gracz → base villainCount=1, minPlayers=3 → condition false → 1 total
    expect(setup.villains).toHaveLength(1);
    expect(setup.schemeExtraVillainMod).toBe(0);
  });

  it('2 graczy → brak dodatkowej villain group (warunek nie spełniony)', () => {
    const setup = generateSetup(makeMinimalInput(deadpool, 2));
    // 2 graczy → base=2, minPlayers=3 → condition false → 2 total
    expect(setup.villains).toHaveLength(2);
    expect(setup.schemeExtraVillainMod).toBe(0);
  });

  it('3 graczy → +1 villain group (warunek spełniony)', () => {
    const setup = generateSetup(makeMinimalInput(deadpool, 3));
    // 3 graczy → base=3, +1 → 4 total
    expect(setup.villains).toHaveLength(4);
    expect(setup.schemeExtraVillainMod).toBe(1);
  });

  it('4 graczy → +1 villain group (warunek spełniony)', () => {
    const setup = generateSetup(makeMinimalInput(deadpool, 4));
    // 4 graczy → base=4, +1 → 5 total
    expect(setup.villains).toHaveLength(5);
    expect(setup.schemeExtraVillainMod).toBe(1);
  });

  it('5 graczy → +1 villain group (warunek spełniony)', () => {
    const setup = generateSetup(makeMinimalInput(deadpool, 5));
    // 5 graczy → base=5, +1 → 6 total
    expect(setup.villains).toHaveLength(6);
    expect(setup.schemeExtraVillainMod).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// C. Crush Them With My Bare Hands — maxPlayers=1 (solo only)
// ---------------------------------------------------------------------------
describe('generateSetup() — Crush Them With My Bare Hands (extraVillainsMaxPlayers=1)', () => {
  it('1 gracz (solo) → +1 villain group (warunek spełniony)', () => {
    const setup = generateSetup(makeMinimalInput(crushThem, 1));
    // solo → base=1, +1 → 2 total
    expect(setup.villains).toHaveLength(2);
    expect(setup.schemeExtraVillainMod).toBe(1);
  });

  it('2 graczy → brak dodatkowej villain group (maxPlayers=1)', () => {
    const setup = generateSetup(makeMinimalInput(crushThem, 2));
    // 2 graczy → base=2, maxPlayers=1 → condition false → 2 total
    expect(setup.villains).toHaveLength(2);
    expect(setup.schemeExtraVillainMod).toBe(0);
  });

  it('3 graczy → brak dodatkowej villain group (maxPlayers=1)', () => {
    const setup = generateSetup(makeMinimalInput(crushThem, 3));
    expect(setup.villains).toHaveLength(3);
    expect(setup.schemeExtraVillainMod).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// D. Negative Zone Prison Breakout (exp 42) — bystandersMod=4
// ---------------------------------------------------------------------------
describe('generateSetup() — Negative Zone Prison Breakout exp42 (bystandersMod=4)', () => {
  it.each([1, 2, 3, 4, 5])('%i graczy → bystanders = base + 4', (playerCount) => {
    const base = PLAYER_SETUP_RULES[playerCount].bystanders;
    const setup = generateSetup(makeMinimalInput(negativeZone42, playerCount));
    expect(setup.bystanders).toBe(base + 4);
  });
});

// ---------------------------------------------------------------------------
// E. Hypnotize Every Human — bystandersOverride=0
// ---------------------------------------------------------------------------
describe('generateSetup() — Hypnotize Every Human (bystandersOverride=0)', () => {
  it.each([1, 2, 3, 4, 5])('%i graczy → bystanders = 0 (override)', (playerCount) => {
    const setup = generateSetup(makeMinimalInput(hypnotize, playerCount));
    expect(setup.bystanders).toBe(0);
  });
});

