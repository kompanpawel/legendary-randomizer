/**
 * Tests for extra henchman groups (step 17).
 *
 * Categories of schemes handled:
 * A) Generic extra henchman from pool (extraHenchmen: 1):
 *    - Negative Zone Prison Breakout (exp 1)
 *    - Asgard Under Siege
 *    - Invasion of the Venom Symbiotes
 *    - Invade the Daily Bugle News HQ
 *
 * B) Required specific henchman (requiredHenchmanGroups, within normal count):
 *    - Organized Crime Wave (Maggia Goons)
 *
 * C) Required specific henchman + extra slot:
 *    - Mutant-Hunting Super Sentinels (Sentinel, extraHenchmen: 1)
 *
 * D) Scheme-specific custom henchman (specialSetup note only, no pool change):
 *    - Sire Vampires at the Blood Bank
 *    - Devolve with Xerogen Crystals
 *    - Scavenge Alien Weaponry
 *
 * E) Special complex henchman rule (specialSetup note only):
 *    - Star-Lord's Awesome Mix Tape
 */

import { describe, it, expect } from 'vitest';
import cardsData from '../../assets/cards.json';
import type { CardsDatabase } from '../../types/cards';
import { generateSetup } from '../SmartRandomizerEngine';
import { getSetupRules } from '../playerSetupRules';

const db = cardsData as unknown as CardsDatabase;

const EXTRA_HENCHMEN_IDS = [
  'negative-zone-prison-breakout-1-4',
  'asgard-under-siege-20-100',
  'invasion-of-the-venom-symbiotes-22-110',
  'invade-the-daily-bugle-news-hq-5-22',
  'mutant-hunting-super-sentinels-16-80', // extraHenchmen: 1 + requiredHenchmanGroups
];

const REQ_HENCHMAN_IDS: Record<string, string[]> = {
  'organized-crime-wave-3-12': ['Maggia Goons'],
  'mutant-hunting-super-sentinels-16-80': ['Sentinel'],
};

const CUSTOM_HENCHMAN_IDS = [
  'sire-vampires-at-the-blood-bank-37-170',
  'devolve-with-xerogen-crystals-29-137',
  'scavenge-alien-weaponry-17-87',
];

// ── Data verification ────────────────────────────────────────────────────────

describe('Extra henchmen schemes — data annotations', () => {
  it('all Type A/C schemes should have extraHenchmen: 1', () => {
    for (const id of EXTRA_HENCHMEN_IDS) {
      const scheme = db.schemes.find(s => s.id === id);
      expect(scheme, `scheme ${id} not found`).toBeDefined();
      expect(scheme!.overrides.extraHenchmen).toBe(1);
    }
  });

  it('Organized Crime Wave should have requiredHenchmanGroups: ["Maggia Goons"]', () => {
    const scheme = db.schemes.find(s => s.id === 'organized-crime-wave-3-12')!;
    expect(scheme.overrides.requiredHenchmanGroups).toEqual(['Maggia Goons']);
    expect(scheme.overrides.extraHenchmen).toBeUndefined(); // normal slot, not extra
  });

  it('Mutant-Hunting Super Sentinels should have both extraHenchmen and requiredHenchmanGroups', () => {
    const scheme = db.schemes.find(s => s.id === 'mutant-hunting-super-sentinels-16-80')!;
    expect(scheme.overrides.extraHenchmen).toBe(1);
    expect(scheme.overrides.requiredHenchmanGroups).toEqual(['Sentinel']);
  });

  it('Type B schemes should have specialSetup (scheme-specific henchman note)', () => {
    for (const id of CUSTOM_HENCHMAN_IDS) {
      const scheme = db.schemes.find(s => s.id === id);
      expect(scheme, `scheme ${id} not found`).toBeDefined();
      expect(scheme!.overrides.specialSetup).toBeTruthy();
      expect(scheme!.overrides.extraHenchmen).toBeUndefined(); // not from pool
    }
  });

  it('Star-Lord Awesome Mix Tape should have specialSetup note', () => {
    const scheme = db.schemes.find(s => s.id === 'star-lord-s-awesome-mix-tape-33-156')!;
    expect(scheme.overrides.specialSetup).toBeTruthy();
    expect(scheme.overrides.specialSetup).toContain('double');
  });

  it('Invade the Daily Bugle should have extraHenchmen AND specialSetup', () => {
    const scheme = db.schemes.find(s => s.id === 'invade-the-daily-bugle-news-hq-5-22')!;
    expect(scheme.overrides.extraHenchmen).toBe(1);
    expect(scheme.overrides.specialSetup).toBeTruthy();
    expect(scheme.overrides.specialSetup).toContain('Hero Deck');
  });
});

// ── Engine behavior ──────────────────────────────────────────────────────────

const allMasterminds = db.masterminds;
const allSchemes = db.schemes;
const allVillains = db.villains;
const allHenchmen = db.henchmen;
const allHeroes = db.heroes;

const makeInput = (playerCount: number, forcedScheme?: (typeof allSchemes)[0]) => ({
  heroes: allHeroes,
  heroStats: [],
  mastermindStats: [],
  schemeStats: [],
  masterminds: allMasterminds,
  schemes: allSchemes,
  villains: allVillains,
  henchmen: allHenchmen,
  totalMatches: 0,
  playerCount,
  alpha: 1.0,
  mode: 'smart' as const,
  forcedScheme,
});

describe('extraHenchmen engine — correct henchman count', () => {
  for (const playerCount of [1, 2, 3, 4, 5]) {
    it(`Negative Zone Prison Breakout (exp 1): henchmen = standard+1 for ${playerCount} player(s)`, () => {
      const scheme = db.schemes.find(s => s.id === 'negative-zone-prison-breakout-1-4')!;
      const setup = generateSetup(makeInput(playerCount, scheme));
      const standard = getSetupRules(playerCount).henchmanCount;
      expect(setup.henchmen).toHaveLength(standard + 1);
    });
  }

  it('Asgard Under Siege: henchmen = standard+1', () => {
    const scheme = db.schemes.find(s => s.id === 'asgard-under-siege-20-100')!;
    const setup = generateSetup(makeInput(2, scheme));
    expect(setup.henchmen).toHaveLength(getSetupRules(2).henchmanCount + 1);
  });

  it('Invasion of the Venom Symbiotes: henchmen = standard+1', () => {
    const scheme = db.schemes.find(s => s.id === 'invasion-of-the-venom-symbiotes-22-110')!;
    const setup = generateSetup(makeInput(2, scheme));
    expect(setup.henchmen).toHaveLength(getSetupRules(2).henchmanCount + 1);
  });

  it('Invade the Daily Bugle: henchmen = standard+1', () => {
    const scheme = db.schemes.find(s => s.id === 'invade-the-daily-bugle-news-hq-5-22')!;
    const setup = generateSetup(makeInput(2, scheme));
    expect(setup.henchmen).toHaveLength(getSetupRules(2).henchmanCount + 1);
  });

  it('Mutant-Hunting Super Sentinels: henchmen = standard+1, contains Sentinel', () => {
    const scheme = db.schemes.find(s => s.id === 'mutant-hunting-super-sentinels-16-80')!;
    const setup = generateSetup(makeInput(2, scheme));
    expect(setup.henchmen).toHaveLength(getSetupRules(2).henchmanCount + 1);
    const hasSentinel = setup.henchmen.some(h => h.name.toLowerCase().includes('sentinel'));
    expect(hasSentinel).toBe(true);
  });
});

describe('requiredHenchmanGroups — correct specific henchman included', () => {
  it('Organized Crime Wave: henchmen count = standard (not extra), contains Maggia Goons', () => {
    const scheme = db.schemes.find(s => s.id === 'organized-crime-wave-3-12')!;
    const setup = generateSetup(makeInput(2, scheme));
    expect(setup.henchmen).toHaveLength(getSetupRules(2).henchmanCount);
    const hasMaggia = setup.henchmen.some(h => h.name.toLowerCase().includes('maggia'));
    expect(hasMaggia).toBe(true);
  });
});

describe('setup notes — extraHenchmen note present', () => {
  it('Negative Zone Prison Breakout (exp 1): setup note about extra henchmen', () => {
    const scheme = db.schemes.find(s => s.id === 'negative-zone-prison-breakout-1-4')!;
    const setup = generateSetup(makeInput(2, scheme));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.schemeExtraHenchmen');
    expect(note).toBeDefined();
    expect(note!.params?.count).toBe('1');
  });

  it('regular scheme (no extra henchmen): no extra henchmen note', () => {
    const regular = db.schemes.find(
      s => !s.overrides.extraHenchmen && !s.overrides.requiredHenchmanGroups
    )!;
    const setup = generateSetup(makeInput(2, regular));
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.schemeExtraHenchmen');
    expect(note).toBeUndefined();
  });
});

// ── No false positives ────────────────────────────────────────────────────────

describe('No false positives', () => {
  it('schemes without extra henchmen should not have extraHenchmen flag', () => {
    const ids = new Set([...EXTRA_HENCHMEN_IDS, ...Object.keys(REQ_HENCHMAN_IDS), ...CUSTOM_HENCHMAN_IDS, 'star-lord-s-awesome-mix-tape-33-156']);
    const regular = db.schemes.filter(s => !ids.has(s.id));
    for (const s of regular) {
      expect(s.overrides.extraHenchmen).toBeUndefined();
    }
  });
});

