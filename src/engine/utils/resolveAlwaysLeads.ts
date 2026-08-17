/**
 * Resolver dla pola `alwaysLeads` masterminда.
 *
 * Obsługiwane wzorce (na podstawie analizy wszystkich 111 mastermindów):
 *
 * 1. Dokładna nazwa grupy villainów:
 *    "Inhuman Rebellion" → forcedVillain = Inhuman Rebellion
 *
 * 2. Dokładna nazwa grupy henchmanów:
 *    "Asgardian Warriors" → forcedHenchman = Asgardian Warriors
 *
 * 3. "Any Villain Group" (bez ograniczeń):
 *    "Any Villain Group" → isUnconstrained = true
 *
 * 4. "Any "X" Villain Group" (słowo kluczowe):
 *    'Any "Hydra" Villain Group' → villainKeywords = ["Hydra"]
 *    'Any "Brotherhood" or "X-Men" Villain Group' → villainKeywords = ["Brotherhood","X-Men"]
 *
 * 5. Wielokrotne grupy połączone "and":
 *    "Purifiers and any Sentinel Henchmen Group." → forcedVillain=Purifiers, additionalHenchmanKeyword="Sentinel"
 *    "Shi'ar Imperial Guard and a Shi'ar Henchmen Group." → forcedVillain=Shi'ar Imperial Guard, additionalHenchmanKeyword="Shi'ar"
 *
 * 6. Nazwy z przypisami w nawiasach / po kropce:
 *    "Annihilation Wave (1 player: Use 6 Henchmen.)" → forcedVillain = Annihilation Wave
 *    "Armada of Kang. Set aside..." → forcedVillain = Armada of Kang
 *    "Ultron Sentries (even in solo mode)" → forcedHenchman = Ultron Sentries
 */

import type { VillainGroup, Henchman } from '../../types/cards';

export interface AlwaysLeadsResolution {
  /** Konkretna grupa villainów, którą TRZEBA zawrzeć w setupie */
  forcedVillain?: VillainGroup;
  /** Konkretna grupa henchmanów, którą TRZEBA zawrzeć w setupie */
  forcedHenchman?: Henchman;
  /**
   * Słowa kluczowe dla trybu "Any "X" Villain Group" –
   * spośród dostępnych grup villainów losuj tę, której nazwa zawiera
   * przynajmniej jedno z tych słów (warunek OR).
   */
  villainKeywords?: string[];
  /**
   * Słowo kluczowe dla dodatkowej wymuszonej grupy henchmanów
   * (np. Bastion: „Purifiers and any Sentinel Henchmen Group.")
   */
  additionalHenchmanKeyword?: string;
  /** True gdy alwaysLeads nie nakłada żadnych ograniczeń na villainów */
  isUnconstrained: boolean;
}

// ── Pomocnicze ────────────────────────────────────────────────────────────────

/** Normalizuj: lowercase + tylko alfanumeryczne */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Usuń treść w nawiasach okrągłych */
function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, '').trim();
}

/**
 * Wyciągnij główną nazwę grupy z surowego tekstu:
 * - usuwa nawiasy
 * - ucina zdanie po pierwszej ". "
 * - usuwa końcowe przyrostki
 */
function extractPrimaryName(raw: string): string {
  let s = stripParens(raw).trim();

  // Utnij po pierwszym ". " (nowe zdanie z dopiskiem)
  const dotSpaceIdx = s.indexOf('. ');
  if (dotSpaceIdx !== -1) {
    s = s.substring(0, dotSpaceIdx).trim();
  }

  // Usuń końcową kropkę
  s = s.replace(/\.$/, '').trim();

  // Usuń przyrostki opisowe
  s = s.replace(/,?\s*(even in|set aside|plus add|in solo)\b.*/i, '').trim();

  return s;
}

/**
 * Usuwa przedimek "The" zarówno z początku ("The X") jak i końca ("X, The"),
 * umożliwiając porównanie grup z odwróconą kolejnością słów.
 */
function removeThe(s: string): string {
  return s.replace(/^the\s+/i, '').replace(/,?\s*the\s*$/i, '').trim();
}

/**
 * Dopasowuje docelową nazwę `target` do jednej z grup w `pool`.
 * Kolejność dopasowania:
 * 1. Dokładne (case-insensitive)
 * 2. Znormalizowane
 * 3. Target zawiera nazwę grupy
 * 4. Nazwa grupy zawiera target
 * 5. Porównanie bez "The" (np. "The Mighty" ↔ "Mighty, The")
 * 6. Akronim (np. "MLF" ↔ "Mutant Liberation Front")
 */
function matchGroup<T extends { name: string; id: string }>(
  target: string,
  pool: T[]
): T | undefined {
  if (!target || pool.length === 0) return undefined;

  const tLower = target.toLowerCase();
  const tNorm = norm(target);

  // 1. Dokładne dopasowanie (case-insensitive)
  const exact = pool.find(g => g.name.toLowerCase() === tLower);
  if (exact) return exact;

  // 2. Znormalizowane dopasowanie
  const normExact = pool.find(g => norm(g.name) === tNorm);
  if (normExact) return normExact;

  // 3. Target zawiera nazwę grupy (target jest dłuższy, np. z dopiskiem)
  if (tNorm.length >= 4) {
    const contained = pool.find(g => {
      const gn = norm(g.name);
      return gn.length >= 4 && tNorm.includes(gn);
    });
    if (contained) return contained;
  }

  // 4. Nazwa grupy zawiera target (target jest skrótem)
  if (tNorm.length >= 4) {
    const reverse = pool.find(g => {
      const gn = norm(g.name);
      return gn.length >= 4 && gn.includes(tNorm);
    });
    if (reverse) return reverse;
  }

  // 5. Porównanie bez przedimka "The" ("The Mighty" ↔ "Mighty, The")
  const tNoThe = norm(removeThe(target));
  if (tNoThe.length >= 4) {
    const noTheMatch = pool.find(g => norm(removeThe(g.name)) === tNoThe);
    if (noTheMatch) return noTheMatch;
  }

  // 6. Dopasowanie akronimu ("MLF" → "Mutant Liberation Front")
  const trimmedTarget = target.trim();
  if (trimmedTarget.length >= 2 && trimmedTarget.length <= 6 && /^[A-Z]+$/.test(trimmedTarget)) {
    const acronymMatch = pool.find(g => {
      const initials = g.name
        .split(/[\s,.-]+/)
        .filter(Boolean)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');
      return initials === trimmedTarget;
    });
    if (acronymMatch) return acronymMatch;
  }

  return undefined;
}

// ── Główna funkcja ────────────────────────────────────────────────────────────

export function resolveAlwaysLeads(
  alwaysLeads: string,
  allVillains: VillainGroup[],
  allHenchmen: Henchman[]
): AlwaysLeadsResolution {
  if (!alwaysLeads) {
    return { isUnconstrained: true };
  }

  const raw = alwaysLeads.trim();

  // ── "Any Villain Group" (bez ograniczeń) ────────────────────────────────────
  if (/^any villain group\.?$/i.test(raw)) {
    return { isUnconstrained: true };
  }
  // "Any Villain Group, plus add..." – specjalna reguła gry, brak ograniczeń dla randomizera
  if (/^any villain group,/i.test(raw)) {
    return { isUnconstrained: true };
  }

  // ── "Any "X" or "Y" Villain Group" – wzorzec ze słowem kluczowym ─────────────
  const anyKeywordMatch = raw.match(/^any\s+(.+?)\s+villain\s+group/i);
  if (anyKeywordMatch) {
    const keywordPart = anyKeywordMatch[1];
    // Wyciągnij słowa w cudzysłowach typograficznych U+201C…U+201C
    // np. "Hydra", "Brotherhood" (char code 8220)
    const quoted = [...keywordPart.matchAll(/\u201c([^\u201c]+)\u201c/g)].map(m => m[1].trim());
    // Fallback: cały fragment bez "or" jeśli brak cudzysłowów
    const keywords = quoted.length > 0 ? quoted : [keywordPart.replace(/\bor\b/gi, '').trim()];
    return { villainKeywords: keywords.filter(Boolean), isUnconstrained: false };
  }

  // ── Wielokrotne grupy: "A and any B Henchmen Group" ──────────────────────────
  if (/ and /i.test(raw)) {
    const andIdx = raw.search(/ and /i);
    const primaryPart = extractPrimaryName(raw.substring(0, andIdx).trim());
    const secondaryPart = raw.substring(andIdx + 5).trim();

    // Próba dopasowania pierwszej części jako villain
    const forcedVillain = matchGroup(primaryPart, allVillains);

    // Wyciągnij słowo kluczowe dla henchmana z drugiej części
    // np. "any Sentinel Henchmen Group." → "Sentinel"
    //     "a Shi'ar Henchmen Group."    → "Shi'ar"
    let additionalHenchmanKeyword: string | undefined;
    const henchKwMatch = secondaryPart.match(/(?:any\s+|a\s+)?(.+?)\s+henchm(?:en|an)\s+group/i);
    if (henchKwMatch) {
      additionalHenchmanKeyword = henchKwMatch[1].trim();
    }

    if (forcedVillain || additionalHenchmanKeyword) {
      return { forcedVillain, additionalHenchmanKeyword, isUnconstrained: false };
    }
  }

  // ── Standardowe dopasowanie: wyciągnij główną nazwę i szukaj w puli ──────────
  const primaryName = extractPrimaryName(raw);

  // Najpierw próba villain (większość przypadków)
  const forcedVillain = matchGroup(primaryName, allVillains);
  if (forcedVillain) {
    return { forcedVillain, isUnconstrained: false };
  }

  // Następnie próba henchman
  const forcedHenchman = matchGroup(primaryName, allHenchmen);
  if (forcedHenchman) {
    return { forcedHenchman, isUnconstrained: false };
  }

  // Brak dopasowania → traktuj jako brak ograniczeń (graceful fallback)
  return { isUnconstrained: true };
}



