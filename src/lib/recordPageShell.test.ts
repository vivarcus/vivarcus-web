import { describe, expect, it } from "vitest";
import {
  buildRecordDetailHref,
  DOCUMENT_PAGE_API_NAME,
  documentPageShellQuery,
  OBJECT_RECORD_PAGE_API_NAME,
} from "./recordPageShell";

describe("buildRecordDetailHref", () => {
  it("includes page query when switching shells", () => {
    expect(
      buildRecordDetailHref("document__v", "doc-1", {
        tab: "documents__c",
        page: OBJECT_RECORD_PAGE_API_NAME,
      }),
    ).toBe(
      `/objects/document__v/records/doc-1?tab=documents__c&page=${OBJECT_RECORD_PAGE_API_NAME}`,
    );
  });
});

describe("documentPageShellQuery", () => {
  it("switches from document viewer to object record page", () => {
    expect(documentPageShellQuery(undefined, "documents__c", DOCUMENT_PAGE_API_NAME)).toEqual({
      layout: undefined,
      tab: "documents__c",
      page: OBJECT_RECORD_PAGE_API_NAME,
    });
  });

  it("switches from object record page back to document viewer", () => {
    expect(documentPageShellQuery("layout__c", "documents__c", OBJECT_RECORD_PAGE_API_NAME)).toEqual({
      layout: "layout__c",
      tab: "documents__c",
      page: DOCUMENT_PAGE_API_NAME,
    });
  });
});

describe("isBinderObjectType", () => {
  it("recognizes short and fully-qualified binder object types", async () => {
    const { isBinderObjectType } = await import("./recordPageShell");
    expect(isBinderObjectType("binder__v")).toBe(true);
    expect(isBinderObjectType("document__v.binder__v")).toBe(true);
    expect(isBinderObjectType("base__v")).toBe(false);
    expect(isBinderObjectType(undefined)).toBe(false);
  });
});
