import { displayText } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import type { DisplayText } from "../lib/i18n/types";
import { humanizeApiName, type CapabilitySectionId } from "./permissionSetView";

// Localized display vocabulary for platform capability permission keys (the Admin / Application /
// Security tabs of a permission set). Unlike objects / fields / tabs / pages, these keys are a
// fixed platform capability vocabulary with no configurable component label to resolve, so their
// friendly names are served from the shell chrome (l10n system_messages.csv), keyed per dotted-key
// segment. Any segment not in the catalog falls back to humanizeApiName so a permission row never
// renders a bare snake_case api key.

// capabilitySegmentCatalog maps a single dotted-key segment (family or leaf) to its localized shell
// chrome label. Segments mirror those seen in seeded permission sets (security.*, configuration.*,
// vault_actions.*, vault_owner_actions.*, operations.*, vault_client_applications.*).
function capabilitySegmentCatalog(shell: ShellChrome): Record<string, DisplayText> {
  return {
    // families
    security: shell.metadata_capability_security,
    configuration: shell.metadata_capability_configuration,
    operations: shell.metadata_capability_operations,
    vault_actions: shell.metadata_capability_vault_actions,
    vault_owner_actions: shell.metadata_capability_vault_owner_actions,
    vault_client_applications: shell.metadata_capability_vault_client_applications,
    vault_loader: shell.metadata_capability_vault_loader,
    deployment: shell.metadata_capability_deployment,
    domain_administration: shell.metadata_capability_domain_administration,
    // leaves
    users: shell.metadata_capability_users,
    user: shell.metadata_capability_user,
    groups: shell.metadata_capability_groups,
    domain_users: shell.metadata_capability_domain_users,
    business_admin_objects: shell.metadata_capability_business_admin_objects,
    object_layouts: shell.metadata_capability_object_layouts,
    object: shell.metadata_capability_object,
    settings: shell.metadata_capability_settings,
    security_profiles: shell.metadata_capability_security_profiles,
    permission_sets: shell.metadata_capability_permission_sets,
    localized_labels: shell.metadata_capability_localized_labels,
    language_region: shell.metadata_capability_language_region,
    branding: shell.metadata_capability_branding,
    workflow: shell.metadata_capability_workflow,
    workflow_administration: shell.metadata_capability_workflow_administration,
    document: shell.metadata_capability_document,
    reporting: shell.metadata_capability_reporting,
    search: shell.metadata_capability_search,
    audit_trail: shell.metadata_capability_audit_trail,
    api: shell.metadata_capability_api,
    create_button: shell.metadata_capability_create_button,
    edl_matching: shell.metadata_capability_edl_matching,
    views: shell.metadata_capability_views,
    crosslink: shell.metadata_capability_crosslink,
    viewer_administration: shell.metadata_capability_viewer_administration,
    legal_hold: shell.metadata_capability_legal_hold,
    renditions: shell.metadata_capability_renditions,
    jobs: shell.metadata_capability_jobs,
    sdk_job_queues: shell.metadata_capability_sdk_job_queues,
    email_notification_status: shell.metadata_capability_email_notification_status,
    all_object_records: shell.metadata_capability_all_object_records,
    veeva_snap: shell.metadata_capability_veeva_snap,
    picklists: shell.metadata_capability_picklists,
    templates: shell.metadata_capability_templates,
    logs: shell.metadata_capability_logs,
    connections: shell.metadata_capability_connections,
    all_configuration_read: shell.metadata_capability_all_configuration_read,
    ui_diagnostics: shell.metadata_capability_ui_diagnostics,
    ui_metadata: shell.metadata_capability_ui_metadata,
    bulk_translation: shell.metadata_capability_bulk_translation,
    formatted_output_templates: shell.metadata_capability_formatted_output_templates,
    overlays: shell.metadata_capability_overlays,
    report_types: shell.metadata_capability_report_types,
    signature_and_cover_pages: shell.metadata_capability_signature_and_cover_pages,
    layout_profiles: shell.metadata_capability_layout_profiles,
  };
}

// capabilityKeyLabel renders a dotted capability permission key as localized segments joined by
// " · " (e.g. "security.users" -> "Security · Users" / "安全 · 用户"), dropping a redundant
// trailing "*_actions" verb segment. Falls back to the raw key only when it has no segments.
export function capabilityKeyLabel(key: string, shell: ShellChrome): string {
  const segments = key.split(".").filter(Boolean);
  if (segments.length > 1 && /_actions$/.test(segments[segments.length - 1])) {
    segments.pop();
  }
  return labelSegments(segments, shell) || key;
}

// SECTION_KEY_PREFIX is the dotted-key prefix stripped when a row sits under a titled Veeva
// section (so "security.users" under Security renders as "Users", not "Security · Users").
const SECTION_KEY_PREFIX: Record<CapabilitySectionId, string[]> = {
  security: ["security"],
  configuration: ["configuration"],
  settings: ["configuration", "settings"],
  operations: ["operations"],
  domain_administration: ["domain_administration"],
  deployment: [],
  vault_actions: ["vault_actions"],
  vault_owner_actions: ["vault_owner_actions"],
  vault_client_applications: ["vault_client_applications"],
  other: [],
};

// capabilitySectionLabel resolves a Veeva Admin / Application section heading from shell chrome.
export function capabilitySectionLabel(id: CapabilitySectionId, shell: ShellChrome): string {
  switch (id) {
    case "security":
      return displayText(shell.metadata_capability_security);
    case "configuration":
      return displayText(shell.metadata_capability_configuration);
    case "settings":
      return displayText(shell.metadata_capability_settings);
    case "operations":
      return displayText(shell.metadata_capability_operations);
    case "domain_administration":
      return displayText(shell.metadata_capability_domain_administration);
    case "deployment":
      return displayText(shell.metadata_capability_deployment);
    case "vault_actions":
      return displayText(shell.metadata_capability_vault_actions);
    case "vault_owner_actions":
      return displayText(shell.metadata_capability_vault_owner_actions);
    case "vault_client_applications":
      return displayText(shell.metadata_capability_vault_client_applications);
    case "other":
      return displayText(shell.metadata_permission_section_other);
  }
}

// capabilitySectionEntryLabel renders a capability row label inside a titled section: the section
// family prefix is dropped so nested rows read like Veeva ("Users", "Workflow"). A bare family key
// (e.g. vault_owner_actions) falls back to the section heading itself.
export function capabilitySectionEntryLabel(
  key: string,
  sectionId: CapabilitySectionId,
  shell: ShellChrome,
): string {
  const segments = key.split(".").filter(Boolean);
  if (segments.length > 1 && /_actions$/.test(segments[segments.length - 1])) {
    segments.pop();
  }
  const prefix = SECTION_KEY_PREFIX[sectionId];
  let rest = segments;
  if (
    prefix.length > 0 &&
    segments.length >= prefix.length &&
    prefix.every((p, i) => segments[i] === p)
  ) {
    rest = segments.slice(prefix.length);
  }
  if (rest.length === 0) return capabilitySectionLabel(sectionId, shell);
  return labelSegments(rest, shell) || key;
}

function labelSegments(segments: string[], shell: ShellChrome): string {
  const catalog = capabilitySegmentCatalog(shell);
  const words = segments
    .map((segment) => {
      const label = catalog[segment];
      return label ? displayText(label) : humanizeApiName(segment);
    })
    .filter(Boolean);
  return words.join(" · ");
}
