/**
 * Oblicza mnożnik wagi dla bohatera na podstawie jego siły (blended)
 * względem poziomu zagrożenia (threatScore).
 *
 * Logika:
 *   normalizedThreat = threatScore / 2      → skala 1–5 (jak hero power)
 *   diff = normalizedThreat - heroBlendedPower
 *
 *   diff > 0  → zagrożenie silniejsze niż bohater → premiuj mocniejszych bohaterów
 *   diff < 0  → bohater mocniejszy niż zagrożenie → lekko premiuj słabszych (challenge)
 *   diff ≈ 0  → neutralnie (mnożnik ~1.0)
 *
 * Mnożnik jest clampowany do [0.4, 2.5].
 *
 * @param heroBlendedPower - blendedStrength bohatera (1–5)
 * @param threatScore      - computeThreatScore() wynik (2–10)
 */
export function powerBiasMultiplier(
  heroBlendedPower: number,
  threatScore: number
): number {
  const normalizedThreat = threatScore / 2; // 1–5
  const diff = normalizedThreat - heroBlendedPower; // [-4, +4]

  // Liniowe mapowanie: diff=0 → 1.0, diff=+4 → 1.5, diff=-4 → 0.5
  // Zakres jest nieduży, by nie zdominować wyrównywania częstotliwości
  const multiplier = 1.0 + diff * 0.125;
  return Math.max(0.4, Math.min(2.5, multiplier));
}

/**
 * Oblicza balanceGap po wyborze drużyny bohaterów.
 *
 * balanceGap > 0 → zagrożenie silniejsze niż drużyna  (trudna rozgrywka)
 * balanceGap < 0 → drużyna silniejsza niż zagrożenie  (łatwa rozgrywka)
 * balanceGap ≈ 0 → idealny balans
 *
 * @param heroBlendedPowers - tablica blendedStrength wybranych bohaterów
 * @param threatScore       - computeThreatScore() wynik (2–10)
 */
export function computeBalanceGap(
  heroBlendedPowers: number[],
  threatScore: number
): number {
  if (heroBlendedPowers.length === 0) return 0;
  const avgHeroPower = heroBlendedPowers.reduce((a, b) => a + b, 0) / heroBlendedPowers.length;
  const heroTeamScore = avgHeroPower * 2; // znormalizowany do skali 2–10
  return +(threatScore - heroTeamScore).toFixed(2);
}

