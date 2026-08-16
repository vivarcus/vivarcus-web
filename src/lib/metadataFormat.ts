// Formatting helpers for the admin metadata viewer.
import { displayText } from "./i18n";
import type { ShellChrome } from "./i18n";

/** Render an arbitrary metadata attribute value as a compact string. */
export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Classify a metadata source into its shell-localized label. */
export function sourceLabel(source: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    standard: displayText(shell.metadata_source_standard),
    system: displayText(shell.metadata_source_system),
    custom: displayText(shell.metadata_source_custom),
    application: displayText(shell.metadata_source_application),
  };
  return labels[source] ?? source;
}

/** Render canonical Vault field types as shell-localized labels. */
export function fieldTypeLabel(fieldType: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    String: displayText(shell.metadata_field_type_string),
    LongText: displayText(shell.metadata_field_type_long_text),
    RichText: displayText(shell.metadata_field_type_rich_text),
    Number: displayText(shell.metadata_field_type_number),
    Boolean: displayText(shell.metadata_field_type_boolean),
    Date: displayText(shell.metadata_field_type_date),
    DateTime: displayText(shell.metadata_field_type_date_time),
    Picklist: displayText(shell.metadata_field_type_picklist),
    Object: displayText(shell.metadata_field_type_object),
    ObjectReference: displayText(shell.metadata_field_type_object),
    ObjectParent: displayText(shell.metadata_field_type_object),
    Formula: displayText(shell.metadata_field_type_formula),
  };
  return labels[fieldType] ?? fieldType;
}

/** Render canonical relationship kinds as shell-localized labels. */
export function relationshipTypeLabel(relationshipType: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    reference: displayText(shell.metadata_relationship_type_reference),
    parent: displayText(shell.metadata_relationship_type_parent),
  };
  return labels[relationshipType.toLowerCase()] ?? relationshipType;
}

/** Render canonical Vault object classes as shell-localized labels. */
export function objectClassLabel(objectClass: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    base: displayText(shell.metadata_object_class_base),
    usertask: displayText(shell.metadata_object_class_user_task),
    esignature: displayText(shell.metadata_object_class_esignature),
    userrolesetup: displayText(shell.metadata_object_class_user_role_setup),
    document: displayText(shell.metadata_object_class_document),
  };
  return labels[objectClass.toLowerCase()] ?? objectClass;
}

/** Render canonical Vault object data-store kinds as shell-localized labels. */
export function dataStoreLabel(dataStore: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    standard: displayText(shell.metadata_data_store_standard),
    high_volume: displayText(shell.metadata_data_store_high_volume),
  };
  return labels[dataStore.toLowerCase()] ?? dataStore;
}

/** Render projected page-layout element kinds as shell-localized labels. */
export function layoutElementKindLabel(kind: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    detailform: displayText(shell.metadata_layout_element_detailform),
    field: displayText(shell.metadata_layout_element_field),
    control: displayText(shell.metadata_layout_element_control),
    spacer: displayText(shell.metadata_layout_element_spacer),
    relatedobject: displayText(shell.metadata_related_object),
    text: displayText(shell.metadata_layout_element_text),
    wftimeline: displayText(shell.metadata_layout_element_wftimeline),
    domainuser: displayText(shell.metadata_layout_element_domain_user),
    helpsection: displayText(shell.metadata_layout_element_help_section),
  };
  return labels[kind.toLowerCase()] ?? kind;
}

/** Render detailform column types as shell-localized labels. */
export function detailformTypeLabel(detailformType: string, shell: ShellChrome): string {
  const normalized = detailformType.toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized.includes("two")) {
    return displayText(shell.metadata_detailform_two_columns);
  }
  if (normalized.includes("one")) {
    return displayText(shell.metadata_detailform_one_column);
  }
  return detailformType;
}

/** Render Vault relationship deletion rules as shell-localized labels. */
export function relationshipDeletionLabel(rule: string, shell: ShellChrome): string {
  const labels: Record<string, string> = {
    block: displayText(shell.metadata_relationship_deletion_block),
    setnull: displayText(shell.metadata_relationship_deletion_setnull),
    cascade: displayText(shell.metadata_relationship_deletion_cascade),
  };
  return labels[rule.toLowerCase()] ?? rule;
}

/** Render common lifecycle / application role API names as shell-localized labels. */
export function lifecycleRoleLabel(role: string, shell: ShellChrome): string {
  const key = role.trim().toLowerCase();
  const labels: Record<string, string> = {
    owner__v: displayText(shell.metadata_lifecycle_role_owner),
    owner: displayText(shell.metadata_lifecycle_role_owner),
    editor__v: displayText(shell.metadata_lifecycle_role_editor),
    editor: displayText(shell.metadata_lifecycle_role_editor),
    viewer__v: displayText(shell.metadata_lifecycle_role_viewer),
    viewer: displayText(shell.metadata_lifecycle_role_viewer),
    assigned_to__v: displayText(shell.metadata_lifecycle_role_assigned_to),
    assigned_to: displayText(shell.metadata_lifecycle_role_assigned_to),
    contributor__v: displayText(shell.metadata_lifecycle_role_contributor),
    contributor: displayText(shell.metadata_lifecycle_role_contributor),
  };
  return labels[key] ?? role;
}
