import { computeStrength } from './computeStrength';

/**
 * Ilość rozgrywek potrzebna do pełnego zaufania historii (confidence = 1.0).
 * Przy 0 grach liczy się wyłącznie wartość statyczna z JSON.
 * Przy 10+ grach liczy się wyłącznie historia wygranych/przegranych.
 */
const CONFIDENCE_THRESHOLD = 10;

/**
 * Oblicza siłę / trudność jako ważoną mieszankę wartości statycznej (z JSON)
 * i dynamicznej (z historii rozgrywek).
 *
 * Formuła:
 *   confidence = min(1, playCount / CONFIDENCE_THRESHOLD)
 *   blended    = staticVal * (1 - confidence) + dynamicVal * confidence
 *
 * Opcjonalny epicBonus (+1 dla trybu Epic masterminda) jest dodawany
 * po mieszaniu i clampowany do przedziału 1–5.
 *
 * @param staticVal  - wartość z pliku JSON (powerLevel / difficulty), 1–5
 * @param playCount  - łączna liczba rozgrywek danym elementem
 * @param wins       - liczba wygranych (interpretacja zależy od kontekstu)
 * @param epicBonus  - opcjonalne +1 dla trybu Epic (domyślnie 0)
 */
export function blendedStrength(
  staticVal: 1 | 2 | 3 | 4 | 5,
  playCount: number,
  wins: number,
  epicBonus: number = 0
): 1 | 2 | 3 | 4 | 5 {
  const confidence = Math.min(1, playCount / CONFIDENCE_THRESHOLD);
  const dynamicVal = computeStrength(playCount, wins);
  const raw = staticVal * (1 - confidence) + dynamicVal * confidence + epicBonus;
  return Math.max(1, Math.min(5, Math.round(raw))) as 1 | 2 | 3 | 4 | 5;
}

