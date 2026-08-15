import { describe, expect, it } from "vitest";
import { matchPageQueryHighlightBoxes } from "./matchPageQuery";

describe("matchPageQueryHighlightBoxes", () => {
  const words = [
    { text: "Hello", x_min: 100, y_min: 127.64, x_max: 145.56, y_max: 146.14 },
    { text: "NVC-301", x_min: 151.12, y_min: 127.64, x_max: 233.36, y_max: 146.14 },
    { text: "dose", x_min: 238.92, y_min: 127.64, x_max: 282.28, y_max: 146.14 },
  ];

  it("matches a single token and returns CSS percentage box", () => {
    const boxes = matchPageQueryHighlightBoxes(words, 595, 842, "NVC-301");
    expect(boxes).toHaveLength(1);
    expect(boxes[0].left_pct).toBeGreaterThan(24);
    expect(boxes[0].left_pct).toBeLessThan(28);
    expect(boxes[0].top_pct).toBeGreaterThan(14);
    expect(boxes[0].top_pct).toBeLessThan(18);
  });

  it("tolerates extract spaces inside the query", () => {
    const dateWords = [
      { text: "2026-07-28", x_min: 400, y_min: 700, x_max: 480, y_max: 720 },
    ];
    expect(matchPageQueryHighlightBoxes(dateWords, 595, 842, "2026-07- 28")).toHaveLength(1);
    expect(matchPageQueryHighlightBoxes(dateWords, 595, 842, "2026-07-28")).toHaveLength(1);
  });

  it("returns empty when query misses", () => {
    expect(matchPageQueryHighlightBoxes(words, 595, 842, "missing")).toEqual([]);
  });
});
