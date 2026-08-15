import { describe, expect, it } from "vitest";
import { computeVisibleTabCount } from "./tabNavOverflow";

describe("computeVisibleTabCount", () => {
  it("shows all tabs when they fit", () => {
    expect(computeVisibleTabCount(500, 0, [80, 90, 100], 72)).toBe(3);
  });

  it("reserves space for the more button when tabs overflow", () => {
    expect(computeVisibleTabCount(300, 0, [80, 90, 100, 110], 72)).toBe(2);
  });

  it("accounts for a fixed prefix width", () => {
    expect(computeVisibleTabCount(300, 120, [80, 90, 100], 72)).toBe(1);
  });

  it("returns zero when only the more button fits", () => {
    expect(computeVisibleTabCount(100, 0, [80, 90], 72)).toBe(0);
  });
});
