import { describe, expect, it } from "vitest";
import { displayText, displayTextKey } from "./displayText";

describe("displayText", () => {
  it("reads text from DisplayText object", () => {
    expect(displayText({ text: "Studies", key: "component:tab.studies__v:label" })).toBe("Studies");
  });

  it("supports legacy plain strings", () => {
    expect(displayText("Legacy")).toBe("Legacy");
  });

  it("exposes resource key", () => {
    expect(displayTextKey({ text: "A", key: "system:view.all" })).toBe("system:view.all");
  });
});
