import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { documentActionIcon, recordActionIcon } from "./recordActionIcon";

describe("documentActionIcon", () => {
  it("maps document SDK actions to icons", () => {
    expect(documentActionIcon("create_draft__v")).toBeDefined();
    expect(documentActionIcon("checkout__v")).toBeDefined();
    expect(documentActionIcon("download_source__v")).toBeDefined();
    expect(documentActionIcon("unknown__v")).toBeUndefined();
  });

  it("renders a concrete icon element", () => {
    const { container } = render(<span>{documentActionIcon("create_draft__v")}</span>);
    expect(container.querySelector(".anticon")).not.toBeNull();
  });
});

describe("recordActionIcon", () => {
  it("prefers chrome kinds and document glyphs over lifecycle heuristics", () => {
    expect(recordActionIcon("create_draft__v")).toBeDefined();
    expect(recordActionIcon("delete", undefined, "delete")).toBeDefined();
    expect(recordActionIcon("archive__v", "Archive")).toBeDefined();
    expect(recordActionIcon("submit__c", "Submit")).toBeUndefined();
  });
});
