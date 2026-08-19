/**
 * Resolver dla wymagań Villain Group / Henchman / Hero na poziomie Schematu.
 *
 * Obsługiwane pola z `scheme.overrides`:
 *
 * 1. `requiredVillainGroups` (AND): każda nazwa jest dopasowywana do dostępnej puli
 *    i wymuszana w setupie. Np. ["Kree Starforce", "Skrulls"] dla The Kree-Skrull War.
 *
 * 2. `xorVillainGroups` (XOR): dokładnie jedna z podanych grup jest losowana
 *    z dostępnej puli. Np. S.H.I.E.L.D. vs. HYDRA War.
 *
 * 3. `requiredVillainKeyword`: jedna Villain Group, której karty zawierają podane słowo
 *    kluczowe, jest losowana spośród dostępnych. Np. "Rise of The Living Dead".
 *
 * 4. `requiredHenchmanGroups` (AND): analogicznie do requiredVillainGroups, ale dla Henchmen.
 *
 * 5. `requiredHeroes` (AND): bohaterowie wymuszani do Hero Decku (rozwiązywani po nazwie).
 *    Np. ["Party Thor"] dla Trash Earth with Hugest Party Ever.
 */

import type { Scheme, VillainGroup, Henchman, Hero } from '../../types/cards';
import { uniformSample } from './weightedSample';

export interface SchemeVillainRequirementsResolution {
  /** Villain groups wymuszane przez schemat (po deduplikacji z alwaysLeads Masterminda) */
  forcedVillains: VillainGroup[];
  /** Henchman groups wymuszane przez schemat */
  forcedHenchmen: Henchman[];
  /** Bohaterowie wymuszani przez schemat */
  forcedHeroes: Hero[];
}

// ── Pomocnicza funkcja dopasowania nazwy do grupy ──────────────────────────────
// Uproszczona kopia matchGroup z resolveAlwaysLeads.ts (nie importujemy, żeby uniknąć
// wzajemnych zależności między utilities).

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function removeThe(s: string): string {
  return s.replace(/^the\s+/i, '').replace(/,?\s*the\s*$/i, '').trim();
}

function matchGroup<T extends { name: string; id: string }>(
  target: string,
  pool: T[]
): T | undefined {
  if (!target || pool.length === 0) return undefined;
  const tLower = target.toLowerCase();
  const tNorm = norm(target);

  // 1. Dokładne (case-insensitive)
  const exact = pool.find(g => g.name.toLowerCase() === tLower);
  if (exact) return exact;

  // 2. Znormalizowane
  const normExact = pool.find(g => norm(g.name) === tNorm);
  if (normExact) return normExact;

  // 3. Target zawiera nazwę grupy
  if (tNorm.length >= 4) {
    const contained = pool.find(g => {
      const gn = norm(g.name);
      return gn.length >= 4 && tNorm.includes(gn);
    });
    if (contained) return contained;
  }

  // 4. Nazwa grupy zawiera target
  if (tNorm.length >= 4) {
    const reverse = pool.find(g => {
      const gn = norm(g.name);
      return gn.length >= 4 && gn.includes(tNorm);
    });
    if (reverse) return reverse;
  }

  // 5. Porównanie bez przedimka "The"
  const tNoThe = norm(removeThe(target));
  if (tNoThe.length >= 4) {
    const noTheMatch = pool.find(g => norm(removeThe(g.name)) === tNoThe);
    if (noTheMatch) return noTheMatch;
  }

  return undefined;
}

// ── Główna funkcja ─────────────────────────────────────────────────────────────

export function resolveSchemeVillainRequirements(
  scheme: Scheme,
  allVillains: VillainGroup[],
  allHenchmen: Henchman[],
  allHeroes: Hero[],
): SchemeVillainRequirementsResolution {
  const forcedVillains: VillainGroup[] = [];
  const forcedHenchmen: Henchman[] = [];
  const forcedHeroes: Hero[] = [];
  const usedVillainIds = new Set<string>();
  const usedHenchmanIds = new Set<string>();
  const usedHeroIds = new Set<string>();

  // 1. requiredVillainGroups — AND logic
  for (const name of (scheme.overrides.requiredVillainGroups ?? [])) {
    const available = allVillains.filter(v => !usedVillainIds.has(v.id));
    const match = matchGroup(name, available);
    if (match) {
      forcedVillains.push(match);
      usedVillainIds.add(match.id);
    }
  }

  // 2. xorVillainGroups — dokładnie jedna z puli
  const xorGroups = scheme.overrides.xorVillainGroups ?? [];
  if (xorGroups.length > 0) {
    const available = allVillains.filter(v => !usedVillainIds.has(v.id));
    const candidates = xorGroups
      .map(name => matchGroup(name, available))
      .filter((v): v is VillainGroup => v !== undefined);
    if (candidates.length > 0) {
      const picked = uniformSample(candidates, 1)[0];
      forcedVillains.push(picked);
      usedVillainIds.add(picked.id);
    }
  }

  // 3. requiredVillainKeyword — jedna Villain Group z danym słowem kluczowym w kartach
  const kw = scheme.overrides.requiredVillainKeyword;
  if (kw) {
    const available = allVillains.filter(v =>
      !usedVillainIds.has(v.id) &&
      v.cards.some(c => c.abilities.toLowerCase().includes(kw.toLowerCase()))
    );
    if (available.length > 0) {
      const picked = uniformSample(available, 1)[0];
      forcedVillains.push(picked);
      usedVillainIds.add(picked.id);
    }
  }

  // 4. requiredHenchmanGroups — AND logic
  for (const name of (scheme.overrides.requiredHenchmanGroups ?? [])) {
    const available = allHenchmen.filter(h => !usedHenchmanIds.has(h.id));
    const match = matchGroup(name, available);
    if (match) {
      forcedHenchmen.push(match);
      usedHenchmanIds.add(match.id);
    }
  }

  // 5. requiredHeroes — AND logic
  for (const name of (scheme.overrides.requiredHeroes ?? [])) {
    const available = allHeroes.filter(h => !usedHeroIds.has(h.id));
    const match = matchGroup(name, available);
    if (match) {
      forcedHeroes.push(match);
      usedHeroIds.add(match.id);
    }
  }

  return { forcedVillains, forcedHenchmen, forcedHeroes };
}

