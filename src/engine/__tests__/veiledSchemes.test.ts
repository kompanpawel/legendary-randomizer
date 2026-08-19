/**
 * Tests for Veiled/Unveiled scheme mechanics (step 16).
 *
 * Veiled Schemes: 4 schemes in expansion 31 (X-Force) that transform
 * into a random Unveiled Scheme at a specific Twist.
 * Unveiled Schemes: 4 matching "second phase" schemes (same expansion).
 *
 * Engine behavior:
 * - Unveiled Schemes are excluded from the standalone randomizer pool.
 * - When a Veiled Scheme is selected, GameSetup.unveiledScheme contains
 *   a pre-drawn Unveiled Scheme (optional spoiler for the player).
 * - Setup note informs the player about the transformation twist.
 */

import { describe, it, expect } from 'vitest';
import cardsData from '../../assets/cards.json';
import type { CardsDatabase } from '../../types/cards';
import { generateSetup } from '../SmartRandomizerEngine';

const db = cardsData as unknown as CardsDatabase;

const VEILED_IDS = [
  'hack-cerebro-servers-to-31-142',
  'drain-mutant-powers-to-31-144',
  'hire-singularity-investigations-to-31-146',
  'raid-gene-banks-to-31-148',
];

const UNVEILED_IDS = [
  'control-the-mutant-messiah-31-143',
  'open-rifts-to-future-timelines-31-145',
  'reveal-the-heroes-evil-clones-31-147',
  'unleash-an-anti-mutant-bioweapon-31-149',
];

const EXPECTED_TRANSFORM_TWISTS: Record<string, number> = {
  'hack-cerebro-servers-to-31-142': 6,
  'drain-mutant-powers-to-31-144': 7,
  'hire-singularity-investigations-to-31-146': 5,
  'raid-gene-banks-to-31-148': 4,
};

// ── Data verification ────────────────────────────────────────────────────────

describe('Veiled Schemes — data annotations', () => {
  it('should have exactly 4 Veiled Schemes in cards.json', () => {
    const veiled = db.schemes.filter(s => s.overrides.isVeiledScheme);
    expect(veiled).toHaveLength(4);
    expect(veiled.map(s => s.id).sort()).toEqual([...VEILED_IDS].sort());
  });

  it('should have exactly 4 Unveiled Schemes in cards.json', () => {
    const unveiled = db.schemes.filter(s => s.overrides.isUnveiledScheme);
    expect(unveiled).toHaveLength(4);
    expect(unveiled.map(s => s.id).sort()).toEqual([...UNVEILED_IDS].sort());
  });

  it('each Veiled Scheme should have correct veilTransformsTwist', () => {
    for (const [id, twist] of Object.entries(EXPECTED_TRANSFORM_TWISTS)) {
      const scheme = db.schemes.find(s => s.id === id);
      expect(scheme, `scheme ${id} not found`).toBeDefined();
      expect(scheme!.overrides.veilTransformsTwist).toBe(twist);
    }
  });

  it('Veiled Schemes should NOT have isUnveiledScheme flag', () => {
    const veiled = db.schemes.filter(s => s.overrides.isVeiledScheme);
    for (const s of veiled) {
      expect(s.overrides.isUnveiledScheme).toBeFalsy();
    }
  });

  it('Unveiled Schemes should NOT have isVeiledScheme flag', () => {
    const unveiled = db.schemes.filter(s => s.overrides.isUnveiledScheme);
    for (const s of unveiled) {
      expect(s.overrides.isVeiledScheme).toBeFalsy();
    }
  });

  it('Veiled Schemes should all be in expansion 31', () => {
    const veiled = db.schemes.filter(s => s.overrides.isVeiledScheme);
    expect(veiled.every(s => s.expansionId === 31)).toBe(true);
  });

  it('Unveiled Schemes should all be in expansion 31', () => {
    const unveiled = db.schemes.filter(s => s.overrides.isUnveiledScheme);
    expect(unveiled.every(s => s.expansionId === 31)).toBe(true);
  });

  it('Unveiled Scheme names should start with "..."', () => {
    const unveiled = db.schemes.filter(s => s.overrides.isUnveiledScheme);
    for (const s of unveiled) {
      expect(s.name.startsWith('...')).toBe(true);
    }
  });

  it('Veiled Scheme names should NOT start with "..."', () => {
    const veiled = db.schemes.filter(s => s.overrides.isVeiledScheme);
    for (const s of veiled) {
      expect(s.name.startsWith('...')).toBe(false);
    }
  });
});

// ── Engine behavior ──────────────────────────────────────────────────────────

const allMasterminds = db.masterminds;
const allSchemes = db.schemes;
const allVillains = db.villains;
const allHenchmen = db.henchmen;
const allHeroes = db.heroes;

const baseInput = {
  heroes: allHeroes,
  heroStats: [],
  mastermindStats: [],
  schemeStats: [],
  masterminds: allMasterminds,
  schemes: allSchemes,
  villains: allVillains,
  henchmen: allHenchmen,
  totalMatches: 0,
  playerCount: 2,
  alpha: 1.0,
  mode: 'smart' as const,
};

describe('Unveiled Schemes — excluded from auto-randomization pool', () => {
  it('should never randomly select an Unveiled Scheme in 100 iterations', () => {
    for (let i = 0; i < 100; i++) {
      const setup = generateSetup(baseInput);
      expect(setup.scheme.overrides.isUnveiledScheme).toBeFalsy();
    }
  });

  it('should allow forcing an Unveiled Scheme via forcedScheme', () => {
    const unveiledScheme = db.schemes.find(s => s.id === 'control-the-mutant-messiah-31-143')!;
    const setup = generateSetup({ ...baseInput, forcedScheme: unveiledScheme });
    expect(setup.scheme.id).toBe('control-the-mutant-messiah-31-143');
  });
});

describe('Veiled Scheme — GameSetup.unveiledScheme', () => {
  it('should provide unveiledScheme when a Veiled Scheme is forced', () => {
    const veiledScheme = db.schemes.find(s => s.id === 'hack-cerebro-servers-to-31-142')!;
    const setup = generateSetup({ ...baseInput, forcedScheme: veiledScheme });
    expect(setup.scheme.id).toBe('hack-cerebro-servers-to-31-142');
    expect(setup.unveiledScheme).toBeDefined();
    expect(UNVEILED_IDS).toContain(setup.unveiledScheme!.id);
  });

  it('unveiledScheme should be from expansion 31 (same as Veiled Scheme)', () => {
    const veiledScheme = db.schemes.find(s => s.id === 'drain-mutant-powers-to-31-144')!;
    const setup = generateSetup({ ...baseInput, forcedScheme: veiledScheme });
    expect(setup.unveiledScheme?.expansionId).toBe(31);
  });

  it('unveiledScheme should NOT be present for regular (non-veiled) schemes', () => {
    // Use a scheme that is definitely not Veiled
    const regularScheme = db.schemes.find(
      s => !s.overrides.isVeiledScheme && !s.overrides.isUnveiledScheme
    )!;
    const setup = generateSetup({ ...baseInput, forcedScheme: regularScheme });
    expect(setup.unveiledScheme).toBeUndefined();
  });

  it('should produce different unveiledScheme choices over multiple rolls', () => {
    const veiledScheme = db.schemes.find(s => s.id === 'hack-cerebro-servers-to-31-142')!;
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const setup = generateSetup({ ...baseInput, forcedScheme: veiledScheme });
      if (setup.unveiledScheme) ids.add(setup.unveiledScheme.id);
    }
    // Should pick more than 1 different Unveiled Scheme over 50 runs
    expect(ids.size).toBeGreaterThan(1);
  });

  it('all 4 Veiled Schemes should provide an unveiledScheme', () => {
    for (const id of VEILED_IDS) {
      const veiledScheme = db.schemes.find(s => s.id === id)!;
      const setup = generateSetup({ ...baseInput, forcedScheme: veiledScheme });
      expect(setup.unveiledScheme).toBeDefined();
      expect(setup.unveiledScheme!.overrides.isUnveiledScheme).toBe(true);
    }
  });
});

describe('Veiled Scheme — setup notes', () => {
  it('should include a veiledScheme setup note when Veiled Scheme is selected', () => {
    const veiledScheme = db.schemes.find(s => s.id === 'hack-cerebro-servers-to-31-142')!;
    const setup = generateSetup({ ...baseInput, forcedScheme: veiledScheme });
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.veiledScheme');
    expect(note).toBeDefined();
    expect(note!.params?.twist).toBe('6');
  });

  it('veiledScheme note should contain the correct twist for each Veiled Scheme', () => {
    for (const [id, twist] of Object.entries(EXPECTED_TRANSFORM_TWISTS)) {
      const veiledScheme = db.schemes.find(s => s.id === id)!;
      const setup = generateSetup({ ...baseInput, forcedScheme: veiledScheme });
      const note = setup.setupNotes.find(n => n.key === 'setup.notes.veiledScheme');
      expect(note?.params?.twist).toBe(String(twist));
    }
  });

  it('should NOT include veiledScheme note for regular schemes', () => {
    const regularScheme = db.schemes.find(
      s => !s.overrides.isVeiledScheme && !s.overrides.isUnveiledScheme
    )!;
    const setup = generateSetup({ ...baseInput, forcedScheme: regularScheme });
    const note = setup.setupNotes.find(n => n.key === 'setup.notes.veiledScheme');
    expect(note).toBeUndefined();
  });
});

// ── No false positives ────────────────────────────────────────────────────────

describe('No false positives', () => {
  it('regular schemes should not have isVeiledScheme or isUnveiledScheme flags', () => {
    const regular = db.schemes.filter(
      s => !VEILED_IDS.includes(s.id) && !UNVEILED_IDS.includes(s.id)
    );
    for (const s of regular) {
      expect(s.overrides.isVeiledScheme).toBeFalsy();
      expect(s.overrides.isUnveiledScheme).toBeFalsy();
    }
  });

  it('regular schemes should not have veilTransformsTwist', () => {
    const regular = db.schemes.filter(s => !s.overrides.isVeiledScheme);
    for (const s of regular) {
      expect(s.overrides.veilTransformsTwist).toBeUndefined();
    }
  });
});

