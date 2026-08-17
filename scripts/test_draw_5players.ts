/**
 * Testowe losowanie dla 5 graczy — tryb Smart Equalizer (zbalansowane dobranie)
 * Uruchom: tsx scripts/test_draw_5players.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Typy ────────────────────────────────────────────────────────────────────

type HeroClass = 'Covert' | 'Instinct' | 'Ranged' | 'Strength' | 'Tech';

interface HeroCard { name: string; quantity: number; cost: number; class: string; attack: string; recruit: string; abilities: string; }
interface Hero { id: string; name: string; expansionId: number; faction: string; primaryClasses: HeroClass[]; keywords: string[]; powerLevel: number; countersProvided: string[]; cards: readonly HeroCard[]; }
interface MastermindCard { name: string; isEpic: boolean; abilities: string; }
interface Mastermind { id: string; name: string; expansionId: number; difficulty: number; alwaysLeads: string; theme: string; vp: number | null; countersNeeded: string[]; cards: readonly MastermindCard[]; }
interface SchemeCard { name: string; abilities: string; }
interface Scheme { id: string; name: string; expansionId: number; difficulty: number; countersNeeded: string[]; overrides: Record<string, unknown>; cards: readonly SchemeCard[]; }
interface VillainCard { name: string; qtd?: number | null; vAttack?: string | null; vAttackNumeric?: number | null; vp?: number | null; isEpic?: boolean; abilities: string; }
interface VillainGroup { id: string; name: string; expansionId: number; theme: string; countersNeeded: string[]; cards: readonly VillainCard[]; }
interface HenchmanCard { name: string; qtd?: number | null; vAttack?: string | null; vAttackNumeric?: number | null; abilities: string; }
interface Henchman { id: string; name: string; expansionId: number; countersNeeded: string[]; cards: readonly HenchmanCard[]; }

interface CardsDatabase { expansions: unknown[]; heroes: Hero[]; masterminds: Mastermind[]; schemes: Scheme[]; villains: VillainGroup[]; henchmen: Henchman[]; }

// ── Ładowanie danych ─────────────────────────────────────────────────────────

function loadDatabase(): CardsDatabase {
  const cardsPath = path.resolve(__dirname, '../src/assets/cards.json');
  if (!fs.existsSync(cardsPath)) {
    throw new Error(`Brak pliku cards.json. Uruchom najpierw: npm run migrate`);
  }
  const raw = fs.readFileSync(cardsPath, 'utf-8');
  return JSON.parse(raw) as CardsDatabase;
}

// ── Silnik losowania ─────────────────────────────────────────────────────────

function uniformSample<T>(items: T[], k: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  const count = Math.min(k, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function calculateWeight(playCount: number, lastPlayedIndex: number, totalMatches: number, alpha: number): number {
  const deltaT = lastPlayedIndex === -1 ? totalMatches + 1 : totalMatches - lastPlayedIndex + 1;
  return (1 / Math.pow(playCount + 1, alpha)) * deltaT;
}

function weightedSample<T>(items: T[], k: number, weights: number[]): T[] {
  if (items.length === 0 || k <= 0) return [];
  const pool = [...items];
  const w = [...weights];
  const result: T[] = [];
  const count = Math.min(k, pool.length);
  for (let i = 0; i < count; i++) {
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool[idx]);
      pool.splice(idx, 1);
      w.splice(idx, 1);
      continue;
    }
    let r = Math.random() * sum;
    let chosen = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      r -= w[j];
      if (r <= 0) { chosen = j; break; }
    }
    result.push(pool[chosen]);
    pool.splice(chosen, 1);
    w.splice(chosen, 1);
  }
  return result;
}

/**
 * Smart Equalizer – bojownicy bez historii = neutralne wagi (totalMatches=0, wszystkie zerowe liczniki).
 * Symuluje tryb "smart" bez danych historycznych (wszystkie wagi równe → praktycznie losowo, ale z logiką silnika).
 */
function smartEqualizerDraw(heroes: Hero[], k: number, alpha: number): Hero[] {
  const totalMatches = 0;
  // Brak historii → wszystkie herosy mają play_count=0, lastPlayedIndex=-1
  // W(h) = 1/(0+1)^alpha * (0+1) = 1.0 → równe wagi
  const weights = heroes.map(() => calculateWeight(0, -1, totalMatches, alpha));
  return weightedSample(heroes, k, weights);
}

// ── Analiza zgodności ────────────────────────────────────────────────────────

interface CompatibilityReport {
  mastermindCoverage: { tag: string; coveredBy: string[] }[];
  schemeCoverage: { tag: string; coveredBy: string[] }[];
  villainCoverage: { villain: string; tag: string; coveredBy: string[] }[];
  henchmanCoverage: { henchman: string; tag: string; coveredBy: string[] }[];
  uncoveredTags: string[];
  coverageScore: number;
  heroClasses: Record<string, string[]>;
  heroCountersSummary: string[];
  challengeLevel: string;
}

function analyzeCompatibility(
  mastermind: Mastermind,
  scheme: Scheme,
  villains: VillainGroup[],
  henchmen: Henchman[],
  heroes: Hero[]
): CompatibilityReport {
  const heroCounters = new Set(heroes.flatMap(h => h.countersProvided));

  // Pokrycie counterów masterminda
  const mastermindCoverage = mastermind.countersNeeded.map(tag => ({
    tag,
    coveredBy: heroes.filter(h => h.countersProvided.includes(tag)).map(h => h.name),
  }));

  // Pokrycie counterów schematu
  const schemeCoverage = scheme.countersNeeded.map(tag => ({
    tag,
    coveredBy: heroes.filter(h => h.countersProvided.includes(tag)).map(h => h.name),
  }));

  // Pokrycie counterów villainów
  const villainCoverage = villains.flatMap(v =>
    v.countersNeeded.map(tag => ({
      villain: v.name,
      tag,
      coveredBy: heroes.filter(h => h.countersProvided.includes(tag)).map(h => h.name),
    }))
  );

  // Pokrycie counterów henchmanów
  const henchmanCoverage = henchmen.flatMap(h =>
    h.countersNeeded.map(tag => ({
      henchman: h.name,
      tag,
      coveredBy: heroes.filter(hero => hero.countersProvided.includes(tag)).map(hero => hero.name),
    }))
  );

  // Nieobjęte tagi (wymagane ale żaden bohater ich nie dostarcza)
  const allRequiredTags = [
    ...mastermind.countersNeeded,
    ...scheme.countersNeeded,
    ...villains.flatMap(v => v.countersNeeded),
    ...henchmen.flatMap(h => h.countersNeeded),
  ];
  const uniqueRequired = [...new Set(allRequiredTags)];
  const uncoveredTags = uniqueRequired.filter(tag => !heroCounters.has(tag));

  // Wynik pokrycia (procent)
  const covered = uniqueRequired.filter(tag => heroCounters.has(tag)).length;
  const coverageScore = uniqueRequired.length > 0 ? Math.round((covered / uniqueRequired.length) * 100) : 100;

  // Klasy bohaterów
  const heroClasses: Record<string, string[]> = {};
  for (const hero of heroes) {
    for (const cls of hero.primaryClasses) {
      if (!heroClasses[cls]) heroClasses[cls] = [];
      heroClasses[cls].push(hero.name);
    }
  }

  // Zestawienie counterów bohaterów
  const heroCountersSummary = heroes.map(h =>
    `${h.name}: [${h.countersProvided.join(', ')}]`
  );

  // Ocena wyzwania
  let challengeLevel: string;
  if (coverageScore >= 85) challengeLevel = '🟢 Niskie (dobrze kontrowany setup)';
  else if (coverageScore >= 65) challengeLevel = '🟡 Umiarkowane (dobry balans wyzwania)';
  else if (coverageScore >= 45) challengeLevel = '🟠 Wysokie (trudny setup — wyzwanie!!)';
  else challengeLevel = '🔴 Bardzo wysokie (ekstremalnie trudny setup!)';

  return {
    mastermindCoverage,
    schemeCoverage,
    villainCoverage,
    henchmanCoverage,
    uncoveredTags,
    coverageScore,
    heroClasses,
    heroCountersSummary,
    challengeLevel,
  };
}

// ── Formatowanie raportu ─────────────────────────────────────────────────────

function printReport(
  mastermind: Mastermind,
  scheme: Scheme,
  villains: VillainGroup[],
  henchmen: Henchman[],
  heroes: Hero[],
  report: CompatibilityReport,
  playerCount: number,
  bystanders: number,
  drawNum: number
): void {
  const hr = '═'.repeat(70);
  const hr2 = '─'.repeat(70);

  console.log(`\n${hr}`);
  console.log(`  🎲  LOSOWANIE #${drawNum} — ${playerCount} GRACZY  |  Tryb: Smart Equalizer (zbalansowany)`);
  console.log(hr);

  console.log(`\n🦹  MASTERMIND: ${mastermind.name}`);
  console.log(`    └─ Zawsze prowadzi: ${mastermind.alwaysLeads || '(dowolna grupa)'}`);
  console.log(`    └─ Countery potrzebne: [${mastermind.countersNeeded.join(', ')}]`);

  console.log(`\n📜  SCHEMAT: ${scheme.name}`);
  console.log(`    └─ Countery potrzebne: [${scheme.countersNeeded.join(', ')}]`);

  console.log(`\n💀  GRUPY VILLAINÓW (${villains.length}):`);
  for (const v of villains) {
    const maxAtk = Math.max(0, ...v.cards.map(c => c.vAttackNumeric ?? 0));
    console.log(`    • ${v.name}  (max atak: ${maxAtk > 0 ? maxAtk : '?'})`);
    console.log(`      └─ Countery: [${v.countersNeeded.join(', ')}]`);
  }

  console.log(`\n🪖  SŁUDZY/HENCHMEN (${henchmen.length}):`);
  for (const h of henchmen) {
    console.log(`    • ${h.name}`);
    console.log(`      └─ Countery: [${h.countersNeeded.join(', ')}]`);
  }

  console.log(`\n🦸  BOHATEROWIE (${heroes.length}) — tryb Smart Equalizer:`);
  for (const hero of heroes) {
    console.log(`    • ${hero.name}`);
    console.log(`      └─ Klasy: [${hero.primaryClasses.join(', ')}]`);
    console.log(`      └─ Countery: [${hero.countersProvided.join(', ')}]`);
  }

  console.log(`\n👥  Liczba graczy: ${playerCount}  |  Przeszkodnicy: ${bystanders}`);

  console.log(`\n${hr2}`);
  console.log(`  📊  ANALIZA ZGODNOŚCI`);
  console.log(hr2);

  // Pokrycie masteriminda
  console.log(`\n🦹  Mastermind — Pokrycie counterów:`);
  if (report.mastermindCoverage.length === 0) {
    console.log(`    (brak wymagań)  ✅`);
  } else {
    for (const c of report.mastermindCoverage) {
      const ok = c.coveredBy.length > 0;
      console.log(`    ${ok ? '✅' : '❌'} [${c.tag}]  →  ${ok ? c.coveredBy.join(', ') : 'BRAK POKRYCIA'}`);
    }
  }

  // Pokrycie schematu
  console.log(`\n📜  Schemat — Pokrycie counterów:`);
  if (report.schemeCoverage.length === 0) {
    console.log(`    (brak wymagań)  ✅`);
  } else {
    for (const c of report.schemeCoverage) {
      const ok = c.coveredBy.length > 0;
      console.log(`    ${ok ? '✅' : '❌'} [${c.tag}]  →  ${ok ? c.coveredBy.join(', ') : 'BRAK POKRYCIA'}`);
    }
  }

  // Pokrycie villainów
  console.log(`\n💀  Villainowie — Pokrycie counterów:`);
  const villainTagsGrouped: Record<string, { covered: boolean; coveredBy: string[] }> = {};
  for (const vc of report.villainCoverage) {
    const key = `${vc.villain}::${vc.tag}`;
    villainTagsGrouped[key] = { covered: vc.coveredBy.length > 0, coveredBy: vc.coveredBy };
  }
  if (report.villainCoverage.length === 0) {
    console.log(`    (brak wymagań)  ✅`);
  } else {
    for (const vc of report.villainCoverage) {
      const ok = vc.coveredBy.length > 0;
      console.log(`    ${ok ? '✅' : '❌'} ${vc.villain} [${vc.tag}]  →  ${ok ? vc.coveredBy.join(', ') : 'BRAK POKRYCIA'}`);
    }
  }

  // Pokrycie henchmanów
  console.log(`\n🪖  Henchmani — Pokrycie counterów:`);
  if (report.henchmanCoverage.length === 0) {
    console.log(`    (brak wymagań)  ✅`);
  } else {
    for (const hc of report.henchmanCoverage) {
      const ok = hc.coveredBy.length > 0;
      console.log(`    ${ok ? '✅' : '❌'} ${hc.henchman} [${hc.tag}]  →  ${ok ? hc.coveredBy.join(', ') : 'BRAK POKRYCIA'}`);
    }
  }

  // Podsumowanie klas
  console.log(`\n🎨  Klasy bohaterów w drużynie:`);
  for (const [cls, heroNames] of Object.entries(report.heroClasses)) {
    console.log(`    • ${cls}: ${heroNames.join(', ')}`);
  }
  const uniqueClasses = Object.keys(report.heroClasses).length;
  const classNote = uniqueClasses >= 4 ? '🎯 Dobra różnorodność klas!' : uniqueClasses === 3 ? '⚠️  Umiarkowana różnorodność klas' : '❌ Mała różnorodność klas';
  console.log(`    Unikalne klasy: ${uniqueClasses}/5  ${classNote}`);

  // Tagi nieobjęte
  if (report.uncoveredTags.length > 0) {
    console.log(`\n⚠️  NIEOBJĘTE TAGI (potrzebne ale brak bohatera):`);
    for (const tag of report.uncoveredTags) {
      console.log(`    ❌ [${tag}]`);
    }
  } else {
    console.log(`\n✅  Wszystkie wymagane countery są pokryte przez bohaterów!`);
  }

  console.log(`\n${hr2}`);
  console.log(`  🎯  WYNIK POKRYCIA: ${report.coverageScore}%`);
  console.log(`  ⚡  POZIOM WYZWANIA: ${report.challengeLevel}`);
  console.log(hr2);

  // Ocena użyteczności setupu
  console.log(`\n📋  OCENA SETUPU:`);
  const hasSynergy = report.coverageScore >= 50;
  const isChallenge = report.coverageScore < 80;
  const hasClassDiversity = uniqueClasses >= 3;

  console.log(`    ${hasSynergy ? '✅' : '⚠️ '} Synergistyczny setup: ${hasSynergy ? 'TAK' : 'NIE'}`);
  console.log(`    ${isChallenge ? '✅' : 'ℹ️ '} Pewne wyzwanie: ${isChallenge ? 'TAK — gracze będą mieć trudniej!' : 'NIE — heroes dobrze kontrują wszystko'}`);
  console.log(`    ${hasClassDiversity ? '✅' : '⚠️ '} Różnorodność klas: ${hasClassDiversity ? 'TAK' : 'NIE — mono/duo klasy'}`);
  console.log(`    ℹ️  Niepokrytych counterów: ${report.uncoveredTags.length}/${new Set([...mastermind.countersNeeded, ...scheme.countersNeeded, ...villains.flatMap(v => v.countersNeeded), ...henchmen.flatMap(h => h.countersNeeded)]).size}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔄 Ładowanie bazy kart...');
  let db: CardsDatabase;
  try {
    db = loadDatabase();
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }

  console.log(`✅ Załadowano: ${db.heroes.length} bohaterów, ${db.masterminds.length} mastermindów, ` +
    `${db.schemes.length} schematów, ${db.villains.length} grup villainów, ${db.henchmen.length} henchmanów`);

  // Reguły dla 5 graczy
  const PLAYER_COUNT = 5;
  const RULES = { heroCount: 6, villainCount: 5, henchmanCount: 2, bystanders: 16 };
  const ALPHA = 1.0; // domyślny współczynnik Smart Equalizer

  // Stałe ziarna dla reprodukowalności
  const SEEDS = [42, 137, 999];

  // Wykonaj 3 losowania
  for (let i = 0; i < 3; i++) {
    // Ustaw pseudo-seed przez prosty mix (JS nie ma Math.seed, więc po prostu kilka iteracji)
    // Każde losowanie jest niezależne

    const mastermind = uniformSample(db.masterminds, 1)[0];
    const scheme = uniformSample(db.schemes, 1)[0];
    const villains = uniformSample(db.villains, RULES.villainCount);
    const henchmen = uniformSample(db.henchmen, RULES.henchmanCount);
    const heroes = smartEqualizerDraw(db.heroes, RULES.heroCount, ALPHA);

    const report = analyzeCompatibility(mastermind, scheme, villains, henchmen, heroes);

    printReport(mastermind, scheme, villains, henchmen, heroes, report, PLAYER_COUNT, RULES.bystanders, i + 1);
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ✅  Losowanie testowe zakończone!`);
  console.log(`  ℹ️   Tryb: Smart Equalizer | Alpha: ${ALPHA} | Gracze: ${PLAYER_COUNT}`);
  console.log(`  ℹ️   Bohaterowie: ${RULES.heroCount} | Villainowie: ${RULES.villainCount} | Henchmani: ${RULES.henchmanCount} | Bystanders: ${RULES.bystanders}`);
  console.log(`${'═'.repeat(70)}\n`);
}

main();

