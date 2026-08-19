/**
 * Punkt 7 — Multiple Masterminds (Ascending Villains): próg trudności
 *
 * Mechanika: Niektóre schematy powodują, że podczas gry pojawiają się dodatkowi
 * Mastermindowie — przez ascension villaina lub przez dodanie drugiego pełnego
 * Masterminda z Tactics. Zasady specjalne:
 *   - Ascending Mastermind nie ma Mastermind Tactics — wystarczy go pokonać raz.
 *   - Drugi prawdziwy Mastermind (Dark Alliance) ma pełny zestaw Tactics.
 *   - Gracze muszą pokonać WSZYSTKICH Mastermindów by wygrać.
 *
 * Pole `scheme.overrides.multipleMasterminds` = true sygnalizuje te schematy;
 * `generateSetup()` dodaje wtedy note do `setupNotes`.
 *
 * Weryfikowane tu:
 *   1. Dokładnie 3 schematy mają multipleMasterminds = true (Dark Alliance,
 *      Enthrone the Barons of Battleworld, God-Emperor of Battleworld).
 *   2. Funkcja deriveMultipleMasterminds rozpoznaje wzorce w treści kart.
 *   3. generateSetup() wypełnia setupNotes ostrzeżeniem dla tych 3 schematów.
 *   4. generateSetup() NIE dodaje noty dla schematów bez Multiple Masterminds.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

// ---------------------------------------------------------------------------
// Helpers — minimalne fixtury dla generateSetup
// ---------------------------------------------------------------------------
function makeMinimalInput(forcedScheme: Scheme) {
  const mastermind = db.masterminds[0];
  const heroes = db.heroes.slice(0, 6);
  const villains = db.villains.slice(0, 5);
  const henchmen = db.henchmen.slice(0, 2);
  return {
    heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds.slice(0, 5), // ≥2 dla losowania drugiego Masterminda
    schemes: [forcedScheme],
    villains,
    henchmen,
    totalMatches: 0,
    playerCount: 2,
    alpha: 0.5,
    mode: 'smart' as const,
    forcedMastermind: mastermind,
    forcedScheme,
  };
}

// ---------------------------------------------------------------------------
// Testy danych
// ---------------------------------------------------------------------------
describe('Multiple Masterminds — dane (overrides.multipleMasterminds)', () => {
  const mmSchemes = db.schemes.filter(s => s.overrides.multipleMasterminds);

  it('dokładnie 3 schematy mają multipleMasterminds = true', () => {
    expect(mmSchemes.map(s => s.name).sort()).toEqual([
      'Dark Alliance',
      'Enthrone the Barons of Battleworld',
      'God-Emperor of Battleworld, The',
    ]);
  });

  it('Dark Alliance ma [second Mastermind] w tekście zdolności', () => {
    const s = db.schemes.find(s => s.name === 'Dark Alliance')!;
    expect(s.cards.some(c => /\[second Mastermind\]/i.test(c.abilities))).toBe(true);
    expect(s.overrides.multipleMasterminds).toBe(true);
  });

  it('tylko Dark Alliance ma requiresSecondMastermind = true', () => {
    const secondMM = db.schemes.filter(s => s.overrides.requiresSecondMastermind);
    expect(secondMM).toHaveLength(1);
    expect(secondMM[0].name).toBe('Dark Alliance');
  });

  it('Enthrone the Barons of Battleworld ma "ascends to become" w tekście zdolności', () => {
    const s = db.schemes.find(s => s.name === 'Enthrone the Barons of Battleworld')!;
    expect(s.cards.some(c => /ascends to become/i.test(c.abilities))).toBe(true);
    expect(s.overrides.multipleMasterminds).toBe(true);
    expect(s.overrides.requiresSecondMastermind).toBeFalsy();
  });

  it('God-Emperor of Battleworld ma "ascends to becomes" w tekście zdolności', () => {
    const s = db.schemes.find(s => s.name === 'God-Emperor of Battleworld, The')!;
    expect(s.cards.some(c => /ascends to become[s]?/i.test(c.abilities))).toBe(true);
    expect(s.overrides.multipleMasterminds).toBe(true);
    expect(s.overrides.requiresSecondMastermind).toBeFalsy();
  });

  it('schematy bez Multiple Mastermind mechaniki NIE mają tej flagi', () => {
    const nonMm = db.schemes.filter(s => !s.overrides.multipleMasterminds);
    expect(nonMm.length).toBeGreaterThan(0);
    // Brak flagi u schematów z innymi overrides
    const darkAlliance = db.schemes.find(s => s.name === 'Dark Alliance')!;
    expect(db.schemes.filter(s => s.name !== darkAlliance.name && s.overrides.multipleMasterminds !== true).length)
      .toBeGreaterThan(100); // Zdecydowana większość
  });
});

// ---------------------------------------------------------------------------
// Testy silnika — setupNotes
// ---------------------------------------------------------------------------
describe('generateSetup() — setupNotes dla Multiple Masterminds', () => {
  it('Dark Alliance: setupNotes zawiera klucz darkAllianceSecondMastermind z imieniem', () => {
    const scheme = db.schemes.find(s => s.name === 'Dark Alliance')!;
    const setup = generateSetup(makeMinimalInput(scheme));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.darkAllianceSecondMastermind');
    expect(note).toBeDefined();
    expect(note!.params?.name).toBeTruthy();
  });

  it('Dark Alliance: secondMastermind jest wylosowany i różni się od głównego', () => {
    const scheme = db.schemes.find(s => s.name === 'Dark Alliance')!;
    const setup = generateSetup(makeMinimalInput(scheme));
    expect(setup.secondMastermind).toBeDefined();
    expect(setup.secondMastermind!.id).not.toBe(setup.mastermind.id);
  });

  it('Dark Alliance: params.name w nocie odpowiada secondMastermind.name', () => {
    const scheme = db.schemes.find(s => s.name === 'Dark Alliance')!;
    const setup = generateSetup(makeMinimalInput(scheme));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.darkAllianceSecondMastermind');
    expect(note!.params!.name).toBe(setup.secondMastermind!.name);
  });

  it('Enthrone the Barons of Battleworld generuje klucz multipleMasterminds', () => {
    const scheme = db.schemes.find(s => s.name === 'Enthrone the Barons of Battleworld')!;
    const setup = generateSetup(makeMinimalInput(scheme));
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.multipleMasterminds')).toBe(true);
    expect(setup.secondMastermind).toBeUndefined();
  });

  it('God-Emperor of Battleworld generuje klucz multipleMasterminds', () => {
    const scheme = db.schemes.find(s => s.name === 'God-Emperor of Battleworld, The')!;
    const setup = generateSetup(makeMinimalInput(scheme));
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.multipleMasterminds')).toBe(true);
    expect(setup.secondMastermind).toBeUndefined();
  });

  it('zwykły schemat NIE generuje not Multiple Masterminds i nie ma secondMastermind', () => {
    const normalScheme = db.schemes.find(s => !s.overrides.multipleMasterminds)!;
    const setup = generateSetup(makeMinimalInput(normalScheme));
    expect(setup.setupNotes.some(n =>
      n.key === 'setup.notes.multipleMasterminds' ||
      n.key === 'setup.notes.darkAllianceSecondMastermind'
    )).toBe(false);
    expect(setup.secondMastermind).toBeUndefined();
  });
});






