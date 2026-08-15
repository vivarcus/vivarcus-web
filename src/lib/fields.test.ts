import { describe, expect, it } from "vitest";
import {
  formatReferenceLabel,
  isMultilineField,
  isObjectReferenceField,
  recordDetailHref,
} from "./fields";

describe("fields helpers", () => {
  it("detects multiline string fields", () => {
    expect(isMultilineField("description__v", "String")).toBe(true);
    expect(isMultilineField("name__v", "String")).toBe(false);
    expect(isMultilineField("notes__c", "String")).toBe(true);
  });

  it("detects object reference fields", () => {
    expect(isObjectReferenceField("Object", "study__vr", "study__v")).toBe(true);
    expect(isObjectReferenceField(undefined, "study__vr")).toBe(true);
    expect(isObjectReferenceField("String", "name__v")).toBe(false);
  });

  it("builds record detail href with optional tab", () => {
    expect(recordDetailHref("v1", "study__v", "abc")).toBe(
      "/objects/study__v/records/abc",
    );
    expect(recordDetailHref("v1", "study__v", "abc", "studies")).toBe(
      "/objects/study__v/records/abc?tab=studies",
    );
  });

  it("formats reference labels", () => {
    expect(formatReferenceLabel("id1", "Study A")).toBe("Study A");
    expect(formatReferenceLabel("id1", "")).toBe("");
    expect(formatReferenceLabel("id1", "id1")).toBe("");
  });
});
