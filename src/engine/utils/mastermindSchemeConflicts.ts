/**
 * Wykrywanie mechanicznych konfliktów między Mastermindem a Schematem, których
 * nie da się rozegrać zgodnie z zasadami.
 *
 * Konflikt #1 — Adapting Masterminds vs. schematy tasujące Mastermind Tactics do Villain Decku:
 * Adapting Mastermind (Sinister Six 2099, Alchemax Executives, Hydra High Council,
 * Hydra Super-Adaptoid) nie ma osobnej karty Mastermind — jego karty Tactics SĄ
 * Mastermindem (zawsze jedna z nich leży odkryta na wierzchu stosu, patrz `json/rules.json`,
 * reguła "Adapting Masterminds"). Schemat, który każe potasować wszystkie Mastermind Tactics
 * do Villain Decku (np. "Hidden Heart of Darkness"), zakłada istnienie osobnej karty
 * Mastermind, do której gracze wracają, gdy w mieście zabraknie Tactics. Adapting Mastermind
 * takiej karty nie ma, więc ta kombinacja jest niegrywalna.
 */

import type { Mastermind, Scheme } from '@/types/cards.ts';

/** Czy Mastermind jest "Adapting" — rozpoznawane po słowie kluczowym [Adapt] na jego kartach. */
export function isAdaptingMastermind(mastermind: Mastermind): boolean {
  return mastermind.cards.some(c => c.abilities.includes('[Adapt]'));
}

/** Czy Schemat każe potasować Mastermind Tactics do Villain Decku (jako Villainów). */
export function shufflesMastermindTacticsIntoVillainDeck(scheme: Scheme): boolean {
  return scheme.cards.some(c =>
    /shuffle the mastermind tactics into the villain deck/i.test(c.abilities)
  );
}

/** Czy dana para Mastermind + Schemat jest mechanicznie niegrywalna. */
export function isMastermindSchemeIncompatible(mastermind: Mastermind, scheme: Scheme): boolean {
  return isAdaptingMastermind(mastermind) && shufflesMastermindTacticsIntoVillainDeck(scheme);
}
