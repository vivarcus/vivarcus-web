import { describe, expect, it } from "vitest";
import { defaultShellChrome } from "./i18n/chromeTypes";
import {
  dataStoreLabel,
  detailformTypeLabel,
  fieldTypeLabel,
  layoutElementKindLabel,
  lifecycleRoleLabel,
  objectClassLabel,
  relationshipDeletionLabel,
  relationshipTypeLabel,
  sourceLabel,
} from "./metadataFormat";

describe("metadataFormat localized labels", () => {
  it("maps canonical field types and preserves unknown values", () => {
    expect(fieldTypeLabel("String", defaultShellChrome)).toBe("Text");
    expect(fieldTypeLabel("ObjectReference", defaultShellChrome)).toBe("Object Reference");
    expect(fieldTypeLabel("FutureType", defaultShellChrome)).toBe("FutureType");
  });

  it("maps relationship and source enums", () => {
    expect(relationshipTypeLabel("reference", defaultShellChrome)).toBe("Reference");
    expect(relationshipTypeLabel("parent", defaultShellChrome)).toBe("Parent");
    expect(sourceLabel("custom", defaultShellChrome)).toBe("Custom");
  });

  it("maps object classes and preserves unknown values", () => {
    expect(objectClassLabel("usertask", defaultShellChrome)).toBe("User Task");
    expect(objectClassLabel("esignature", defaultShellChrome)).toBe("Signature");
    expect(objectClassLabel("future_class", defaultShellChrome)).toBe("future_class");
  });

  it("maps data stores and preserves unknown values", () => {
    expect(dataStoreLabel("standard", defaultShellChrome)).toBe("Standard");
    expect(dataStoreLabel("high_volume", defaultShellChrome)).toBe("High Volume");
    expect(dataStoreLabel("future_store", defaultShellChrome)).toBe("future_store");
  });

  it("maps layout element kinds and detailform types", () => {
    expect(layoutElementKindLabel("detailform", defaultShellChrome)).toBe("Detail Form");
    expect(layoutElementKindLabel("relatedObject", defaultShellChrome)).toBe("Related Object");
    expect(layoutElementKindLabel("futureKind", defaultShellChrome)).toBe("futureKind");
    expect(detailformTypeLabel("Two-Columns", defaultShellChrome)).toBe(
      "Detail Form - Two Columns",
    );
    expect(detailformTypeLabel("one-column", defaultShellChrome)).toBe(
      "Detail Form - One Column",
    );
    expect(detailformTypeLabel("custom-layout", defaultShellChrome)).toBe("custom-layout");
  });


  it("maps relationship deletion rules and lifecycle roles", () => {
    expect(relationshipDeletionLabel("block", defaultShellChrome)).toBe(
      "Prevent deletion of the related object record",
    );
    expect(relationshipDeletionLabel("setnull", defaultShellChrome)).toBe(
      "Set field to blank when related record is deleted",
    );
    expect(relationshipDeletionLabel("cascade", defaultShellChrome)).toBe(
      "Cascade delete children records",
    );
    expect(lifecycleRoleLabel("owner__v", defaultShellChrome)).toBe("Owner");
    expect(lifecycleRoleLabel("custom_role__c", defaultShellChrome)).toBe("custom_role__c");
  });

});
