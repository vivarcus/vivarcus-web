import { describe, expect, it } from "vitest";
import type { RecordPageModel } from "../api/types";
import { recordDisplayName, recordNameFromSections } from "./recordDisplayName";

const sections: RecordPageModel["sections"] = [
  {
    label: { text: "Study" },
    elements: [{ kind: "field", field_api_name: "study__clin", value: "ST-1" }],
  },
  {
    label: { text: "Details" },
    elements: [{ kind: "field", field_api_name: "name__v", value: "Collect ICF" }],
  },
];

describe("recordNameFromSections", () => {
  it("finds name__v outside the first section", () => {
    expect(recordNameFromSections(sections)).toBe("Collect ICF");
  });

  it("returns empty when name__v is absent", () => {
    expect(recordNameFromSections([sections[0]!])).toBe("");
  });
});

describe("recordDisplayName", () => {
  it("prefers server-provided record_name", () => {
    expect(
      recordDisplayName({ sections, record_name: "Server Name" }, "VGC000000000002"),
    ).toBe("Server Name");
  });

  it("falls back to record id", () => {
    expect(recordDisplayName({ sections: [sections[0]!] }, "VGC000000000002")).toBe(
      "VGC000000000002",
    );
  });
});
