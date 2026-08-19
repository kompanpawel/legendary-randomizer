/**
 * Punkt 9 — „Add an extra Villain Group" — 18 schematów bez pokrycia
 *
 * Mechanika: Wiele schematów wymaga dodatkowej grupy Villain Group ponad standardową
 * liczbę wynikającą z liczby graczy. Pole `scheme.overrides.extraVillains: number`
 * przechowuje tę wartość; `generateSetup()` dodaje ją do `villainCount`.
 *
 * Weryfikowane tu:
 *   1. Dokładnie 19 schematów ma extraVillains > 0 w cards.json
 *      (17 bezwarunkowych + Deadpool Wants a Chimichanga + Crush Them With My Bare Hands z kroku 11).
 *   2. Five Families of Crime ma extraVillains = 2 (dwie dodatkowe grupy).
 *   3. Pozostałe 18 schematów ma extraVillains = 1.
 *   4. Konkretne schematy wymienione w opisie problemu są poprawnie oznaczone.
 *   5. generateSetup() faktycznie losuje więcej villain groups, gdy schemat (bezwarunkowy) wymaga.
 *   6. Dla Five Families (extraVillains=2) i playerCount=2 → villains.length = 4.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Scheme } from '@/types/cards.ts';
import { generateSetup } from '@/engine/SmartRandomizerEngine.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMinimalInput(forcedScheme: Scheme, playerCount = 2) {
  const mastermind = db.masterminds[0];
  const heroes = db.heroes.slice(0, 6);
  // Provide enough villains for the largest extraVillains test (playerCount=2, extraVillains=2 → need 4)
  const villains = db.villains.slice(0, 10);
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

// ---------------------------------------------------------------------------
// Testy danych — cards.json
// ---------------------------------------------------------------------------
describe('Extra Villain Groups — dane (overrides.extraVillains)', () => {
  const extraSchemes = db.schemes.filter(s => (s.overrides.extraVillains ?? 0) > 0);

  it('dokładnie 19 schematów ma extraVillains > 0 (17 bezwarunkowych + 2 warunkowe z kroku 11)', () => {
    expect(extraSchemes).toHaveLength(19);
  });

  it('Five Families of Crime ma extraVillains = 2', () => {
    const s = db.schemes.find(s => s.name === 'Five Families of Crime')!;
    expect(s).toBeDefined();
    expect(s.overrides.extraVillains).toBe(2);
  });

  it('pozostałe 18 schematów ma extraVillains = 1', () => {
    const ones = extraSchemes.filter(s => s.name !== 'Five Families of Crime');
    expect(ones).toHaveLength(18);
    for (const s of ones) {
      expect(s.overrides.extraVillains).toBe(1);
    }
  });

  it.each([
    'Change the Outcome of WWII',
    'Predict Future Crime',
    'Bank Robbery Hostage Crisis',
    // Note: there are two schemes named "Negative Zone Prison Breakout";
    //   exp-1 adds an extra Henchman (not Villain), exp-42 adds a Villain Group.
    //   We test exp-42 by ID below.
    'Steal the Weaponized Plutonium',
    'Cursed Pages of the Darkhold Tome',
    // Kyln name uses two left curly quotes in the data: "Kyln"  (both \u201c)
    'Inescapable \u201cKyln\u201c Space Prison',
    'Provoke the Sovereign War Fleet',
    'Superhuman Baseball Game',
    'Earthquake Drains the Ocean',
    'Deadlands Hordes Charge the Wall',
    'Fragmented Realities',
    'Smash Two Dimensions Together',
    'Ritual Sacrifice to Summon Chthon',
    'Symbiotic Absorption',
    'War for the Dream Dimension',
  ])('schemat "%s" ma extraVillains = 1', (name) => {
    const s = db.schemes.find(x => x.name === name);
    expect(s, `Schemat "${name}" nie istnieje w bazie`).toBeDefined();
    expect(s!.overrides.extraVillains).toBe(1);
  });

  it('Negative Zone Prison Breakout (exp 42) ma extraVillains = 1', () => {
    const s = db.schemes.find(x => x.id === 'negative-zone-prison-breakout-42-192')!;
    expect(s).toBeDefined();
    expect(s.overrides.extraVillains).toBe(1);
  });

  it('Negative Zone Prison Breakout (exp 1, original) NIE ma extraVillains (dodaje Henchman, nie Villain)', () => {
    const s = db.schemes.find(x => x.id === 'negative-zone-prison-breakout-1-4')!;
    expect(s).toBeDefined();
    expect(s.overrides.extraVillains).toBeFalsy();
  });

  it('Deadpool Wants a Chimichanga ma extraVillains = 1 i extraVillainsMinPlayers = 3 (krok 11 — warunkowy)', () => {
    const s = db.schemes.find(s => s.name === 'Deadpool Wants a Chimichanga')!;
    expect(s.overrides.extraVillains).toBe(1);
    expect(s.overrides.extraVillainsMinPlayers).toBe(3);
  });

  it('Crush Them With My Bare Hands ma extraVillains = 1 i extraVillainsMaxPlayers = 1 (krok 11 — solo)', () => {
    const s = db.schemes.find(s => s.name === 'Crush Them With My Bare Hands')!;
    expect(s.overrides.extraVillains).toBe(1);
    expect(s.overrides.extraVillainsMaxPlayers).toBe(1);
  });

  it('...Open Rifts to Future Timelines NIE ma extraVillains (efekt w grze, nie setup)', () => {
    const s = db.schemes.find(s => s.name.includes('Open Rifts to Future Timelines'))!;
    expect(s.overrides.extraVillains).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Testy silnika — generateSetup respektuje extraVillains
// ---------------------------------------------------------------------------
describe('generateSetup() — extraVillains wpływa na liczbę wylosowanych villain groups', () => {
  // Używamy tylko schematów bezwarunkowo wymagających extraVillains (bez klauzul player-count z kroku 11)
  const unconditionalExtra1 = db.schemes.find(
    s => s.overrides.extraVillains === 1 && !s.overrides.extraVillainsMinPlayers && !s.overrides.extraVillainsMaxPlayers
  )!;

  it('schemat bez extraVillains: 2 graczy → 2 villain groups', () => {
    const normalScheme = db.schemes.find(s => !s.overrides.extraVillains)!;
    const setup = generateSetup(makeMinimalInput(normalScheme, 2));
    expect(setup.villains).toHaveLength(2);
  });

  it('schemat z extraVillains=1 (bezwarunkowy): 2 graczy → 3 villain groups', () => {
    const setup = generateSetup(makeMinimalInput(unconditionalExtra1, 2));
    expect(setup.villains).toHaveLength(3);
  });

  it('schemat z extraVillains=1 (bezwarunkowy): 3 graczy → 4 villain groups', () => {
    const setup = generateSetup(makeMinimalInput(unconditionalExtra1, 3));
    expect(setup.villains).toHaveLength(4);
  });

  it('Five Families of Crime (extraVillains=2): 2 graczy → 4 villain groups', () => {
    const fiveFamilies = db.schemes.find(s => s.name === 'Five Families of Crime')!;
    const setup = generateSetup(makeMinimalInput(fiveFamilies, 2));
    expect(setup.villains).toHaveLength(4);
  });

  it('Five Families of Crime (extraVillains=2): 3 graczy → 5 villain groups', () => {
    const fiveFamilies = db.schemes.find(s => s.name === 'Five Families of Crime')!;
    const setup = generateSetup(makeMinimalInput(fiveFamilies, 3));
    expect(setup.villains).toHaveLength(5);
  });

  it('Five Families of Crime (extraVillains=2): 1 gracz (solo) → 3 villain groups', () => {
    const fiveFamilies = db.schemes.find(s => s.name === 'Five Families of Crime')!;
    const setup = generateSetup(makeMinimalInput(fiveFamilies, 1));
    expect(setup.villains).toHaveLength(3);
  });

  it('wylosowane villain groups są unikalne (brak duplikatów)', () => {
    const extraScheme = db.schemes.find(s => s.overrides.extraVillains === 1)!;
    const setup = generateSetup(makeMinimalInput(extraScheme, 2));
    const ids = setup.villains.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});


