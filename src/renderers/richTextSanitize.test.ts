import { describe, expect, it } from "vitest";
import { isRichTextEmpty, richTextPlainText, sanitizeRichTextHtml } from "./richTextSanitize";

describe("sanitizeRichTextHtml", () => {
  it("strips script tags and unsafe attributes", () => {
    const dirty = '<p onclick="alert(1)">Hi<script>alert(1)</script></p>';
    expect(sanitizeRichTextHtml(dirty)).toBe("<p>Hi</p>");
  });

  it("keeps basic formatting tags", () => {
    const html = "<p><strong>Bold</strong> <em>italic</em></p><ul><li>one</li></ul>";
    expect(sanitizeRichTextHtml(html)).toBe(html);
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeRichTextHtml("   ")).toBe("");
  });
});

describe("richTextPlainText", () => {
  it("extracts visible text from html", () => {
    expect(richTextPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
});

describe("isRichTextEmpty", () => {
  it("treats empty paragraphs as empty", () => {
    expect(isRichTextEmpty("<p><br></p>")).toBe(true);
    expect(isRichTextEmpty("<p>text</p>")).toBe(false);
  });
});
