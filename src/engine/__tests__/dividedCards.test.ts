/**
 * Punkt 6 — Divided Cards: weryfikacja kalibracji trudności Abomination/Berserk
 *
 * Kluczowe zasady gry:
 *  - [Abomination]: villain dostaje +[Attack] równy najwyższemu *printed* [Attack]
 *    z dowolnej karty w HQ.
 *  - [Berserk]:  villain zmusza gracza do odkrycia wierzchniej karty talii;
 *    jej *printed* [Attack] decyduje o sukcesie ataku.
 *  - Divided Card w HQ / Berserked: printed [Attack] = SUMA ataków obu stron karty,
 *    a nie tylko strony aktualnie widocznej.
 *
 * Hipoteza (MECHANIC_CONFLICTS.md §6):
 *   Gdyby silnik liczył atak tylko jednej strony karty, villainowie z Abomination/Berserk
 *   byliby błędnie kalibrowanir. Weryfikujemy, czy w praktyce ta luka w ogóle istnieje.
 *
 * Wynik analizy (szczegóły w MECHANIC_CONFLICTS.md §6):
 *   W całej bazie danych tylko 2 bohaterów ma mechnikę Divided Card (Cloak & Dagger,
 *   Rocket & Groot). Dla każdej pary kart (ta sama wartość cost w obrębie Divided Card
 *   hero) jedna strona zawsze ma atak 0 lub bliski 0, więc:
 *     sum(obu_stron) == max(pojedyncza_strona)
 *   → brak faktycznej rozbieżności między „licz jedną stronę" a „licz obie strony".
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { Hero, HeroCard } from '@/types/cards.ts';

const db = cardsDb as unknown as import('@/types/cards.ts').CardsDatabase;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parsuje wartość ataku (string) do liczby. "2+" → 2, "0" → 0, "" → 0 */
function parseAttack(attack: string | undefined | null): number {
  if (!attack) return 0;
  return parseInt(String(attack).replace(/[^0-9]/g, ''), 10) || 0;
}

/** Zwraca grupy kart o tym samym koszcie — potencjalne pary Divided Card */
function cardPairsByCost(hero: Hero): HeroCard[][] {
  const byCost = new Map<number, HeroCard[]>();
  for (const c of hero.cards) {
    const group = byCost.get(c.cost) ?? [];
    group.push(c);
    byCost.set(c.cost, group);
  }
  // Tylko cost-grupy z dokładnie 2 kartami to pary
  return [...byCost.values()].filter(g => g.length === 2);
}

// ---------------------------------------------------------------------------
// Testy
// ---------------------------------------------------------------------------

describe('Divided Cards — kalibracja Abomination/Berserk', () => {
  const dividedHeroes = db.heroes.filter(h =>
    h.keywords.includes('Divided Card'),
  );

  it('w bazie danych są dokładnie 2 bohaterowie z mechaniką Divided Card', () => {
    expect(dividedHeroes.map(h => h.name).sort()).toEqual([
      'Cloak & Dagger',
      'Rocket & Groot',
    ]);
  });

  it('dla każdej pary kart (ten sam koszt) wewnątrz Divided Card hero — suma ataków ≤ maks ataku jednej strony × 2', () => {
    // Właściwy warunek: suma obu stron = max jednej strony (bo druga strona ma 0 lub bardzo mało)
    // → nie istnieje para, gdzie obie strony mają wysoki atak jednocześnie
    for (const hero of dividedHeroes) {
      const pairs = cardPairsByCost(hero);
      for (const [a, b] of pairs) {
        const attackA = parseAttack(a.attack);
        const attackB = parseAttack(b.attack);
        const sumAttacks = attackA + attackB;
        const maxSingleSide = Math.max(attackA, attackB);
        // Suma powinna być równa maksimum jednej strony (bo druga ma 0)
        // Dopuszczamy sumę = max (0+x=x), ale NIE x+y > max dla x,y > 0 i x+y > max
        expect(sumAttacks).toEqual(maxSingleSide);
      }
    }
  });

  it('sumaryczny „printed Attack" Divided Card nie zwiększa realnego progu Abomination ponad max pojedynczej strony', () => {
    for (const hero of dividedHeroes) {
      const pairs = cardPairsByCost(hero);
      for (const [a, b] of pairs) {
        const attackA = parseAttack(a.attack);
        const attackB = parseAttack(b.attack);
        // suma obu stron = wynik zasady „printed Attack Divided Card"
        const dividedRuleAttack = attackA + attackB;
        // maksymalna wartość widziana przez silnik, gdyby patrzył tylko na jedną stronę
        const naiveMaxAttack = Math.max(attackA, attackB);
        expect(dividedRuleAttack).toEqual(naiveMaxAttack);
      }
    }
  });

  it('villain groups z Abomination mają multi-class w countersNeeded', () => {
    const abomGroups = db.villains.filter(v =>
      v.cards.some(c => /\[Abomination\]/i.test(c.abilities)),
    );
    expect(abomGroups.length).toBeGreaterThan(0);
    for (const group of abomGroups) {
      expect(group.countersNeeded).toContain('multi-class');
    }
  });

  it('villain groups z Berserk mają countersNeeded (nie są puste)', () => {
    const berserkGroups = db.villains.filter(v =>
      v.cards.some(c => /\[Berserk\]/i.test(c.abilities)),
    );
    expect(berserkGroups.length).toBeGreaterThan(0);
    for (const group of berserkGroups) {
      expect(group.countersNeeded.length).toBeGreaterThan(0);
    }
  });

  it('henchmen z Abomination lub Berserk mają multi-class w countersNeeded', () => {
    const abomHench = db.henchmen.filter(h =>
      h.cards.some(c => /\[Abomination\]|\[Berserk\]/i.test(c.abilities)),
    );
    // Jeśli istnieją, powinny mieć odpowiedni tag
    for (const h of abomHench) {
      expect(h.countersNeeded).toContain('multi-class');
    }
  });
});

