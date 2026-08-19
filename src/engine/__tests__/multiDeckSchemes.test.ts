/**
 * Punkt 13 — Schematy zakładające wiele równoległych talii Villain (multi-deck)
 *
 * Dotyczy 4 schematów:
 *   - Breach the Nexus of All Realities: "1-2 players: Use 3 Villain Groups"
 *     → isMultiDeck=true, minVillainCount=3
 *   - Five Families of Crime: "Split the Villain Deck into 5 shuffled decks"
 *     → isMultiDeck=true, extraVillains=2 (już z kroku 9)
 *   - Fragmented Realities: "split it into a Villain Deck for each player"
 *     → isMultiDeck=true, extraVillains=1 (już z kroku 9)
 *   - Smash Two Dimensions Together: "Add an extra Villain Group"
 *     → isMultiDeck=true, extraVillains=1 (już z kroku 9)
 *
 * Weryfikowane tu:
 *   A. Dane: wszystkie 4 schematy mają isMultiDeck=true.
 *   B. Dane: Breach the Nexus ma minVillainCount=3 i brak extraVillains.
 *   C. Silnik: Breach the Nexus przy 1 graczu → ≥3 villain groups (minVillainCount).
 *   D. Silnik: Breach the Nexus przy 2 graczach → ≥3 villain groups.
 *   E. Silnik: Breach the Nexus przy 3+ graczach → standard (≥3 bo standard ≥3).
 *   F. Silnik: setupNotes zawiera klucz 'setup.notes.multiDeck' dla tych schematów.
 *   G. Inne schematy bez isMultiDeck nie dostają setup note multiDeck.
 *   H. Dane: dokładnie 4 schematy mają isMultiDeck=true w bazie.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';
import { PLAYER_SETUP_RULES } from '@/engine/playerSetupRules.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

const breachNexus      = db.schemes.find(s => s.name === 'Breach the Nexus of All Realities')!;
const fiveFamilies     = db.schemes.find(s => s.name === 'Five Families of Crime')!;
const fragmentedReal   = db.schemes.find(s => s.name === 'Fragmented Realities')!;
const smashDimensions  = db.schemes.find(s => s.name === 'Smash Two Dimensions Together')!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMinimalInput(forcedScheme: Scheme, playerCount = 2) {
  return {
    heroes: db.heroes.slice(0, 6),
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds.slice(0, 3),
    schemes: [forcedScheme],
    villains: db.villains.slice(0, 12),
    henchmen: db.henchmen.slice(0, 2),
    totalMatches: 0,
    playerCount,
    alpha: 0.5,
    mode: 'smart' as const,
    forcedMastermind: db.masterminds[0],
    forcedScheme,
  };
}

// ---------------------------------------------------------------------------
// A. Dane: wszystkie 4 schematy mają isMultiDeck=true
// ---------------------------------------------------------------------------
describe('Multi-Deck schematy — dane: isMultiDeck=true', () => {
  it.each([
    ['Breach the Nexus of All Realities', breachNexus],
    ['Five Families of Crime', fiveFamilies],
    ['Fragmented Realities', fragmentedReal],
    ['Smash Two Dimensions Together', smashDimensions],
  ] as [string, Scheme][])('%s ma isMultiDeck=true', (_name, scheme) => {
    expect(scheme).toBeDefined();
    expect(scheme.overrides.isMultiDeck).toBe(true);
  });

  it('dokładnie 4 schematy mają isMultiDeck=true w bazie', () => {
    const multiDeckSchemes = db.schemes.filter(s => s.overrides.isMultiDeck === true);
    expect(multiDeckSchemes).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// B. Dane: Breach the Nexus — minVillainCount=3
// ---------------------------------------------------------------------------
describe('Breach the Nexus of All Realities — dane: minVillainCount', () => {
  it('ma minVillainCount=3', () => {
    expect(breachNexus.overrides.minVillainCount).toBe(3);
  });

  it('NIE ma extraVillains (używa minVillainCount zamiast adytywnego +N)', () => {
    expect(breachNexus.overrides.extraVillains).toBeFalsy();
  });

  it('pozostałe 3 multi-deck schematy NIE mają minVillainCount', () => {
    for (const s of [fiveFamilies, fragmentedReal, smashDimensions]) {
      expect(s.overrides.minVillainCount).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// C/D/E. Silnik: minVillainCount gwarantuje ≥3 grup dla Breach the Nexus
// ---------------------------------------------------------------------------
describe('generateSetup() — Breach the Nexus: minVillainCount zapewnia ≥3 villain groups', () => {
  it('1 gracz (solo) → 3 villain groups (minVillainCount=3 > standard=1)', () => {
    const setup = generateSetup(makeMinimalInput(breachNexus, 1));
    expect(setup.villains.length).toBeGreaterThanOrEqual(3);
  });

  it('2 graczy → 3 villain groups (minVillainCount=3 > standard=2)', () => {
    const setup = generateSetup(makeMinimalInput(breachNexus, 2));
    expect(setup.villains.length).toBeGreaterThanOrEqual(3);
  });

  it('3 graczy → ≥3 villain groups (standard=3 = minVillainCount)', () => {
    const setup = generateSetup(makeMinimalInput(breachNexus, 3));
    expect(setup.villains.length).toBeGreaterThanOrEqual(3);
  });

  it('4 graczy → ≥4 villain groups (standard=4 > minVillainCount=3)', () => {
    const setup = generateSetup(makeMinimalInput(breachNexus, 4));
    expect(setup.villains.length).toBeGreaterThanOrEqual(4);
  });

  it('5 graczy → ≥5 villain groups (standard=5 > minVillainCount=3)', () => {
    const setup = generateSetup(makeMinimalInput(breachNexus, 5));
    expect(setup.villains.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// F. Silnik: setupNotes zawiera multiDeck dla tych schematów
// ---------------------------------------------------------------------------
describe('generateSetup() — multi-deck schematy: setupNotes', () => {
  it.each([
    ['Breach the Nexus of All Realities', breachNexus],
    ['Five Families of Crime', fiveFamilies],
    ['Fragmented Realities', fragmentedReal],
    ['Smash Two Dimensions Together', smashDimensions],
  ] as [string, Scheme][])('%s → setupNotes zawiera klucz multiDeck', (_name, scheme) => {
    const setup = generateSetup(makeMinimalInput(scheme, 2));
    const hasNote = setup.setupNotes.some(n => n.key === 'setup.notes.multiDeck');
    expect(hasNote).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// G. Inne schematy NIE dostają setup note multiDeck
// ---------------------------------------------------------------------------
describe('generateSetup() — inne schematy: brak multiDeck setupNote', () => {
  it('schemat bez isMultiDeck nie dostaje setup note multiDeck', () => {
    const normalScheme = db.schemes.find(s => !s.overrides.isMultiDeck)!;
    const setup = generateSetup(makeMinimalInput(normalScheme, 2));
    const hasNote = setup.setupNotes.some(n => n.key === 'setup.notes.multiDeck');
    expect(hasNote).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dodatkowy test: porównanie z base (bez minVillainCount)
// ---------------------------------------------------------------------------
describe('generateSetup() — minVillainCount vs standard villain count', () => {
  it('schemat BEZ minVillainCount przy 1 graczu → 1 villain group (standard)', () => {
    const normalScheme = db.schemes.find(
      s => !s.overrides.extraVillains && !s.overrides.minVillainCount
    )!;
    const base = PLAYER_SETUP_RULES[1].villainCount;
    const setup = generateSetup(makeMinimalInput(normalScheme, 1));
    expect(setup.villains.length).toBeGreaterThanOrEqual(base);
  });

  it('Breach the Nexus przy 1 graczu daje więcej villainów niż schemat bez minVillainCount', () => {
    const normalScheme = db.schemes.find(
      s => !s.overrides.extraVillains && !s.overrides.minVillainCount
    )!;
    const normalSetup = generateSetup(makeMinimalInput(normalScheme, 1));
    const breachSetup = generateSetup(makeMinimalInput(breachNexus, 1));
    expect(breachSetup.villains.length).toBeGreaterThan(normalSetup.villains.length);
  });
});

