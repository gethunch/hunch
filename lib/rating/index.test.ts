import { describe, expect, it } from "vitest";
import { computeRatingDelta } from "./index";

describe("computeRatingDelta — base curve at rating 1500, large contest", () => {
  const N = 1000;

  it("top 1% → +50", () => {
    expect(computeRatingDelta(1500, 0.005, N)).toBe(50);
    expect(computeRatingDelta(1500, 0.01, N)).toBe(50);
  });

  it("top 5% → +35", () => {
    expect(computeRatingDelta(1500, 0.05, N)).toBe(35);
  });

  it("top 10% → +25", () => {
    expect(computeRatingDelta(1500, 0.1, N)).toBe(25);
  });

  it("top 25% → +12", () => {
    expect(computeRatingDelta(1500, 0.25, N)).toBe(12);
  });

  it("median (50%) → 0", () => {
    expect(computeRatingDelta(1500, 0.5, N)).toBe(0);
  });

  it("bottom 25% → -12", () => {
    expect(computeRatingDelta(1500, 0.75, N)).toBe(-12);
  });

  it("bottom 10% → -25", () => {
    expect(computeRatingDelta(1500, 0.9, N)).toBe(-25);
  });

  it("bottom 5% → -35", () => {
    expect(computeRatingDelta(1500, 0.95, N)).toBe(-35);
  });

  it("bottom 1% → -50", () => {
    expect(computeRatingDelta(1500, 0.99, N)).toBe(-50);
    expect(computeRatingDelta(1500, 0.999, N)).toBe(-50);
    expect(computeRatingDelta(1500, 1.0, N)).toBe(-50);
  });

  it("clamps at the top of the curve", () => {
    expect(computeRatingDelta(1500, 0, N)).toBe(50);
    expect(computeRatingDelta(1500, -0.5, N)).toBe(50);
  });

  it("linear interpolation between corners", () => {
    // Between top 1% (+50) and top 5% (+35), halfway at 0.03:
    // 50 + (35-50) * (0.03-0.01) / (0.05-0.01) = 50 - 7.5 = 42.5 → rounds to 43
    expect(computeRatingDelta(1500, 0.03, N)).toBe(43);
    // Between top 25% (+12) and median (0), at 0.40:
    // 12 + (0-12) * (0.40-0.25) / (0.50-0.25) = 12 - 7.2 = 4.8 → 5
    expect(computeRatingDelta(1500, 0.4, N)).toBe(5);
  });
});

describe("contest size factor", () => {
  it("contestSize >= 20 → full delta", () => {
    expect(computeRatingDelta(1500, 0.01, 20)).toBe(50);
    expect(computeRatingDelta(1500, 0.99, 100)).toBe(-50);
  });

  it("contestSize < 20 → 0.5x delta", () => {
    expect(computeRatingDelta(1500, 0.01, 19)).toBe(25);
    expect(computeRatingDelta(1500, 0.01, 5)).toBe(25);
    expect(computeRatingDelta(1500, 0.99, 5)).toBe(-25);
  });

  it("contestSize 1 is degenerate but still defined (rankFraction=1.0)", () => {
    // rank=1, size=1 → rankFraction=1.0 → bottom 1% → -50 → size factor → -25
    expect(computeRatingDelta(1500, 1.0, 1)).toBe(-25);
  });
});

describe("gain factor (high ratings gain less)", () => {
  it("rating 1500 — full gain", () => {
    expect(computeRatingDelta(1500, 0.01, 100)).toBe(50);
  });

  it("rating 2000 — gain × 0.5", () => {
    expect(computeRatingDelta(2000, 0.01, 100)).toBe(25);
  });

  it("rating 2500 — gain capped at 0.2 floor", () => {
    expect(computeRatingDelta(2500, 0.01, 100)).toBe(10);
  });

  it("rating 3000 — still gain × 0.2", () => {
    expect(computeRatingDelta(3000, 0.01, 100)).toBe(10);
  });

  it("rating below 1500 — gain factor > 1, but still capped by ±50 envelope", () => {
    // rating=1000: gain_factor = max(0.2, 1 - (1000-1500)/1000) = 1.5
    // 50 * 1.5 = 75 → clamp to 50
    expect(computeRatingDelta(1000, 0.01, 100)).toBe(50);
  });
});

describe("loss factor (low ratings lose less)", () => {
  it("rating 1500 — full loss", () => {
    expect(computeRatingDelta(1500, 0.99, 100)).toBe(-50);
  });

  it("rating 1000 — loss × 0.5", () => {
    expect(computeRatingDelta(1000, 0.99, 100)).toBe(-25);
  });

  it("rating 800 — loss × 0.3", () => {
    // loss_factor = max(0.2, 1 - (1500-800)/1000) = 0.3
    expect(computeRatingDelta(800, 0.99, 100)).toBe(-15);
  });

  it("rating 500 — loss capped at 0.2 floor", () => {
    expect(computeRatingDelta(500, 0.99, 100)).toBe(-10);
  });

  it("rating above 1500 — loss factor > 1, ±50 envelope still applies", () => {
    // rating=2200: loss_factor = max(0.2, 1 - (1500-2200)/1000) = 1.7
    // -50 * 1.7 = -85 → clamp to -50
    expect(computeRatingDelta(2200, 0.99, 100)).toBe(-50);
  });
});

describe("combined factors", () => {
  it("high rating + small contest + top finish — both factors stack", () => {
    // base 50, size 0.5 = 25, gain 0.2 = 5
    expect(computeRatingDelta(2500, 0.01, 10)).toBe(5);
  });

  it("low rating + small contest + bottom finish — bounded loss", () => {
    // base -50, size 0.5 = -25, loss 0.3 = -7.5
    // FP: 1 - 0.7 is 0.30000000000000004, so this is actually
    // -7.500000000000001 → Math.round → -8. Documented quirk.
    expect(computeRatingDelta(800, 0.99, 10)).toBe(-8);
  });

  it("median always = 0 regardless of rating or contest size", () => {
    expect(computeRatingDelta(800, 0.5, 100)).toBe(0);
    expect(computeRatingDelta(2200, 0.5, 100)).toBe(0);
    expect(computeRatingDelta(1500, 0.5, 1000)).toBe(0);
    expect(computeRatingDelta(1500, 0.5, 5)).toBe(0);
  });
});

describe("output is always a clamped integer in [-50, +50]", () => {
  it("never exceeds ±50 across the parameter space", () => {
    for (const rating of [100, 500, 800, 1500, 2000, 2500, 3000]) {
      for (const rankFraction of [0, 0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99, 1.0]) {
        for (const size of [1, 5, 20, 100, 10_000]) {
          const d = computeRatingDelta(rating, rankFraction, size);
          expect(d, `r=${rating} f=${rankFraction} n=${size}`).toBeGreaterThanOrEqual(-50);
          expect(d).toBeLessThanOrEqual(50);
          expect(Number.isInteger(d)).toBe(true);
        }
      }
    }
  });
});
