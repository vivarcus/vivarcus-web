import { describe, expect, it } from "vitest";
import {
  detailColumnGridRows,
  fieldGridClassName,
  partitionDetailformColumns,
} from "./RecordFieldGrid";

describe("RecordFieldGrid", () => {
  it("maps single-column detail layout", () => {
    expect(fieldGridClassName(undefined)).toBe(
      "field-grid field-grid--detail field-grid--one-col",
    );
    expect(fieldGridClassName(1)).toBe("field-grid field-grid--detail field-grid--one-col");
  });

  it("maps two-column detail layout to split columns", () => {
    expect(fieldGridClassName(2)).toBe(
      "field-grid field-grid--two-col field-grid--detail field-grid--split-columns",
    );
  });

  it("extends left column for layout controls outside the grid", () => {
    expect(detailColumnGridRows(16, 1)).toBe(9);
    expect(detailColumnGridRows(6, 0)).toBe(3);
  });

  it("partitions person create layout in document order with inline control", () => {
    const fieldNames = [
      "object_type__v",
      "prefix__v",
      "first_name__sys",
      "middle_name__v",
      "last_name__sys",
      "suffix__v",
      "manager__sys",
      "email__sys",
      "mobile_phone__sys",
      "image__sys",
      "language__sys",
      "locale__sys",
      "timezone__sys",
      "vault_user__sys",
      "tax_id__v",
      "city__c",
    ];
    const elements = [
      ...fieldNames.slice(0, 8).map((field_api_name) => ({
        kind: "field" as const,
        field_api_name,
      })),
      { kind: "control" as const, name: "duplicate_person_email_field_control__c" },
      ...fieldNames.slice(8).map((field_api_name) => ({
        kind: "field" as const,
        field_api_name,
      })),
    ];
    const { left, right } = partitionDetailformColumns(elements, {
      isGridCell: (el) => el.kind === "field",
      isLayoutPhantom: (el) => el.kind === "control",
    });
    expect(left.map((el) => el.field_api_name ?? el.name)).toEqual([
      ...fieldNames.slice(0, 8),
      "duplicate_person_email_field_control__c",
      "mobile_phone__sys",
    ]);
    expect(right.map((el) => el.field_api_name)).toEqual(fieldNames.slice(9));
  });
});
