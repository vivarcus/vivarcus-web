import { describe, expect, it } from "vitest";
import {
  joinSelectedText,
  relDraftToPdf,
  resolveTextSelection,
  sortWordsReadingOrder,
  wordsIntersectingRect,
} from "./annotateWordSelect";

const words = [
  { text: "Hello", x_min: 10, y_min: 10, x_max: 40, y_max: 20 },
  { text: "world", x_min: 45, y_min: 10, x_max: 80, y_max: 20 },
  { text: "Next", x_min: 10, y_min: 30, x_max: 35, y_max: 40 },
];

describe("annotateWordSelect", () => {
  it("converts relative draft to PDF points", () => {
    expect(relDraftToPdf({ x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4 }, 100, 200)).toEqual({
      x_min: 10,
      y_min: 40,
      x_max: 30,
      y_max: 80,
    });
  });

  it("selects words by center-in-rect", () => {
    const hit = wordsIntersectingRect(words, { x_min: 5, y_min: 5, x_max: 85, y_max: 25 });
    expect(hit.map((w) => w.text)).toEqual(["Hello", "world"]);
  });

  it("joins selected text in reading order", () => {
    expect(joinSelectedText(sortWordsReadingOrder([words[2], words[1], words[0]]))).toBe(
      "Hello world Next",
    );
  });

  it("snaps selection to word union when hits exist", () => {
    const resolved = resolveTextSelection(
      words,
      { x0: 0.05, y0: 0.05, x1: 0.9, y1: 0.22 },
      100,
      100,
    );
    expect(resolved.fromWords).toBe(true);
    expect(resolved.text).toBe("Hello world");
    expect(resolved.box).toEqual({ x_min: 10, y_min: 10, x_max: 80, y_max: 20 });
  });

  it("falls back to free-draw when no words hit", () => {
    const resolved = resolveTextSelection(
      words,
      { x0: 0.9, y0: 0.9, x1: 0.95, y1: 0.95 },
      100,
      100,
    );
    expect(resolved.fromWords).toBe(false);
    expect(resolved.text).toBe("");
    expect(resolved.box.x_min).toBeCloseTo(90);
  });
});
