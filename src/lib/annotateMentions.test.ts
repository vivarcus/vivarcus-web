import { describe, expect, it } from "vitest";
import { applyMention, findMentionQuery, normalizeMentionIds } from "./annotateMentions";

describe("annotateMentions", () => {
  it("detects @ query at caret", () => {
    expect(findMentionQuery("hi @al", 6)).toEqual({ query: "al", start: 3, end: 6 });
    expect(findMentionQuery("hi@al", 5)).toBeNull();
    expect(findMentionQuery("@bob more", 4)).toEqual({ query: "bob", start: 0, end: 4 });
    expect(findMentionQuery("@bob more", 9)).toBeNull();
  });

  it("applies mention replacement", () => {
    const next = applyMention("ping @al", 8, "Alice Smith");
    expect(next.text).toBe("ping @Alice Smith ");
    expect(next.caret).toBe("ping @Alice Smith ".length);
  });

  it("dedupes mention ids", () => {
    expect(normalizeMentionIds(["a", "a", " b ", ""])).toEqual(["a", "b"]);
  });
});
