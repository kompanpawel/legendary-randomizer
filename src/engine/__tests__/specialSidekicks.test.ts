/**
 * Testy kroku 4 z MECHANIC_CONFLICTS.md:
 * „Special Sidekicks z różnych setów (Secret Wars / Civil War / Messiah Complex)"
 *
 * Weryfikuje wyłącznie adnotacje danych — nota setupowa w silniku NIE jest potrzebna,
 * bo gracze fizycznie scalają stosy Sidekick z własnej inicjatywy, a zawartość Sidekick Stack
 * nie wpływa na obliczaną trudność rozgrywki (jest poza modelem silnika).
 *
 * Sprawdza że:
 * 1. Dokładnie 3 expansions mają hasSpecialSidekicks: true (exp IDs: 10, 13, 31).
 * 2. Żaden inny dodatek nie ma tej flagi.
 */

import { describe, it, expect } from 'vitest';
import cardsDb from '@/assets/cards.json';
import type { CardsDatabase } from '@/types/cards';

const db = cardsDb as CardsDatabase;

describe('cards.json – hasSpecialSidekicks annotation', () => {
  it('exactly 3 expansions are marked hasSpecialSidekicks: true', () => {
    const marked = db.expansions.filter(e => e.hasSpecialSidekicks);
    expect(marked.map(e => e.id).sort((a, b) => a - b)).toEqual([10, 13, 31]);
  });

  it('marked expansions are Secret Wars Vol.1, Civil War, Messiah Complex', () => {
    const marked = db.expansions.filter(e => e.hasSpecialSidekicks);
    const names = marked.map(e => e.label).sort();
    expect(names).toContain('Civil War');
    expect(names).toContain('Secret Wars, Volume 1');
    expect(names).toContain('Messiah Complex');
  });

  it('no other expansion has hasSpecialSidekicks set to true', () => {
    const wronglyMarked = db.expansions.filter(e => e.hasSpecialSidekicks && ![10, 13, 31].includes(e.id));
    expect(wronglyMarked).toHaveLength(0);
  });
});



