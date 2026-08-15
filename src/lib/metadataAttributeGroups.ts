import type { MetadataNameValuePair } from "../api/types";
import type { ShellChrome } from "./i18n";
import { displayText } from "./i18n";

export type MetadataAttributeGroupKey =
  | "display"
  | "data"
  | "features"
  | "security"
  | "lifecycle"
  | "constraints"
  | "relationship"
  | "other";

export type MetadataAttributeGroup = {
  key: MetadataAttributeGroupKey;
  label: string;
  attributes: MetadataNameValuePair[];
};

const OBJECT_GROUP_KEYS: Record<
  Exclude<MetadataAttributeGroupKey, "other" | "constraints" | "relationship">,
  Set<string>
> = {
  display: new Set([
    "label",
    "label_plural",
    "description",
    "help_content",
    "in_menu",
    "order",
    "summary_fields",
  ]),
  data: new Set([
    "object_class",
    "data_store",
    "configuration_data",
    "system_managed",
    "prevent_record_overwrite",
    "triggers_disallowed",
  ]),
  features: new Set([
    "allow_attachments",
    "allow_types",
    "enable_esignatures",
    "enable_merges",
    "audit",
    "relate_multiple_records",
    "enable_select_all",
  ]),
  security: new Set([
    "dynamic_security",
    "user_role_setup_object",
    "secure_sharing_settings",
    "secure_attachments",
    "secure_audit_trail",
    "secure_copy_record",
    "security_tree_object",
    "tree_assignment_object_name",
    "user_reference_assignment",
  ]),
  lifecycle: new Set(["available_lifecycles"]),
};

const FIELD_GROUP_KEYS: Record<
  Exclude<MetadataAttributeGroupKey, "other" | "data" | "features" | "security" | "lifecycle">,
  Set<string>
> = {
  display: new Set(["label", "description", "help_content", "list_column", "order"]),
  constraints: new Set([
    "required",
    "unique",
    "active",
    "editable",
    "max_length",
    "encrypted",
    "no_copy",
    "checkbox",
    "format_mask",
    "default_value",
    "type",
    "picklist",
  ]),
  relationship: new Set([
    "object",
    "relationship_type",
    "relationship_outbound_name",
    "relationship_inbound_name",
    "relationship_inbound_label",
    "relationship_deletion",
    "relationship_criteria",
    "create_object_inline",
    "lookup_relationship_name",
    "lookup_source_field",
  ]),
};

function objectGroupKeyFor(name: string): MetadataAttributeGroupKey {
  for (const [key, names] of Object.entries(OBJECT_GROUP_KEYS) as [
    Exclude<MetadataAttributeGroupKey, "other" | "constraints" | "relationship">,
    Set<string>,
  ][]) {
    if (names.has(name)) return key;
  }
  if (name.startsWith("secure_")) return "security";
  return "other";
}

function fieldGroupKeyFor(name: string): MetadataAttributeGroupKey {
  for (const [key, names] of Object.entries(FIELD_GROUP_KEYS) as [
    Exclude<MetadataAttributeGroupKey, "other" | "data" | "features" | "security" | "lifecycle">,
    Set<string>,
  ][]) {
    if (names.has(name)) return key;
  }
  if (name.startsWith("relationship_")) return "relationship";
  if (name === "type" || name === "picklist" || name === "picklist_entries") return "constraints";
  return "other";
}

function groupLabel(key: MetadataAttributeGroupKey, shell: ShellChrome): string {
  switch (key) {
    case "display":
      return displayText(shell.metadata_attr_group_display);
    case "data":
      return displayText(shell.metadata_attr_group_data);
    case "features":
      return displayText(shell.metadata_attr_group_features);
    case "security":
      return displayText(shell.metadata_attr_group_security);
    case "lifecycle":
      return displayText(shell.metadata_attr_group_lifecycle);
    case "constraints":
      return displayText(shell.metadata_attr_group_constraints);
    case "relationship":
      return displayText(shell.metadata_attr_group_relationship);
    default:
      return displayText(shell.metadata_attr_group_other);
  }
}

const OBJECT_ORDER: MetadataAttributeGroupKey[] = [
  "display",
  "data",
  "features",
  "security",
  "lifecycle",
  "other",
];

const FIELD_ORDER: MetadataAttributeGroupKey[] = [
  "display",
  "constraints",
  "relationship",
  "other",
];

function groupAttributes(
  attributes: MetadataNameValuePair[],
  shell: ShellChrome,
  order: MetadataAttributeGroupKey[],
  keyFor: (name: string) => MetadataAttributeGroupKey,
): MetadataAttributeGroup[] {
  const buckets = new Map<MetadataAttributeGroupKey, MetadataNameValuePair[]>();
  for (const key of order) buckets.set(key, []);
  for (const attr of attributes) {
    const key = keyFor(attr.name);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(attr);
  }
  return order.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: groupLabel(key, shell),
    attributes: buckets.get(key)!,
  }));
}

// groupObjectAttributes buckets Object component attributes into Veeva-aligned concern groups
// so the Details tab is scannable instead of one flat attribute wall.
export function groupObjectAttributes(
  attributes: MetadataNameValuePair[],
  shell: ShellChrome,
): MetadataAttributeGroup[] {
  return groupAttributes(attributes, shell, OBJECT_ORDER, objectGroupKeyFor);
}

// groupFieldAttributes buckets Field attributes into Display / Constraints / Relationship / Other.
export function groupFieldAttributes(
  attributes: MetadataNameValuePair[],
  shell: ShellChrome,
): MetadataAttributeGroup[] {
  return groupAttributes(attributes, shell, FIELD_ORDER, fieldGroupKeyFor);
}
