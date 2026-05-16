import { describe, expect, it } from "vitest";
import { contestSlug } from "./constants";

describe("contestSlug", () => {
  it("formats a typical weekly_pick_5 contest", () => {
    expect(
      contestSlug({ format: "weekly_pick_5", periodStart: "2026-05-18" }),
    ).toBe("weekly-pick-5-18-may-26");
  });

  it("pads single-digit days to two digits", () => {
    expect(
      contestSlug({ format: "weekly_pick_5", periodStart: "2026-01-05" }),
    ).toBe("weekly-pick-5-05-jan-26");
  });

  it("handles december (last month index)", () => {
    expect(
      contestSlug({ format: "weekly_pick_5", periodStart: "2026-12-28" }),
    ).toBe("weekly-pick-5-28-dec-26");
  });

  it("preserves a different format key with underscores", () => {
    expect(
      contestSlug({ format: "daily_pick_5", periodStart: "2026-05-18" }),
    ).toBe("daily-pick-5-18-may-26");
  });
});
