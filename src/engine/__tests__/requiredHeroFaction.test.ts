/**
 * Punkt 14 — Wymóg konkretnego keywordu/frakcji Hero z poziomu Schematu
 *
 * Dwa schematy wymagają obecności co najmniej 1 bohatera konkretnej frakcji:
 *   - Everybody Hates Deadpool: "Use at least 1[Mercs for Money] Hero"
 *     → requiredHeroFaction: "Mercs for Money"
 *   - Distract the Hero: "Use at least 1[Spider Friends] Hero"
 *     → requiredHeroFaction: "Spider Friends"
 *
 * Silnik pre-selekcjonuje 1 losowego bohatera z wymaganej frakcji przed trybem losowania
 * (analogicznie do requiredHeroes z kroku 10).
 *
 * Weryfikowane tu:
 *   A. Dane: oba schematy mają requiredHeroFaction w overrides.
 *   B. Dane: dokładnie 2 schematy mają requiredHeroFaction w bazie.
 *   C. Silnik: selectedHeroes zawiera co najmniej 1 bohatera z wymaganej frakcji.
 *   D. Silnik: łączna liczba bohaterów = heroCount (pre-selected liczy się w limicie).
 *   E. Silnik: setupNotes zawiera klucz schemeRequiredHeroFaction gdy frakcja znaleziona.
 *   F. Silnik: setupNote zawiera nazwę pre-wybranego bohatera.
 *   G. Silnik: gdy żaden bohater frakcji nie jest dostępny → nota schemeRequiredHeroFactionMissing.
 *   H. Inne schematy bez requiredHeroFaction nie mają tej setup note.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Hero, Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';
import { PLAYER_SETUP_RULES } from '@/engine/playerSetupRules.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

const everybodyHatesDeadpool = db.schemes.find(s => s.name === 'Everybody Hates Deadpool')!;
const distractTheHero        = db.schemes.find(s => s.name === 'Distract the Hero')!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeInput(forcedScheme: Scheme, playerCount = 2, heroOverride?: Hero[]) {
  return {
    heroes: heroOverride ?? db.heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds.slice(0, 3),
    schemes: [forcedScheme],
    villains: db.villains.slice(0, 6),
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
// A. Dane — requiredHeroFaction w overrides
// ---------------------------------------------------------------------------
describe('Required Hero Faction — dane (overrides)', () => {
  it('Everybody Hates Deadpool ma requiredHeroFaction = "Mercs for Money"', () => {
    expect(everybodyHatesDeadpool).toBeDefined();
    expect(everybodyHatesDeadpool.overrides.requiredHeroFaction).toBe('Mercs for Money');
  });

  it('Distract the Hero ma requiredHeroFaction = "Spider Friends"', () => {
    expect(distractTheHero).toBeDefined();
    expect(distractTheHero.overrides.requiredHeroFaction).toBe('Spider Friends');
  });

  it('B. dokładnie 2 schematy mają requiredHeroFaction w bazie', () => {
    const schemes = db.schemes.filter(s => s.overrides.requiredHeroFaction != null);
    expect(schemes).toHaveLength(2);
    const names = schemes.map(s => s.name).sort();
    expect(names).toContain('Everybody Hates Deadpool');
    expect(names).toContain('Distract the Hero');
  });
});

// ---------------------------------------------------------------------------
// C. Silnik: selectedHeroes zawiera ≥1 bohatera z wymaganej frakcji
// ---------------------------------------------------------------------------
describe('generateSetup() — Everybody Hates Deadpool: [Mercs for Money] hero', () => {
  it('selectedHeroes zawiera ≥1 bohatera faction=Mercs for Money', () => {
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2));
    const hasRequired = setup.heroes.some(h => h.faction === 'Mercs for Money');
    expect(hasRequired).toBe(true);
  });

  it('D. łączna liczba bohaterów = heroCount dla 2 graczy', () => {
    const expected = PLAYER_SETUP_RULES[2].heroCount;
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2));
    expect(setup.heroes).toHaveLength(expected);
  });
});

describe('generateSetup() — Distract the Hero: [Spider Friends] hero', () => {
  it('selectedHeroes zawiera ≥1 bohatera faction=Spider Friends', () => {
    const setup = generateSetup(makeInput(distractTheHero, 2));
    const hasRequired = setup.heroes.some(h => h.faction === 'Spider Friends');
    expect(hasRequired).toBe(true);
  });

  it('D. łączna liczba bohaterów = heroCount dla 3 graczy', () => {
    const expected = PLAYER_SETUP_RULES[3].heroCount;
    const setup = generateSetup(makeInput(distractTheHero, 3));
    expect(setup.heroes).toHaveLength(expected);
  });
});

// ---------------------------------------------------------------------------
// E/F. Silnik: setupNotes dla wymaganej frakcji
// ---------------------------------------------------------------------------
describe('generateSetup() — setupNotes dla requiredHeroFaction', () => {
  it('E. setupNotes zawiera klucz schemeRequiredHeroFaction', () => {
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.schemeRequiredHeroFaction');
    expect(note).toBeDefined();
  });

  it('F. setupNote.params.faction = "Mercs for Money"', () => {
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.schemeRequiredHeroFaction');
    expect(note?.params?.faction).toBe('Mercs for Money');
  });

  it('F. setupNote.params.hero zawiera imię pre-wybranego bohatera z Mercs for Money', () => {
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.schemeRequiredHeroFaction');
    const mercNames = db.heroes.filter(h => h.faction === 'Mercs for Money').map(h => h.name);
    expect(mercNames).toContain(note?.params?.hero);
  });

  it('Spider Friends: setupNote.params.faction = "Spider Friends"', () => {
    const setup = generateSetup(makeInput(distractTheHero, 2));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.schemeRequiredHeroFaction');
    expect(note?.params?.faction).toBe('Spider Friends');
  });
});

// ---------------------------------------------------------------------------
// G. Brak dostępnych bohaterów frakcji → schemeRequiredHeroFactionMissing
// ---------------------------------------------------------------------------
describe('generateSetup() — brak bohaterów frakcji w aktywnych dodatkach', () => {
  it('G. gdy żaden bohater Mercs for Money nie jest w puli → nota Missing', () => {
    // Podajemy pulę bez żadnego Mercs for Money hero
    const noMercsHeroes = db.heroes.filter(h => h.faction !== 'Mercs for Money');
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2, noMercsHeroes));
    const hasMissingNote = setup.setupNotes.some(
      n => n.key === 'setup.notes.schemeRequiredHeroFactionMissing'
    );
    expect(hasMissingNote).toBe(true);
  });

  it('G. gdy brak Mercs → nie ma schemeRequiredHeroFaction note', () => {
    const noMercsHeroes = db.heroes.filter(h => h.faction !== 'Mercs for Money');
    const setup = generateSetup(makeInput(everybodyHatesDeadpool, 2, noMercsHeroes));
    const hasFoundNote = setup.setupNotes.some(
      n => n.key === 'setup.notes.schemeRequiredHeroFaction'
    );
    expect(hasFoundNote).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// H. Inne schematy nie mają tej setup note
// ---------------------------------------------------------------------------
describe('generateSetup() — inne schematy: brak requiredHeroFaction note', () => {
  it('schemat bez requiredHeroFaction nie generuje tej setup note', () => {
    const normalScheme = db.schemes.find(s => !s.overrides.requiredHeroFaction)!;
    const setup = generateSetup(makeInput(normalScheme, 2));
    const hasNote = setup.setupNotes.some(
      n => n.key === 'setup.notes.schemeRequiredHeroFaction' ||
           n.key === 'setup.notes.schemeRequiredHeroFactionMissing'
    );
    expect(hasNote).toBe(false);
  });
});

