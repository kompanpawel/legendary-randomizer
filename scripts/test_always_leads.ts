/**
 * Test resolveAlwaysLeads dla wszystkich mastermindów z bazy danych.
 * Uruchom: tsx scripts/test_always_leads.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Inline (skopiowane) typy i logika resolveAlwaysLeads ────────────────────
// (uruchamiamy bez kompilacji tsx import aliasów)

interface VillainGroup { id: string; name: string; }
interface Henchman { id: string; name: string; }
interface Mastermind { id: string; name: string; alwaysLeads: string; }

interface AlwaysLeadsResolution {
  forcedVillain?: VillainGroup;
  forcedHenchman?: Henchman;
  villainKeywords?: string[];
  additionalHenchmanKeyword?: string;
  isUnconstrained: boolean;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, '').trim();
}
function removeThe(s: string): string {
  return s.replace(/^the\s+/i, '').replace(/,?\s*the\s*$/i, '').trim();
}
function extractPrimaryName(raw: string): string {
  let s = stripParens(raw).trim();
  const dotSpaceIdx = s.indexOf('. ');
  if (dotSpaceIdx !== -1) s = s.substring(0, dotSpaceIdx).trim();
  s = s.replace(/\.$/, '').trim();
  s = s.replace(/,?\s*(even in|set aside|plus add|in solo)\b.*/i, '').trim();
  return s;
}
function matchGroup<T extends { name: string; id: string }>(target: string, pool: T[]): T | undefined {
  if (!target || pool.length === 0) return undefined;
  const tLower = target.toLowerCase();
  const tNorm = norm(target);
  const exact = pool.find(g => g.name.toLowerCase() === tLower);
  if (exact) return exact;
  const normExact = pool.find(g => norm(g.name) === tNorm);
  if (normExact) return normExact;
  if (tNorm.length >= 4) {
    const contained = pool.find(g => { const gn = norm(g.name); return gn.length >= 4 && tNorm.includes(gn); });
    if (contained) return contained;
  }
  if (tNorm.length >= 4) {
    const reverse = pool.find(g => { const gn = norm(g.name); return gn.length >= 4 && gn.includes(tNorm); });
    if (reverse) return reverse;
  }
  // "The X" ↔ "X, The"
  const tNoThe = norm(removeThe(target));
  if (tNoThe.length >= 4) {
    const noTheMatch = pool.find(g => norm(removeThe(g.name)) === tNoThe);
    if (noTheMatch) return noTheMatch;
  }
  // Acronym: "MLF" → "Mutant Liberation Front"
  const trimmed = target.trim();
  if (trimmed.length >= 2 && trimmed.length <= 6 && /^[A-Z]+$/.test(trimmed)) {
    const acronymMatch = pool.find(g => {
      const initials = g.name.split(/[\s,.-]+/).filter(Boolean).map(w => w[0]?.toUpperCase() ?? '').join('');
      return initials === trimmed;
    });
    if (acronymMatch) return acronymMatch;
  }
  return undefined;
}

function resolveAlwaysLeads(
  alwaysLeads: string,
  allVillains: VillainGroup[],
  allHenchmen: Henchman[]
): AlwaysLeadsResolution {
  if (!alwaysLeads) return { isUnconstrained: true };
  const raw = alwaysLeads.trim();
  if (/^any villain group\.?$/i.test(raw)) return { isUnconstrained: true };
  if (/^any villain group,/i.test(raw)) return { isUnconstrained: true };

  const anyKeywordMatch = raw.match(/^any\s+(.+?)\s+villain\s+group/i);
  if (anyKeywordMatch) {
    const keywordPart = anyKeywordMatch[1];
    const quoted = [...keywordPart.matchAll(/\u201c([^\u201c]+)\u201c/g)].map(m => m[1].trim());
    const unquoted = quoted.length === 0 ? [keywordPart.replace(/\bor\b/gi, '').trim()] : [];
    const keywords = quoted.length > 0 ? quoted : unquoted;
    return { villainKeywords: keywords.filter(Boolean), isUnconstrained: false };
  }

  if (/ and /i.test(raw)) {
    const andIdx = raw.search(/ and /i);
    const primaryPart = extractPrimaryName(raw.substring(0, andIdx).trim());
    const secondaryPart = raw.substring(andIdx + 5).trim();
    const forcedVillain = matchGroup(primaryPart, allVillains);
    let additionalHenchmanKeyword: string | undefined;
    const henchKwMatch = secondaryPart.match(/(?:any\s+|a\s+)?(.+?)\s+henchm(?:en|an)\s+group/i);
    if (henchKwMatch) additionalHenchmanKeyword = henchKwMatch[1].trim();
    if (forcedVillain || additionalHenchmanKeyword) {
      return { forcedVillain, additionalHenchmanKeyword, isUnconstrained: false };
    }
  }

  const primaryName = extractPrimaryName(raw);
  const forcedVillain = matchGroup(primaryName, allVillains);
  if (forcedVillain) return { forcedVillain, isUnconstrained: false };
  const forcedHenchman = matchGroup(primaryName, allHenchmen);
  if (forcedHenchman) return { forcedHenchman, isUnconstrained: false };
  return { isUnconstrained: true };
}

// ── Załaduj bazę ──────────────────────────────────────────────────────────────

const db = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../src/assets/cards.json'), 'utf-8'
));

const masterminds: Mastermind[] = db.masterminds;
const villains: VillainGroup[] = db.villains;
const henchmen: Henchman[] = db.henchmen;

// ── Uruchom analizę ────────────────────────────────────────────────────────────

const hr = '═'.repeat(72);
console.log(`\n${hr}`);
console.log('  🔍  TEST resolveAlwaysLeads — wszyscy mastermindowie');
console.log(hr);

let matched = 0;
let keywords = 0;
let unconstrained = 0;
let unmatched = 0;

const unmatchedList: { name: string; alwaysLeads: string }[] = [];

for (const mm of masterminds) {
  const res = resolveAlwaysLeads(mm.alwaysLeads, villains, henchmen);

  let status: string;
  let detail: string;

  if (res.forcedVillain) {
    matched++;
    status = '✅ VILLAIN';
    detail = `→ ${res.forcedVillain.name}`;
    if (res.additionalHenchmanKeyword) {
      const matchingH = henchmen.filter(h => h.name.toLowerCase().includes(res.additionalHenchmanKeyword!.toLowerCase()));
      detail += ` + henchman keyword="${res.additionalHenchmanKeyword}" (${matchingH.map(h => h.name).join(', ') || 'BRAK!'})`;
    }
  } else if (res.forcedHenchman) {
    matched++;
    status = '✅ HENCHMAN';
    detail = `→ ${res.forcedHenchman.name}`;
  } else if (res.villainKeywords && res.villainKeywords.length > 0) {
    keywords++;
    status = '🔑 KEYWORD';
    const matchingV = villains.filter(v =>
      res.villainKeywords!.some(kw => v.name.toLowerCase().includes(kw.toLowerCase()))
    );
    detail = `kw=[${res.villainKeywords.join(', ')}] → pasuje: [${matchingV.map(v => v.name).join(', ')}]`;
  } else if (res.isUnconstrained) {
    unconstrained++;
    status = '🔓 ANY';
    detail = '(brak ograniczeń)';
  } else {
    unmatched++;
    status = '❌ BRAK';
    detail = `alwaysLeads="${mm.alwaysLeads}"`;
    unmatchedList.push({ name: mm.name, alwaysLeads: mm.alwaysLeads });
  }

  console.log(`  ${status.padEnd(14)} ${mm.name.padEnd(38)} ${detail}`);
}

console.log(`\n${'─'.repeat(72)}`);
console.log(`  📊  PODSUMOWANIE (${masterminds.length} mastermindów):`);
console.log(`  ✅  Dopasowane konkretne grupy:  ${matched}`);
console.log(`  🔑  Tryb słów kluczowych (Any):  ${keywords}`);
console.log(`  🔓  Bez ograniczeń (Any Group):  ${unconstrained}`);
console.log(`  ❌  Niezdopasowane:              ${unmatched}`);
console.log(`${'─'.repeat(72)}`);

if (unmatchedList.length > 0) {
  console.log(`\n⚠️  Niedopasowane alwaysLeads (wymagają ręcznego sprawdzenia):`);
  for (const u of unmatchedList) {
    console.log(`  • ${u.name}: "${u.alwaysLeads}"`);
  }
}

// ── Test setupu dla 5 graczy ─────────────────────────────────────────────────

console.log(`\n${hr}`);
console.log('  🎲  PRÓBNE LOSOWANIE 3x dla 5 graczy z wymuszeniem alwaysLeads');
console.log(hr);

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

for (let i = 1; i <= 3; i++) {
  const [mm] = uniformSample(db.masterminds, 1);
  const [scheme] = uniformSample(db.schemes, 1);
  const res = resolveAlwaysLeads(mm.alwaysLeads, db.villains, db.henchmen);

  let forcedVillain: VillainGroup | undefined = res.forcedVillain;
  if (!forcedVillain && res.villainKeywords?.length) {
    const pool = db.villains.filter((v: VillainGroup) =>
      res.villainKeywords!.some(kw => v.name.toLowerCase().includes(kw.toLowerCase()))
    );
    [forcedVillain] = uniformSample(pool.length ? pool : db.villains, 1);
  }

  let forcedHenchman: Henchman | undefined = res.forcedHenchman;
  let additionalHenchman: Henchman | undefined;
  if (res.additionalHenchmanKeyword) {
    const kw = res.additionalHenchmanKeyword.toLowerCase();
    const pool = db.henchmen.filter((h: Henchman) => h.name.toLowerCase().includes(kw));
    [additionalHenchman] = uniformSample(pool.length ? pool : db.henchmen, 1);
  }

  const villainPool = db.villains.filter((v: VillainGroup) => v.id !== forcedVillain?.id);
  const remainVillains = Math.max(0, 5 - (forcedVillain ? 1 : 0));
  const selectedVillains: VillainGroup[] = [
    ...(forcedVillain ? [forcedVillain] : []),
    ...uniformSample(villainPool, remainVillains),
  ];

  const forcedH = [forcedHenchman, additionalHenchman].filter(Boolean) as Henchman[];
  const henchPool = db.henchmen.filter((h: Henchman) => !forcedH.some(fh => fh.id === h.id));
  const remainH = Math.max(0, 2 - forcedH.length);
  const selectedHenchmen: Henchman[] = [...forcedH, ...uniformSample(henchPool, remainH)];

  console.log(`\n  Losowanie #${i}:`);
  console.log(`  🦹 Mastermind:  ${mm.name}`);
  console.log(`     alwaysLeads: "${mm.alwaysLeads}"`);
  const tag = res.forcedVillain ? `✅ wymuszona: "${res.forcedVillain.name}"`
    : res.forcedHenchman ? `✅ wymuszony henchman: "${res.forcedHenchman.name}"`
    : res.villainKeywords?.length ? `🔑 keyword: [${res.villainKeywords.join(', ')}] → "${forcedVillain?.name ?? 'brak'}"`
    : '🔓 brak ograniczeń';
  console.log(`     Rozwiązanie: ${tag}`);
  console.log(`  💀 Villainowie: ${selectedVillains.map(v => `"${v.name}"`).join(', ')}`);
  console.log(`  🪖 Henchmani:  ${selectedHenchmen.map(h => `"${h.name}"`).join(', ')}`);
  console.log(`  📜 Schemat:    ${scheme.name}`);
}

console.log(`\n${hr}\n`);


