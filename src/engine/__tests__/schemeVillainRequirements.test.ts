/**
 * Punkt 10 — Wymuszona konkretna Villain Group na poziomie Schematu
 *
 * Mechanika: Wiele schematów wymaga obecności konkretnych grup Villain/Henchman
 * lub specyficznych bohaterów. Pole `scheme.overrides.requiredVillainGroups`,
 * `xorVillainGroups`, `requiredVillainKeyword`, `requiredHenchmanGroups` i
 * `requiredHeroes` przechowują te wymagania; `generateSetup()` wymusza ich
 * uwzględnienie w setupie.
 *
 * Weryfikowane tu:
 *   1. Dane w cards.json — 12 schematów poprawnie oznaczonych.
 *   2. resolveSchemeVillainRequirements() — poprawne rozwiązywanie każdego trybu.
 *   3. generateSetup() — required grupy trafiają do selectedVillains/Henchmen/Heroes.
 *   4. XOR — dokładnie jedna z dwóch grup (S.H.I.E.L.D. vs. HYDRA).
 *   5. Keyword — jedna Villain Group z [Rise of The Living Dead] (Marvel Zombies).
 *   6. Kree-Skrull War — dwie wymuszone grupy, villainCount ≥ 2 nawet dla solo.
 *   7. Party Thor jest wymuszany w hero decku (Trash Earth).
 *   8. Brak regresji — schematy bez requiredVillainGroups działają jak dotychczas.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';
import { resolveSchemeVillainRequirements } from '@/engine/utils/resolveSchemeVillainRequirements.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeInput(forcedScheme: Scheme, playerCount = 2) {
  return {
    heroes: db.heroes,
    heroStats: [],
    mastermindStats: [],
    schemeStats: [],
    masterminds: db.masterminds.slice(0, 3),
    schemes: [forcedScheme],
    villains: db.villains,
    henchmen: db.henchmen,
    totalMatches: 0,
    playerCount,
    alpha: 0.5,
    mode: 'smart' as const,
    forcedMastermind: db.masterminds[0],
    forcedScheme,
  };
}

// ---------------------------------------------------------------------------
// Testy danych
// ---------------------------------------------------------------------------
describe('Scheme Villain Requirements — dane (overrides)', () => {
  it('Secret Invasion of the Skrull Shapeshifters (exp 1) ma requiredVillainGroups: ["Skrulls"]', () => {
    const s = db.schemes.find(x => x.id === 'secret-invasion-of-the-skrull-shapeshifters-1-2')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Skrulls']);
  });

  it('Secret Invasion of the Skrull Shapeshifters (exp 42) ma requiredVillainGroups: ["Skrulls"]', () => {
    const s = db.schemes.find(x => x.id === 'secret-invasion-of-the-skrull-shapeshifters-42-195')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Skrulls']);
  });

  it('Enslave Minds with the Chitauri Scepter ma requiredVillainGroups: ["Chitauri"]', () => {
    const s = db.schemes.find(x => x.id === 'enslave-minds-with-the-chitauri-scepter-20-102')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Chitauri']);
  });

  it('Kree-Skrull War ma requiredVillainGroups z Kree Starforce i Skrulls', () => {
    const s = db.schemes.find(x => x.id === 'kree-skrull-war-the-7-35')!;
    expect(s.overrides.requiredVillainGroups).toContain('Kree Starforce');
    expect(s.overrides.requiredVillainGroups).toContain('Skrulls');
    expect(s.overrides.requiredVillainGroups).toHaveLength(2);
  });

  it('Forge the Infinity Gauntlet ma requiredVillainGroups: ["Infinity Gems"]', () => {
    const s = db.schemes.find(x => x.id === 'forge-the-infinity-gauntlet-7-33')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Infinity Gems']);
  });

  it('The Mark of Khonshu ma requiredHenchmanGroups: ["Khonshu Guardians"]', () => {
    const s = db.schemes.find(x => x.id === 'mark-of-khonshu-the-11-52')!;
    expect(s.overrides.requiredHenchmanGroups).toEqual(['Khonshu Guardians']);
  });

  it('Splice Humans with Spider DNA ma requiredVillainGroups: ["Sinister Six"]', () => {
    const s = db.schemes.find(x => x.id === 'splice-humans-with-spider-dna-5-23')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Sinister Six']);
  });

  it('The Dark Phoenix Saga ma requiredVillainGroups: ["Hellfire Club"]', () => {
    const s = db.schemes.find(x => x.id === 'dark-phoenix-saga-the-16-78')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Hellfire Club']);
  });

  it('The Demon Bear Saga ma requiredVillainGroups: ["Demons of Limbo"]', () => {
    const s = db.schemes.find(x => x.id === 'demon-bear-saga-the-27-126')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Demons of Limbo']);
  });

  it('S.H.I.E.L.D. vs. HYDRA War ma xorVillainGroups z Hydra Elite i A.I.M.', () => {
    const s = db.schemes.find(x => x.id === 's-h-i-e-l-d-vs-hydra-war-25-118')!;
    expect(s.overrides.xorVillainGroups).toContain('Hydra Elite');
    expect(s.overrides.xorVillainGroups).toContain('A.I.M., Hydra Offshoot');
    expect(s.overrides.xorVillainGroups).toHaveLength(2);
  });

  it('Trash Earth with Hugest Party Ever ma requiredVillainGroups i requiredHeroes', () => {
    const s = db.schemes.find(x => x.id === 'trash-earth-with-hugest-party-ever-38-174')!;
    expect(s.overrides.requiredVillainGroups).toEqual(['Intergalactic Party Animals']);
    expect(s.overrides.requiredHeroes).toEqual(['Party Thor']);
  });

  it('Marvel Zombies ma requiredVillainKeyword: "Rise of The Living Dead"', () => {
    const s = db.schemes.find(x => x.id === 'marvel-zombies-38-175')!;
    expect(s.overrides.requiredVillainKeyword).toBe('Rise of The Living Dead');
  });
});

// ---------------------------------------------------------------------------
// Testy resolveSchemeVillainRequirements
// ---------------------------------------------------------------------------
describe('resolveSchemeVillainRequirements()', () => {
  it('requiredVillainGroups: Sinister Six trafia do forcedVillains', () => {
    const scheme = db.schemes.find(x => x.id === 'splice-humans-with-spider-dna-5-23')!;
    const res = resolveSchemeVillainRequirements(scheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedVillains.map(v => v.name)).toContain('Sinister Six');
  });

  it('requiredVillainGroups: Kree-Skrull War zwraca dokładnie 2 forcedVillains', () => {
    const scheme = db.schemes.find(x => x.id === 'kree-skrull-war-the-7-35')!;
    const res = resolveSchemeVillainRequirements(scheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedVillains).toHaveLength(2);
    const names = res.forcedVillains.map(v => v.name);
    expect(names.some(n => n.includes('Kree'))).toBe(true);
    expect(names.some(n => n.includes('Skrull'))).toBe(true);
  });

  it('requiredHenchmanGroups: Khonshu Guardians trafia do forcedHenchmen', () => {
    const scheme = db.schemes.find(x => x.id === 'mark-of-khonshu-the-11-52')!;
    const res = resolveSchemeVillainRequirements(scheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedHenchmen.map(h => h.name)).toContain('Khonshu Guardians');
    expect(res.forcedVillains).toHaveLength(0);
  });

  it('xorVillainGroups: S.H.I.E.L.D. vs. HYDRA zwraca dokładnie 1 forcedVillain', () => {
    const scheme = db.schemes.find(x => x.id === 's-h-i-e-l-d-vs-hydra-war-25-118')!;
    const res = resolveSchemeVillainRequirements(scheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedVillains).toHaveLength(1);
    const name = res.forcedVillains[0].name;
    expect(['Hydra Elite', 'A.I.M., Hydra Offshoot']).toContain(name);
  });

  it('requiredVillainKeyword: Marvel Zombies zwraca grupę z Rise of The Living Dead', () => {
    const scheme = db.schemes.find(x => x.id === 'marvel-zombies-38-175')!;
    const res = resolveSchemeVillainRequirements(scheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedVillains).toHaveLength(1);
    const group = res.forcedVillains[0];
    const hasKeyword = group.cards.some(c =>
      c.abilities.toLowerCase().includes('rise of the living dead')
    );
    expect(hasKeyword).toBe(true);
  });

  it('requiredHeroes: Party Thor trafia do forcedHeroes (Trash Earth)', () => {
    const scheme = db.schemes.find(x => x.id === 'trash-earth-with-hugest-party-ever-38-174')!;
    const res = resolveSchemeVillainRequirements(scheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedHeroes.map(h => h.name)).toContain('Party Thor');
  });

  it('schemat bez żadnych wymagań zwraca puste tablice', () => {
    const normalScheme = db.schemes.find(s =>
      !s.overrides.requiredVillainGroups &&
      !s.overrides.xorVillainGroups &&
      !s.overrides.requiredVillainKeyword &&
      !s.overrides.requiredHenchmanGroups &&
      !s.overrides.requiredHeroes
    )!;
    const res = resolveSchemeVillainRequirements(normalScheme, db.villains, db.henchmen, db.heroes);
    expect(res.forcedVillains).toHaveLength(0);
    expect(res.forcedHenchmen).toHaveLength(0);
    expect(res.forcedHeroes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Testy generateSetup() — integracja
// ---------------------------------------------------------------------------
describe('generateSetup() — scheme villain requirements', () => {
  it('Sinister Six jest w selectedVillains dla Splice Humans with Spider DNA', () => {
    const scheme = db.schemes.find(x => x.id === 'splice-humans-with-spider-dna-5-23')!;
    const setup = generateSetup(makeInput(scheme, 2));
    expect(setup.villains.some(v => v.name === 'Sinister Six')).toBe(true);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.schemeRequiredVillains')).toBe(true);
  });

  it('Kree-Skrull War: obie grupy zawsze w selectedVillains', () => {
    const scheme = db.schemes.find(x => x.id === 'kree-skrull-war-the-7-35')!;
    const setup = generateSetup(makeInput(scheme, 2));
    const names = setup.villains.map(v => v.name);
    expect(names.some(n => n.includes('Kree'))).toBe(true);
    expect(names.some(n => n.includes('Skrull'))).toBe(true);
  });

  it('Kree-Skrull War solo (1 gracz): villains.length ≥ 2 (obie wymuszone grupy)', () => {
    const scheme = db.schemes.find(x => x.id === 'kree-skrull-war-the-7-35')!;
    const setup = generateSetup(makeInput(scheme, 1));
    // standardowo solo = 1 villain, ale schemat wymusza 2
    expect(setup.villains.length).toBeGreaterThanOrEqual(2);
  });

  it('Khonshu Guardians jest w selectedHenchmen dla Mark of Khonshu', () => {
    const scheme = db.schemes.find(x => x.id === 'mark-of-khonshu-the-11-52')!;
    const setup = generateSetup(makeInput(scheme, 2));
    expect(setup.henchmen.some(h => h.name === 'Khonshu Guardians')).toBe(true);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.schemeRequiredHenchmen')).toBe(true);
  });

  it('S.H.I.E.L.D. vs. HYDRA: dokładnie jedna z dwóch grup w selectedVillains', () => {
    const scheme = db.schemes.find(x => x.id === 's-h-i-e-l-d-vs-hydra-war-25-118')!;
    const setup = generateSetup(makeInput(scheme, 2));
    const hydraElite = setup.villains.some(v => v.name === 'Hydra Elite');
    const aim = setup.villains.some(v => v.name === 'A.I.M., Hydra Offshoot');
    // Dokładnie jedna z dwóch (XOR)
    expect(hydraElite !== aim).toBe(true);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.schemeXorVillain')).toBe(true);
  });

  it('Marvel Zombies: villains zawiera grupę z [Rise of The Living Dead]', () => {
    const scheme = db.schemes.find(x => x.id === 'marvel-zombies-38-175')!;
    const setup = generateSetup(makeInput(scheme, 2));
    const hasKeywordVillain = setup.villains.some(v =>
      v.cards.some(c => c.abilities.toLowerCase().includes('rise of the living dead'))
    );
    expect(hasKeywordVillain).toBe(true);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.schemeRequiredVillainKeyword')).toBe(true);
  });

  it('Trash Earth: Party Thor jest wśród wylosowanych heroes', () => {
    const scheme = db.schemes.find(x => x.id === 'trash-earth-with-hugest-party-ever-38-174')!;
    const setup = generateSetup(makeInput(scheme, 2));
    expect(setup.heroes.some(h => h.name === 'Party Thor')).toBe(true);
    expect(setup.villains.some(v => v.name === 'Intergalactic Party Animals')).toBe(true);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.schemeRequiredHeroes')).toBe(true);
  });

  it('brak duplikatów villain groups gdy mastermind i schemat wymuszają tę samą grupę', () => {
    // Sprawdź że nie ma duplikatów w selectedVillains niezależnie od schematu
    const scheme = db.schemes.find(x => x.id === 'kree-skrull-war-the-7-35')!;
    const setup = generateSetup(makeInput(scheme, 3));
    const ids = setup.villains.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('schemat bez wymagań: brak not schemeRequired w setupNotes', () => {
    const normalScheme = db.schemes.find(s =>
      !s.overrides.requiredVillainGroups &&
      !s.overrides.xorVillainGroups &&
      !s.overrides.requiredVillainKeyword &&
      !s.overrides.requiredHenchmanGroups &&
      !s.overrides.requiredHeroes
    )!;
    const setup = generateSetup(makeInput(normalScheme, 2));
    expect(setup.setupNotes.some(n => n.key.startsWith('setup.notes.schemeRequired'))).toBe(false);
    expect(setup.setupNotes.some(n => n.key === 'setup.notes.schemeXorVillain')).toBe(false);
  });
});

