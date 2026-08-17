/**
 * Oblicza dynamiczną siłę (1–5) na podstawie statystyk rozgrywek.
 *
 * Formuła:
 *   winRate = wins / playCount  (0.0–1.0)
 *   strength = clamp(1, 5, round(1 + winRate * 4))
 *
 * Przykłady:
 *   0%  wygranych → 1 (bardzo słaby / bardzo łatwy)
 *   25% wygranych → 2
 *   50% wygranych → 3 (neutralny) ← wartość domyślna dla nowych kart
 *   75% wygranych → 4
 *  100% wygranych → 5 (bardzo silny / bardzo trudny)
 *
 * Dla bohaterów: "wygrana" = bohater był w drużynie, która wygrała.
 * Dla mastermindów/schematów: "wygrana" = mastermind/schemat pokonał graczy (gracze przegrali).
 */
export function computeStrength(
  playCount: number,
  wins: number
): 1 | 2 | 3 | 4 | 5 {
  if (playCount === 0) return 3; // brak danych – wartość neutralna

  const winRate = wins / playCount;
  const raw = 1 + winRate * 4; // zakres 1.0–5.0
  const clamped = Math.max(1, Math.min(5, Math.round(raw)));
  return clamped as 1 | 2 | 3 | 4 | 5;
}

