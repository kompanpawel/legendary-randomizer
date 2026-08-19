import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import { synergyEngineMode } from '../modes/synergyEngine';
import type { Hero, Mastermind, Scheme, VillainGroup, CardsDatabase } from '@/types/cards.ts';

const db = cardsDb as unknown as CardsDatabase;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeHero(id: string, countersProvided: string[]): Hero {
  return {
    id,
    name: id,
    expansionId: 1,
    faction: 'Test',
    primaryClasses: ['Strength'],
    keywords: [],
    powerLevel: 3,
    countersProvided,
    cards: [],
  };
}

function makeMastermind(countersNeeded: string[]): Mastermind {
  return {
    id: 'mm-test',
    name: 'Test Mastermind',
    expansionId: 1,
    difficulty: 3,
    alwaysLeads: 'Any',
    theme: '',
    vp: 6,
    countersNeeded,
    cards: [{ name: 'Tactic', isEpic: false, abilities: '' }],
  };
}

function makeScheme(): Scheme {
  return {
    id: 'scheme-test',
    name: 'Test Scheme',
    expansionId: 1,
    difficulty: 3,
    countersNeeded: [],
    overrides: {},
    cards: [{ name: 'Test Scheme', abilities: '' }],
  };
}

// ─── 1. Dane: hero countersProvided ─────────────────────────────────────────

describe('Cross-Dimensional Rampage — tagi countersProvided w hero data', () => {
  it('wszystkie hero z "Hulk" w imieniu mają hulk-name w countersProvided', () => {
    const hulkHeroes = db.heroes.filter(h => h.name.toLowerCase().includes('hulk'));
    expect(hulkHeroes.length).toBeGreaterThan(5); // sanity
    for (const hero of hulkHeroes) {
      expect(hero.countersProvided).toContain('hulk-name');
    }
  });

  it('hero "Maestro" (wyjątek per rules) ma hulk-name — jeśli istnieje w bazie', () => {
    const maestro = db.heroes.find(h => h.name.toLowerCase().includes('maestro'));
    if (maestro) {
      expect(maestro.countersProvided).toContain('hulk-name');
    }
  });

  it('hero z "Wolverine", "Weapon X" lub "Old Man Logan" w imieniu mają wolverine-name', () => {
    const candidates = db.heroes.filter(h => {
      const nl = h.name.toLowerCase();
      return nl.includes('wolverine') || nl.includes('weapon x') || nl.includes('old man logan');
    });
    expect(candidates.length).toBeGreaterThan(3);
    for (const hero of candidates) {
      expect(hero.countersProvided).toContain('wolverine-name');
    }
  });

  it('hero z "Thor" w imieniu mają thor-name', () => {
    const candidates = db.heroes.filter(h => h.name.toLowerCase().includes('thor'));
    expect(candidates.length).toBeGreaterThan(3);
    for (const hero of candidates) {
      expect(hero.countersProvided).toContain('thor-name');
    }
  });

  it('Party Thor ma party-name', () => {
    const partyThor = db.heroes.find(h => h.name === 'Party Thor');
    expect(partyThor).toBeDefined();
    expect(partyThor!.countersProvided).toContain('party-name');
  });

  it('hero Deadpool/Deadpool ma deadpool-name', () => {
    const candidates = db.heroes.filter(h => h.name.toLowerCase().includes('deadpool'));
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    for (const hero of candidates) {
      expect(hero.countersProvided).toContain('deadpool-name');
    }
  });

  it('hero Ultron ma ultron-name', () => {
    const ultron = db.heroes.find(h => h.name === 'Ultron');
    expect(ultron).toBeDefined();
    expect(ultron!.countersProvided).toContain('ultron-name');
  });
});

// ─── 2. Dane: villain groups countersNeeded ──────────────────────────────────

describe('Cross-Dimensional Rampage — tagi countersNeeded w villain group data', () => {
  function getVG(id: string): VillainGroup {
    const vg = db.villains.find(v => v.id === id);
    if (!vg) throw new Error(`VillainGroup not found: ${id}`);
    return vg;
  }

  it('Wasteland (Hulk Rampage) ma hulk-name w countersNeeded', () => {
    expect(getVG('wasteland-10-33').countersNeeded).toContain('hulk-name');
  });

  it('Illuminati (Hulk + Illuminati Rampage) ma hulk-name i illuminati-name', () => {
    const cn = getVG('illuminati-19-66').countersNeeded;
    expect(cn).toContain('hulk-name');
    expect(cn).toContain('illuminati-name');
  });

  it('Zombie Avengers (Zombie Rampage) ma zombie-name w countersNeeded', () => {
    expect(getVG('zombie-avengers-38-117').countersNeeded).toContain('zombie-name');
  });

  it("Strange's Demons (Demon Rampage) ma demon-name w countersNeeded", () => {
    expect(getVG('strange-s-demons-38-118').countersNeeded).toContain('demon-name');
  });

  it('Domain of Apocalypse (Wolverine Rampage) ma wolverine-name w countersNeeded', () => {
    expect(getVG('domain-of-apocalypse-10-29').countersNeeded).toContain('wolverine-name');
  });

  it('Sentinel Territories (Wolverine Rampage) ma wolverine-name w countersNeeded', () => {
    expect(getVG('sentinel-territories-10-32').countersNeeded).toContain('wolverine-name');
  });

  it("X-Men '92 (Wolverine Rampage) ma wolverine-name w countersNeeded", () => {
    expect(getVG('x-men-92-11-39').countersNeeded).toContain('wolverine-name');
  });

  it('Manhattan Earth-1610 (Thor Rampage) ma thor-name w countersNeeded', () => {
    expect(getVG('manhattan-earth-1610-10-31').countersNeeded).toContain('thor-name');
  });

  it('Monster Metropolis (Deadpool Rampage) ma deadpool-name w countersNeeded', () => {
    expect(getVG('monster-metropolis-11-37').countersNeeded).toContain('deadpool-name');
  });

  it('Intergalactic Party Animals (Party Rampage) ma party-name w countersNeeded', () => {
    expect(getVG('intergalactic-party-animals-38-114').countersNeeded).toContain('party-name');
  });
});

// ─── 3. Dane: mastermind countersNeeded ──────────────────────────────────────

describe('Cross-Dimensional Rampage — tagi countersNeeded w mastermind data', () => {
  function getMM(id: string): Mastermind {
    const mm = db.masterminds.find(m => m.id === id);
    if (!mm) throw new Error(`Mastermind not found: ${id}`);
    return mm;
  }

  it('Wasteland Hulk (Master Strike: Hulk Rampage) ma hulk-name', () => {
    expect(getMM('wasteland-hulk-10-23').countersNeeded).toContain('hulk-name');
  });

  it('General Ross (Master Strike: Hulk Rampage) ma hulk-name', () => {
    expect(getMM('general-thunderbolt-ross-19-50').countersNeeded).toContain('hulk-name');
  });

  it('King Hulk, Sakaarson (Tactic: Hulk Rampage) ma hulk-name', () => {
    expect(getMM('king-hulk-sakaarson-19-52').countersNeeded).toContain('hulk-name');
  });

  it('Zombie Scarlet Witch (Master Strike: Zombie Rampage) ma zombie-name', () => {
    expect(getMM('zombie-scarlet-witch-38-94').countersNeeded).toContain('zombie-name');
  });

  it('Ultron Infinity (Master Strike: Ultron Rampage) ma ultron-name', () => {
    expect(getMM('ultron-infinity-38-96').countersNeeded).toContain('ultron-name');
  });

  it('The Sentry (Master Strike: Void Rampage) ma void-name', () => {
    expect(getMM('sentry-the-19-55').countersNeeded).toContain('void-name');
  });
});

// ─── 4. Dane: scheme countersNeeded ─────────────────────────────────────────

describe('Cross-Dimensional Rampage — tagi countersNeeded w scheme data', () => {
  it('Fall of the Hulks (Twists: Hulk Rampage) ma hulk-name w countersNeeded', () => {
    const sch = db.schemes.find(s => s.id === 'fall-of-the-hulks-19-94');
    expect(sch).toBeDefined();
    expect(sch!.countersNeeded).toContain('hulk-name');
  });
});

// ─── 5. SynergyEngine preferuje bohaterów z hulk-name gdy mastermind wymaga ─

describe('synergyEngineMode — preferuje hulk-name heroes przy Hulk Rampage mastermindie', () => {
  it('znacznie częściej wybiera hulk heroes (tylko oni mają hulk-name) gdy mastermind wymaga hulk-name', () => {
    // Hulk heroes mają TYLKO hulk-name, generic heroes nie mają żadnych tagów.
    // Mastermind wymaga wyłącznie hulk-name — tylko hulk heroes dostają 3x SYNERGY_MULTIPLIER.
    const hulkHeroes = Array.from({ length: 4 }, (_, i) =>
      makeHero(`hulk-hero-${i}`, ['hulk-name'])
    );
    const otherHeroes = Array.from({ length: 20 }, (_, i) =>
      makeHero(`generic-${i}`, [])
    );
    const heroes = [...hulkHeroes, ...otherHeroes];
    const mastermind = makeMastermind(['hulk-name']);
    const scheme = makeScheme();

    let hulkPicks = 0;
    let totalPicks = 0;
    for (let i = 0; i < 300; i++) {
      const picked = synergyEngineMode(heroes, [], scheme, mastermind, 0, 4, 0.5, [], [], 6);
      totalPicks += picked.length;
      hulkPicks += picked.filter(h => h.id.startsWith('hulk-hero')).length;
    }

    // Bez synergii: 4/24 ≈ 16.7%
    // Z 3x SYNERGY_MULTIPLIER dla hulk heroes (wagi 12 vs 20): oczekiwane ≈ 37.5%
    const hulkShare = hulkPicks / totalPicks;
    expect(hulkShare).toBeGreaterThan(0.25); // wyraźnie powyżej baseline 16.7%
  });
});


