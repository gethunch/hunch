// Pure rating math. Imports only types. No DB, no I/O, no side effects.
// This file is the only place the rating algorithm lives — every caller goes
// through computeRatingDelta(). Tests live next door in index.test.ts.

export const RATING_DEFAULT = 1500;
export const RATING_MAX_DELTA = 50;

// Piecewise linear curve from rankFraction to base delta.
// rankFraction = rank / contestSize, where rank starts at 1 (best).
//   0 → +50 (best),  0.5 → 0 (median),  1 → -50 (worst).
const CURVE: ReadonlyArray<readonly [rankFraction: number, delta: number]> = [
  [0.01, +50],
  [0.05, +35],
  [0.10, +25],
  [0.25, +12],
  [0.50, 0],
  [0.75, -12],
  [0.90, -25],
  [0.95, -35],
  [0.99, -50],
];

function baseDelta(rankFraction: number): number {
  if (rankFraction <= CURVE[0][0]) return CURVE[0][1];
  const last = CURVE[CURVE.length - 1];
  if (rankFraction >= last[0]) return last[1];
  for (let i = 1; i < CURVE.length; i++) {
    const [x0, y0] = CURVE[i - 1];
    const [x1, y1] = CURVE[i];
    if (rankFraction <= x1) {
      const t = (rankFraction - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

/**
 * Compute the rating delta for one entry in a contest.
 *
 * @param currentRating - rating before this contest
 * @param rankFraction  - rank / contestSize. 0 = best, 1 = worst. e.g. rank
 *                        1 of 100 → 0.01 → top 1% → +50 base.
 * @param contestSize   - total number of entries in the contest
 *
 * Algorithm (locked spec, /docs/SPEC.md):
 *   1. Piecewise linear interpolation rankFraction → base delta in [-50, +50].
 *   2. contestSize < 20 → multiply base by 0.5 (low-confidence signal).
 *   3. Asymmetric pull-to-mean:
 *      - gaining: gain_factor = max(0.2, 1 - (rating - 1500) / 1000)
 *      - losing:  loss_factor = max(0.2, 1 - (1500 - rating) / 1000)
 *   4. Clamp to ±50.
 *   5. Round to integer (Math.round; ties toward +∞).
 */
export function computeRatingDelta(
  currentRating: number,
  rankFraction: number,
  contestSize: number,
): number {
  let delta = baseDelta(rankFraction);

  if (contestSize < 20) {
    delta *= 0.5;
  }

  if (delta > 0) {
    const gainFactor = Math.max(0.2, 1 - (currentRating - 1500) / 1000);
    delta *= gainFactor;
  } else if (delta < 0) {
    const lossFactor = Math.max(0.2, 1 - (1500 - currentRating) / 1000);
    delta *= lossFactor;
  }

  if (delta > RATING_MAX_DELTA) delta = RATING_MAX_DELTA;
  if (delta < -RATING_MAX_DELTA) delta = -RATING_MAX_DELTA;
  return Math.round(delta);
}
