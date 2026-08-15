import { describe, expect, it } from "vitest";
import { formatDocumentVersionLabel } from "./documentVersion";

describe("formatDocumentVersionLabel", () => {
  it("formats major.minor as Veeva-style suffix", () => {
    expect(formatDocumentVersionLabel(1, 1)).toBe("(v1.1)");
    expect(formatDocumentVersionLabel(0, 1)).toBe("(v0.1)");
  });
});
