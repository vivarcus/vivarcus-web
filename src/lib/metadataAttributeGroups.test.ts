import { describe, expect, it } from "vitest";
import { groupFieldAttributes, groupObjectAttributes } from "./metadataAttributeGroups";
import type { ShellChrome } from "./i18n";

const shell = {
  metadata_attr_group_display: { text: "Display" },
  metadata_attr_group_data: { text: "Data model" },
  metadata_attr_group_features: { text: "Features" },
  metadata_attr_group_security: { text: "Security" },
  metadata_attr_group_lifecycle: { text: "Lifecycle" },
  metadata_attr_group_constraints: { text: "Constraints" },
  metadata_attr_group_relationship: { text: "Relationship" },
  metadata_attr_group_other: { text: "Other" },
} as ShellChrome;

describe("groupObjectAttributes", () => {
  it("buckets known attributes and leaves the rest in other", () => {
    const groups = groupObjectAttributes(
      [
        { name: "label", value: "Study" },
        { name: "object_class", value: "base" },
        { name: "allow_types", value: true },
        { name: "dynamic_security", value: true },
        { name: "available_lifecycles", value: "Objectlifecycle.study__v" },
        { name: "custom_flag__c", value: true },
        { name: "secure_copy_record", value: false },
      ],
      shell,
    );
    expect(groups.map((g) => g.key)).toEqual([
      "display",
      "data",
      "features",
      "security",
      "lifecycle",
      "other",
    ]);
    expect(groups.find((g) => g.key === "display")?.attributes.map((a) => a.name)).toEqual([
      "label",
    ]);
    expect(groups.find((g) => g.key === "security")?.attributes.map((a) => a.name)).toEqual([
      "dynamic_security",
      "secure_copy_record",
    ]);
    expect(groups.find((g) => g.key === "other")?.attributes.map((a) => a.name)).toEqual([
      "custom_flag__c",
    ]);
  });

  it("omits empty groups", () => {
    const groups = groupObjectAttributes([{ name: "label", value: "X" }], shell);
    expect(groups.map((g) => g.key)).toEqual(["display"]);
  });
});

describe("groupFieldAttributes", () => {
  it("buckets display, constraints, relationship, and other", () => {
    const groups = groupFieldAttributes(
      [
        { name: "label", value: "Country" },
        { name: "required", value: true },
        { name: "type", value: "Object" },
        { name: "object", value: "country__v" },
        { name: "relationship_outbound_name", value: "country__vr" },
        { name: "custom_meta__c", value: 1 },
      ],
      shell,
    );
    expect(groups.map((g) => g.key)).toEqual([
      "display",
      "constraints",
      "relationship",
      "other",
    ]);
    expect(groups.find((g) => g.key === "constraints")?.attributes.map((a) => a.name)).toEqual([
      "required",
      "type",
    ]);
    expect(groups.find((g) => g.key === "relationship")?.attributes.map((a) => a.name)).toEqual([
      "object",
      "relationship_outbound_name",
    ]);
    expect(groups.find((g) => g.key === "other")?.attributes.map((a) => a.name)).toEqual([
      "custom_meta__c",
    ]);
  });
});
