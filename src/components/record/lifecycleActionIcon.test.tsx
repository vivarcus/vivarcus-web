import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lifecycleActionIcon } from "./lifecycleActionIcon";

describe("lifecycleActionIcon", () => {
  it("returns undefined for unmatched action names", () => {
    expect(lifecycleActionIcon("submit__c", "Submit")).toBeUndefined();
    expect(lifecycleActionIcon("generate_payable_items__c")).toBeUndefined();
  });

  it("matches common lifecycle transitions by name or label", () => {
    expect(lifecycleActionIcon("plan_study_useraction__c", "Plan Study")).toBeDefined();
    expect(lifecycleActionIcon("complete__v", "Complete")).toBeDefined();
    expect(lifecycleActionIcon("archive__v", "Archive Study")).toBeDefined();
    expect(lifecycleActionIcon("cancel__v", "Cancel")).toBeDefined();
  });

  it("matches via the human label when the api name is opaque", () => {
    // Object-specific actions often carry opaque api names; the label is the
    // reliable signal for which glyph to show.
    expect(lifecycleActionIcon("osf000000000123__c", "Pause Enrollment")).toBeDefined();
  });

  it("renders a concrete icon element (not just truthy)", () => {
    const { container } = render(<span>{lifecycleActionIcon("plan_study_useraction__c")}</span>);
    expect(container.querySelector(".anticon")).not.toBeNull();
  });
});
