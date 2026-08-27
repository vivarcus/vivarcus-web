import { describe, expect, it } from "vitest";
import { isViewExpectedDocumentsAction } from "./milestoneWorkspace";

describe("milestone workspace actions", () => {
  it("detects view expected documents", () => {
    expect(isViewExpectedDocumentsAction("view_expected_documents_useraction__c")).toBe(true);
    expect(isViewExpectedDocumentsAction("launch_document_report_useraction__c")).toBe(false);
  });
});
