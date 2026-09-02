import { describe, expect, it } from "vitest";
import type { FormSection } from "../api/types";
import { applyPicklistCascadeOptions, pruneInvalidPicklistValues } from "./picklistForm";

const dependentSections: FormSection[] = [
  {
    section_id: "details",
    label: { text: "Details" },
    elements: [
      {
        kind: "field",
        field_api_name: "connection_type__c",
        field_type: "Picklist",
        field_render: {
          field_ref: { field_api_name: "connection_type__c" },
          field_type: "Picklist",
          renderer_kind: "picklist_select",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          picklist_options: [
            { name: "ftp__c", label: "FTP" },
            { name: "vault__c", label: "Vault" },
          ],
        },
      },
      {
        kind: "field",
        field_api_name: "source_format__c",
        field_type: "Picklist",
        field_render: {
          field_ref: { field_api_name: "source_format__c" },
          field_type: "Picklist",
          renderer_kind: "picklist_select",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          controlling_field_api_name: "connection_type__c",
          picklist_dependencies: {
            ftp__c: ["xml__c", "csv__c"],
            vault__c: [],
          },
          picklist_options_catalog: [
            { name: "xml__c", label: "XML" },
            { name: "csv__c", label: "CSV" },
            { name: "json__c", label: "JSON" },
          ],
        },
      },
    ],
  },
];

describe("applyPicklistCascadeOptions", () => {
  it("blocks dependent field until controlling value is set", () => {
    const sections = applyPicklistCascadeOptions(dependentSections, {});
    const dependent = sections[0].elements[1];
    expect(dependent.read_only).toBe(true);
    expect(dependent.field_render?.picklist_options).toEqual([]);
    expect(dependent.field_render?.hint).toEqual(["Select the controlling field first"]);
  });

  it("filters dependent options from catalog", () => {
    const sections = applyPicklistCascadeOptions(dependentSections, {
      connection_type__c: "ftp__c",
    });
    const dependent = sections[0].elements[1];
    expect(dependent.field_render?.picklist_options?.map((entry) => entry.name)).toEqual([
      "xml__c",
      "csv__c",
    ]);
    expect(dependent.picklist_options?.map((entry) => entry.name)).toEqual(["xml__c", "csv__c"]);
    expect(dependent.read_only).toBeFalsy();
  });

  it("overwrites stale top-level picklist_options when cascading", () => {
    const withStaleTopLevel: FormSection[] = [
      {
        ...dependentSections[0],
        elements: [
          dependentSections[0].elements[0],
          {
            ...dependentSections[0].elements[1],
            picklist_options: [
              { name: "xml__c", label: "XML" },
              { name: "csv__c", label: "CSV" },
              { name: "json__c", label: "JSON" },
            ],
          },
        ],
      },
    ];
    const sections = applyPicklistCascadeOptions(withStaleTopLevel, {
      connection_type__c: "vault__c",
    });
    const dependent = sections[0].elements[1];
    expect(dependent.picklist_options).toEqual([]);
    expect(dependent.field_render?.picklist_options).toEqual([]);
  });
});

describe("pruneInvalidPicklistValues", () => {
  it("clears dependent value when controlling picklist changes", () => {
    const pruned = pruneInvalidPicklistValues(
      {
        connection_type__c: "vault__c",
        source_format__c: "xml__c",
      },
      dependentSections,
      "connection_type__c",
    );
    expect(pruned.source_format__c).toBe("");
  });
});
