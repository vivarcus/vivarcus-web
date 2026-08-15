import type { DisplayText } from "./types";

function t(text: string, key: string): DisplayText {
  return { text, key: `system:${key}`, fallback_source: "base_language" };
}

export type ShellChrome = {
  loading: DisplayText;
  load_failed: DisplayText;
  load_form_failed: DisplayText;
  save_failed: DisplayText;
  delete_failed: DisplayText;
  action_failed: DisplayText;
  lifecycle_entry_criteria_failed: DisplayText;
  lifecycle_entry_criteria_failure_body: DisplayText;
  lifecycle_entry_criteria_failure_footer: DisplayText;
  lifecycle_entry_criteria_validate_that: DisplayText;
  lifecycle_entry_criteria_no_records_equal: DisplayText;
  lifecycle_entry_criteria_record_equals: DisplayText;
  lifecycle_entry_criteria_record_not_equals: DisplayText;
  lifecycle_entry_criteria_field_is_not_blank: DisplayText;
  empty_value: DisplayText;
  help_placeholder: DisplayText;
  back: DisplayText;
  sign_out: DisplayText;
  switch_vault: DisplayText;
  all_vaults_label: DisplayText;
  loading_nav: DisplayText;
  stale_confirm: DisplayText;
  stale_reloaded: DisplayText;
  unsaved_confirm: DisplayText;
  apply: DisplayText;
  clear: DisplayText;
  cancel: DisplayText;
  confirm: DisplayText;
  continue: DisplayText;
  refresh: DisplayText;
  load_more: DisplayText;
  admin_config_diagnostics: DisplayText;
  admin_layout_preview: DisplayText;
  admin_metadata_viewer: DisplayText;
  admin_configuration: DisplayText;
  admin_configuration_platform: DisplayText;
  admin_configuration_components: DisplayText;
  admin_configuration_search_components: DisplayText;
  admin_configuration_view_all: DisplayText;
  admin_configuration_no_matches: DisplayText;
  admin_configuration_recently_used: DisplayText;
  admin_configuration_favorites: DisplayText;
  admin_configuration_favorites_empty: DisplayText;
  metadata_objects_title: DisplayText;
  metadata_object_detail_title: DisplayText;
  metadata_fields_section: DisplayText;
  metadata_field_detail_title: DisplayText;
  metadata_layouts_title: DisplayText;
  metadata_lifecycles_title: DisplayText;
  metadata_lifecycle_detail_title: DisplayText;
  metadata_lifecycle_label: DisplayText;
  metadata_lifecycle_name: DisplayText;
  metadata_lifecycle_starting_state: DisplayText;
  metadata_lifecycle_states_tab: DisplayText;
  metadata_lifecycle_state_types_tab: DisplayText;
  metadata_lifecycle_state_type: DisplayText;
  metadata_lifecycle_state: DisplayText;
  metadata_empty_lifecycle_state_types: DisplayText;
  metadata_lifecycle_roles_tab: DisplayText;
  metadata_lifecycle_permissions_tab: DisplayText;
  metadata_lifecycle_user_actions: DisplayText;
  metadata_lifecycle_entry_criteria: DisplayText;
  metadata_lifecycle_entry_actions: DisplayText;
  metadata_lifecycle_action_summary: DisplayText;
  metadata_lifecycle_target_state: DisplayText;
  metadata_lifecycle_record_status: DisplayText;
  metadata_lifecycle_record_inactive: DisplayText;
  metadata_lifecycle_cancel_state: DisplayText;
  metadata_lifecycle_application_role: DisplayText;
  metadata_lifecycle_permission: DisplayText;
  metadata_lifecycle_object: DisplayText;
  metadata_lifecycle_state_label: DisplayText;
  metadata_lifecycle_state_name: DisplayText;
  metadata_lifecycle_view_objects: DisplayText;
  metadata_lifecycle_event_actions: DisplayText;
  metadata_lifecycle_event: DisplayText;
  metadata_lifecycles_search_placeholder: DisplayText;
  metadata_empty_lifecycles: DisplayText;
  metadata_empty_lifecycle_states: DisplayText;
  metadata_empty_lifecycle_roles: DisplayText;
  metadata_empty_lifecycle_permissions: DisplayText;
  metadata_empty_lifecycle_objects: DisplayText;
  metadata_empty_lifecycle_user_actions: DisplayText;
  metadata_empty_lifecycle_entry_criteria: DisplayText;
  metadata_empty_lifecycle_entry_actions: DisplayText;
  metadata_empty_lifecycle_event_actions: DisplayText;
  metadata_workflows_title: DisplayText;
  metadata_picklists_title: DisplayText;
  metadata_picklist_detail_title: DisplayText;
  metadata_picklists_search_placeholder: DisplayText;
  metadata_empty_picklists: DisplayText;
  metadata_empty_picklist_entries: DisplayText;
  metadata_picklist_entries: DisplayText;
  metadata_picklist_entry_order: DisplayText;
  metadata_picklist_entry_label: DisplayText;
  metadata_picklist_entry_name: DisplayText;
  metadata_picklist_ref: DisplayText;
  metadata_picklist_can_add_values: DisplayText;
  metadata_picklist_can_reorder_values: DisplayText;
  metadata_workflow_detail_title: DisplayText;
  metadata_workflows_search_placeholder: DisplayText;
  metadata_empty_workflows: DisplayText;
  metadata_workflow_type: DisplayText;
  metadata_workflow_type_object: DisplayText;
  metadata_workflow_type_document: DisplayText;
  metadata_workflow_type_filter_all: DisplayText;
  metadata_workflow_lifecycle: DisplayText;
  metadata_workflow_version: DisplayText;
  metadata_view_workflow_versions: DisplayText;
  metadata_workflow_versions_title: DisplayText;
  metadata_workflow_version_live: DisplayText;
  metadata_workflow_historical_banner: DisplayText;
  metadata_workflow_placeholder_error: DisplayText;
  metadata_empty_workflow_versions: DisplayText;
  metadata_workflow_activated: DisplayText;
  metadata_make_configuration_active: DisplayText;
  metadata_workflow_start_states: DisplayText;
  metadata_workflow_options: DisplayText;
  metadata_workflow_options_general: DisplayText;
  metadata_workflow_segregation: DisplayText;
  metadata_workflow_action_security: DisplayText;
  metadata_workflow_steps: DisplayText;
  metadata_workflow_step_flow: DisplayText;
  metadata_workflow_step_type: DisplayText;
  metadata_workflow_step_label: DisplayText;
  metadata_workflow_next_steps: DisplayText;
  metadata_workflow_step_type_start: DisplayText;
  metadata_workflow_step_type_end: DisplayText;
  metadata_workflow_step_type_task: DisplayText;
  metadata_workflow_step_type_decision: DisplayText;
  metadata_workflow_step_type_action: DisplayText;
  metadata_workflow_step_type_state_change: DisplayText;
  metadata_workflow_step_type_notification: DisplayText;
  metadata_workflow_step_type_join: DisplayText;
  metadata_workflow_step_type_placeholder: DisplayText;
  metadata_config_view_only: DisplayText;
  metadata_more_count: DisplayText;
  metadata_lifecycle_state_overview: DisplayText;
  metadata_workflow_envelope: DisplayText;
  metadata_workflow_variables: DisplayText;
  metadata_workflow_cancellation_actions: DisplayText;
  metadata_workflow_cardinality_one: DisplayText;
  metadata_workflow_cancellation_comment: DisplayText;
  metadata_workflow_auto_start: DisplayText;
  metadata_workflow_one_task: DisplayText;
  metadata_workflow_roles_cannot_complete: DisplayText;
  metadata_workflow_disallowed_owner: DisplayText;
  metadata_workflow_disallowed_non_task_owner: DisplayText;
  metadata_workflow_disallowed_all: DisplayText;
  metadata_workflow_envelope_name_format: DisplayText;
  metadata_workflow_document_content_lifecycle: DisplayText;
  metadata_workflow_record_content_lifecycle: DisplayText;
  metadata_workflow_cancel_order: DisplayText;
  metadata_empty_workflow_steps: DisplayText;
  metadata_empty_workflow_variables: DisplayText;
  metadata_empty_workflow_cancellation_actions: DisplayText;
  metadata_workflow_start_options: DisplayText;
  metadata_workflow_start_step_rules: DisplayText;
  metadata_workflow_task_options: DisplayText;
  metadata_workflow_decision_rules: DisplayText;
  metadata_workflow_notification_options: DisplayText;
  metadata_workflow_state_change_options: DisplayText;
  metadata_workflow_step_tags: DisplayText;
  metadata_workflow_control_type: DisplayText;
  metadata_workflow_participant_strategy: DisplayText;
  metadata_workflow_roles_allowed: DisplayText;
  metadata_workflow_roles_not_allowed: DisplayText;
  metadata_workflow_task_assignment: DisplayText;
  metadata_workflow_task_requirement: DisplayText;
  metadata_workflow_exclude_owner: DisplayText;
  metadata_workflow_hide_home_page_link: DisplayText;
  metadata_workflow_complete_without_viewing: DisplayText;
  metadata_workflow_previous_tasks_to_display: DisplayText;
  metadata_workflow_notification_previous_tasks: DisplayText;
  metadata_workflow_custom_actions: DisplayText;
  metadata_workflow_verdicts: DisplayText;
  metadata_workflow_reminders: DisplayText;
  metadata_workflow_next_state: DisplayText;
  metadata_workflow_message_template: DisplayText;
  metadata_workflow_recipients: DisplayText;
  metadata_workflow_decision_summary: DisplayText;
  metadata_workflow_decision_default: DisplayText;
  metadata_workflow_esig_required: DisplayText;
  metadata_empty_start_controls: DisplayText;
  metadata_empty_start_rules: DisplayText;
  metadata_empty_decision_rules: DisplayText;
  metadata_empty_task_verdicts: DisplayText;
  metadata_layout_detail_title: DisplayText;
  metadata_load_failed: DisplayText;
  metadata_object_not_found: DisplayText;
  metadata_empty_objects: DisplayText;
  metadata_empty_layouts: DisplayText;
  metadata_empty_object_types: DisplayText;
  metadata_source: DisplayText;
  metadata_status: DisplayText;
  metadata_status_active: DisplayText;
  metadata_status_inactive: DisplayText;
  metadata_status_editing: DisplayText;
  metadata_namespace: DisplayText;
  metadata_in_menu: DisplayText;
  metadata_object_class: DisplayText;
  metadata_data_store: DisplayText;
  metadata_object_configuration: DisplayText;
  metadata_object_options: DisplayText;
  metadata_object_type_independent: DisplayText;
  metadata_unique_keys: DisplayText;
  metadata_display_in_business_admin: DisplayText;
  metadata_allow_attachments: DisplayText;
  metadata_enable_signatures: DisplayText;
  metadata_audit_object: DisplayText;
  metadata_enable_object_types: DisplayText;
  metadata_enable_merges: DisplayText;
  metadata_dynamic_access_control: DisplayText;
  metadata_enable_dynamic_security: DisplayText;
  metadata_user_role_setup_object: DisplayText;
  metadata_security_tree_object: DisplayText;
  metadata_action_security: DisplayText;
  metadata_secure_audit_trail: DisplayText;
  metadata_secure_sharing_settings: DisplayText;
  metadata_secure_copy_record: DisplayText;
  metadata_record_summary_field: DisplayText;
  metadata_object_lifecycle: DisplayText;
  metadata_allow_types: DisplayText;
  metadata_active: DisplayText;
  metadata_required: DisplayText;
  metadata_unique: DisplayText;
  metadata_type: DisplayText;
  metadata_attributes: DisplayText;
  metadata_field_name: DisplayText;
  metadata_field_label: DisplayText;
  metadata_object_label: DisplayText;
  metadata_object_label_plural: DisplayText;
  metadata_object_name: DisplayText;
  metadata_attribute_name: DisplayText;
  metadata_empty_attributes: DisplayText;
  metadata_result_count: DisplayText;
  metadata_objects_search_placeholder: DisplayText;
  metadata_layouts_search_placeholder: DisplayText;
  metadata_fields_search_placeholder: DisplayText;
  metadata_attributes_search_placeholder: DisplayText;
  metadata_value: DisplayText;
  metadata_yes: DisplayText;
  metadata_no: DisplayText;
  metadata_layout_label: DisplayText;
  metadata_layout_name: DisplayText;
  metadata_layout_kind: DisplayText;
  metadata_empty_sections: DisplayText;
  metadata_layout_reference: DisplayText;
  metadata_sections_tab: DisplayText;
  metadata_default: DisplayText;
  metadata_default_type: DisplayText;
  metadata_typefield_required_legend: DisplayText;
  metadata_attr_group_display: DisplayText;
  metadata_attr_group_data: DisplayText;
  metadata_attr_group_features: DisplayText;
  metadata_attr_group_security: DisplayText;
  metadata_attr_group_lifecycle: DisplayText;
  metadata_attr_group_other: DisplayText;
  metadata_attr_group_constraints: DisplayText;
  metadata_attr_group_relationship: DisplayText;
  metadata_summary_fields: DisplayText;
  metadata_field_editable: DisplayText;
  metadata_field_help: DisplayText;
  metadata_details_tab: DisplayText;
  metadata_fields_tab: DisplayText;
  metadata_object_types_tab: DisplayText;
  metadata_list_layout_tab: DisplayText;
  metadata_list_column: DisplayText;
  metadata_list_layout_order: DisplayText;
  metadata_list_layout_from_fields: DisplayText;
  metadata_list_layout_from_component: DisplayText;
  metadata_empty_list_layout: DisplayText;
  metadata_layouts_tab: DisplayText;
  metadata_actions_tab: DisplayText;
  metadata_empty_actions: DisplayText;
  metadata_action_ref: DisplayText;
  metadata_available_all_states: DisplayText;
  metadata_relationships_tab: DisplayText;
  metadata_empty_relationships: DisplayText;
  metadata_related_object: DisplayText;
  metadata_relationship_type: DisplayText;
  metadata_outbound_relationships: DisplayText;
  metadata_inbound_relationships: DisplayText;
  metadata_empty_outbound: DisplayText;
  metadata_empty_inbound: DisplayText;
  metadata_relationship_label: DisplayText;
  metadata_outbound_name: DisplayText;
  metadata_inbound_name: DisplayText;
  metadata_secured: DisplayText;
  metadata_field_type: DisplayText;
  metadata_sharing_rules_tab: DisplayText;
  metadata_empty_sharing_rules: DisplayText;
  metadata_sharing_rule_criteria: DisplayText;
  metadata_sharing_rule_role: DisplayText;
  metadata_sharing_rule_members: DisplayText;
  metadata_permission_sets_title: DisplayText;
  metadata_permission_set_detail_title: DisplayText;
  metadata_empty_permission_sets: DisplayText;
  metadata_security_profiles_title: DisplayText;
  metadata_security_profile_detail_title: DisplayText;
  metadata_empty_security_profiles: DisplayText;
  metadata_security_profiles_search_placeholder: DisplayText;
  metadata_security_profile_ps_count: DisplayText;
  metadata_security_profile_member_missing: DisplayText;
  metadata_security_profile_users_title: DisplayText;
  metadata_security_profile_user_name: DisplayText;
  metadata_security_profile_empty_users: DisplayText;
  metadata_security_profile_users_search_placeholder: DisplayText;
  metadata_permission_entry: DisplayText;
  metadata_permission_actions: DisplayText;
  metadata_permission_description: DisplayText;
  metadata_permission_sets_search_placeholder: DisplayText;
  metadata_permission_objects_search_placeholder: DisplayText;
  metadata_permission_objects_count: DisplayText;
  metadata_permission_expand_all: DisplayText;
  metadata_permission_collapse_all: DisplayText;
  metadata_permission_search_placeholder: DisplayText;
  metadata_permission_no_matches: DisplayText;
  metadata_permission_type: DisplayText;
  metadata_permission_kind_object: DisplayText;
  metadata_permission_kind_object_type: DisplayText;
  metadata_permission_kind_tab: DisplayText;
  metadata_permission_kind_fields: DisplayText;
  metadata_permission_kind_field: DisplayText;
  metadata_permission_kind_controls: DisplayText;
  metadata_permission_kind_record_action: DisplayText;
  metadata_permission_object_permissions: DisplayText;
  metadata_permission_field_permissions: DisplayText;
  metadata_permission_control_permissions: DisplayText;
  metadata_permission_all_object_types: DisplayText;
  metadata_permission_all_object_fields: DisplayText;
  metadata_permission_all_object_controls: DisplayText;
  metadata_permission_objects_total: DisplayText;
  metadata_permission_record_access: DisplayText;
  metadata_permission_no_grants: DisplayText;
  metadata_permission_category_admin: DisplayText;
  metadata_permission_category_application: DisplayText;
  metadata_permission_category_objects: DisplayText;
  metadata_permission_category_tabs: DisplayText;
  metadata_permission_category_pages: DisplayText;
  metadata_permission_category_mobile: DisplayText;
  metadata_filter_all_sources: DisplayText;
  metadata_filter_all_statuses: DisplayText;
  metadata_filter_all: DisplayText;
  metadata_filter_all_classes: DisplayText;
  metadata_permission_reference_count: DisplayText;
  metadata_permission_orphan: DisplayText;
  metadata_reference_filter_all: DisplayText;
  metadata_reference_filter_referenced: DisplayText;
  metadata_reference_filter_unreferenced: DisplayText;
  metadata_permission_used_by: DisplayText;
  metadata_permission_used_by_profiles: DisplayText;
  metadata_permission_used_by_roles: DisplayText;
  metadata_permission_used_by_none: DisplayText;
  metadata_permission_inactive_suffix: DisplayText;
  // Fallback heading when an Admin / Application capability key does not match a known Veeva section.
  metadata_permission_section_other: DisplayText;
  // Capability permission key segments (Admin / Application / Security tabs). Each maps one dotted
  // key segment to its localized label; the viewer composes a key like "security.users" into
  // "Security · Users" from these. Unknown segments fall back to a humanized api_name.
  metadata_capability_security: DisplayText;
  metadata_capability_configuration: DisplayText;
  metadata_capability_operations: DisplayText;
  metadata_capability_vault_actions: DisplayText;
  metadata_capability_vault_owner_actions: DisplayText;
  metadata_capability_vault_client_applications: DisplayText;
  metadata_capability_vault_loader: DisplayText;
  metadata_capability_deployment: DisplayText;
  metadata_capability_domain_administration: DisplayText;
  metadata_capability_users: DisplayText;
  metadata_capability_user: DisplayText;
  metadata_capability_groups: DisplayText;
  metadata_capability_domain_users: DisplayText;
  metadata_capability_business_admin_objects: DisplayText;
  metadata_capability_object_layouts: DisplayText;
  metadata_capability_object: DisplayText;
  metadata_capability_settings: DisplayText;
  metadata_capability_security_profiles: DisplayText;
  metadata_capability_permission_sets: DisplayText;
  metadata_capability_localized_labels: DisplayText;
  metadata_capability_language_region: DisplayText;
  metadata_capability_branding: DisplayText;
  metadata_capability_workflow: DisplayText;
  metadata_capability_workflow_administration: DisplayText;
  metadata_capability_document: DisplayText;
  metadata_capability_reporting: DisplayText;
  metadata_capability_search: DisplayText;
  metadata_capability_audit_trail: DisplayText;
  metadata_capability_api: DisplayText;
  metadata_capability_create_button: DisplayText;
  metadata_capability_edl_matching: DisplayText;
  metadata_capability_views: DisplayText;
  metadata_capability_crosslink: DisplayText;
  metadata_capability_viewer_administration: DisplayText;
  metadata_capability_legal_hold: DisplayText;
  metadata_capability_renditions: DisplayText;
  metadata_capability_jobs: DisplayText;
  metadata_capability_sdk_job_queues: DisplayText;
  metadata_capability_email_notification_status: DisplayText;
  metadata_capability_all_object_records: DisplayText;
  metadata_capability_veeva_snap: DisplayText;
  metadata_capability_picklists: DisplayText;
  metadata_capability_templates: DisplayText;
  metadata_capability_logs: DisplayText;
  metadata_capability_connections: DisplayText;
  metadata_capability_all_configuration_read: DisplayText;
  metadata_capability_ui_diagnostics: DisplayText;
  metadata_capability_ui_metadata: DisplayText;
  metadata_capability_bulk_translation: DisplayText;
  expand_subtabs: DisplayText;
  collapse_subtabs: DisplayText;
  subtabs_suffix: DisplayText;
  empty_no_columns: DisplayText;
  empty_no_records: DisplayText;
  vault_entering: DisplayText;
  tab_nav_aria: DisplayText;
  first_page: DisplayText;
  next_page: DisplayText;
  filter: DisplayText;
  return_to_record: DisplayText;
  vault_home: DisplayText;
  admin_logs: DisplayText;
  admin_users_groups: DisplayText;
  admin_language_region_settings: DisplayText;
  admin_branding_settings: DisplayText;
  admin_search_settings: DisplayText;
  admin_security_settings: DisplayText;
  admin_domain_settings: DisplayText;
  admin_vault_settings_group: DisplayText;
  admin_domain_settings_group: DisplayText;
  admin_domain_settings_general_label: DisplayText;
  admin_domain_settings_features_label: DisplayText;
  admin_domain_settings_security_policies_label: DisplayText;
  admin_domain_settings_network_access_label: DisplayText;
  admin_domain_settings_saml_profiles_label: DisplayText;
  admin_domain_settings_oauth_profiles_label: DisplayText;
  admin_layout_profile: DisplayText;
  layout_preview_subtitle: DisplayText;
  object_label: DisplayText;
  object_type_label: DisplayText;
  layout_api_name_label: DisplayText;
  record_snapshot_label: DisplayText;
  optional_placeholder: DisplayText;
  previewing: DisplayText;
  generate_preview: DisplayText;
  layout_preview_failed: DisplayText;
  layout_preview_required: DisplayText;
  snapshot_must_be_object: DisplayText;
  preview_mode_prefix: DisplayText;
  virtual_layout_suffix: DisplayText;
  status_prefix: DisplayText;
  loading_diagnostics: DisplayText;
  load_diagnostics_failed: DisplayText;
  projection_status_prefix: DisplayText;
  severity: DisplayText;
  component_type: DisplayText;
  issue_code: DisplayText;
  route_label: DisplayText;
  all_severities: DisplayText;
  no_config_issues: DisplayText;
  component: DisplayText;
  locator: DisplayText;
  description: DisplayText;
  layout_profile_title: DisplayText;
  layout_profile_subtitle: DisplayText;
  loading_layout_profiles: DisplayText;
  load_layout_profile_failed: DisplayText;
  select_layout_profile: DisplayText;
  save_assignment_failed: DisplayText;
  target_user_id: DisplayText;
  current_user_placeholder: DisplayText;
  please_select: DisplayText;
  /** Placeholder when a reference field waits on its controlling_field (Veeva: "Depends on Study"). */
  depends_on_field: DisplayText;
  no_profiles_available: DisplayText;
  viewing_user: DisplayText;
  layout_profile_updated: DisplayText;
  current_assignment_prefix: DisplayText;
  assigned_at_prefix: DisplayText;
  saving: DisplayText;
  save: DisplayText;
  page_tab_stub: DisplayText;
  reference_target_object: DisplayText;
  reference_filter: DisplayText;
  reference_select_record: DisplayText;
  reference_loading_options: DisplayText;
  reference_load_failed: DisplayText;
  reference_manual_id: DisplayText;
  /** Dropdown footer: "+ Create {object}" (Veeva create_object_inline). */
  reference_create_action: DisplayText;
  picklist_no_options: DisplayText;
  reference_missing_target: DisplayText;
  layout_rules_failed: DisplayText;
  breadcrumb_aria: DisplayText;
  lifecycle_stages_aria: DisplayText;
  global_search_aria: DisplayText;
  global_search_scope: DisplayText;
  global_search_placeholder: DisplayText;
  global_search_advanced: DisplayText;
  global_search_submit: DisplayText;
  notifications_aria: DisplayText;
  tab_collections_aria: DisplayText;
  tab_collections_label: DisplayText;
  tab_more_label: DisplayText;
  user_profile_menu: DisplayText;
  about_this_vault: DisplayText;
  help_menu: DisplayText;
  keyboard_shortcuts: DisplayText;
  forbidden_title: DisplayText;
  forbidden_subtitle: DisplayText;
  component_type_example: DisplayText;
  document_viewer: DocumentViewerChrome;
  cfg_packaging: CfgPackagingChrome;
  vault_ai: VaultAIChrome;
  domain_user: DomainUserChrome;
  operations: OperationsChrome;
  deployment: DeploymentChrome;
  configuration: ConfigurationChrome;
  completeness_hover: CompletenessHoverChrome;
  unsupported_image_type: DisplayText;
  image_too_large: DisplayText;
  image_upload_failed: DisplayText;
  image_save_failed: DisplayText;
  image_alt: DisplayText;
  /** Tab/list create entry (system:list.create). */
  list_create: DisplayText;
  /** Create-object-type modal prompt (system:list.select_object_type). */
  select_object_type: DisplayText;
  /** Create form title template (system:form.create_title). */
  form_create_title: DisplayText;
  /** Create form submit label (system:form.submit_create). */
  form_submit_create: DisplayText;
};

export type VaultAIChrome = {
  title: DisplayText;
  empty_hint: DisplayText;
  input_placeholder: DisplayText;
  tab_input_placeholder: DisplayText;
  select_action_prompt: DisplayText;
  stop: DisplayText;
  send: DisplayText;
  time_just_now: DisplayText;
  time_minutes: DisplayText;
  time_hours: DisplayText;
  time_days: DisplayText;
  stopped: DisplayText;
  new_chat: DisplayText;
  recent_chats: DisplayText;
  untitled_chat: DisplayText;
  unavailable: DisplayText;
  unavailable_with_reason: DisplayText;
  full_view: DisplayText;
  panel_view: DisplayText;
  float_view: DisplayText;
  pin: DisplayText;
  unpin: DisplayText;
  start_trace: DisplayText;
  stop_trace: DisplayText;
  trace_json: DisplayText;
  trace_ended: DisplayText;
  close: DisplayText;
  disclaimer: DisplayText;
  no_record_context: DisplayText;
  actions_section: DisplayText;
  history: DisplayText;
  history_title: DisplayText;
  history_empty: DisplayText;
  greeting_hi: DisplayText;
  help_prompt: DisplayText;
  tab_empty_subtitle: DisplayText;
  try_asking: DisplayText;
  starter_prompt_1: DisplayText;
  starter_prompt_2: DisplayText;
  starter_prompt_3: DisplayText;
  continue_recent: DisplayText;
  tab_disclaimer: DisplayText;
  what_can_i_do: DisplayText;
  collapse_sidebar: DisplayText;
  expand_sidebar: DisplayText;
  open_menu: DisplayText;
  canvas_title: DisplayText;
  canvas_close: DisplayText;
  canvas_review_query: DisplayText;
  canvas_hide_query: DisplayText;
  canvas_run_query: DisplayText;
  canvas_discard: DisplayText;
  canvas_pending_hint: DisplayText;
  canvas_status_pending: DisplayText;
  canvas_status_clarify: DisplayText;
  canvas_status_running: DisplayText;
  canvas_status_complete: DisplayText;
  canvas_status_rejected: DisplayText;
  canvas_status_error: DisplayText;
  canvas_row_count: DisplayText;
  canvas_truncated: DisplayText;
  canvas_empty_results: DisplayText;
  canvas_feedback_prompt: DisplayText;
  canvas_object_label: DisplayText;
  suggested: DisplayText;
  tasks_pill: DisplayText;
  tasks_count: DisplayText;
  show_my_tasks: DisplayText;
  result_open: DisplayText;
  result_opened: DisplayText;
  generated_vql: DisplayText;
  download_excel: DisplayText;
  result_as_of: DisplayText;
  history_from_chat: DisplayText;
  history_chat_unavailable: DisplayText;
  result_list_title: DisplayText;
  result_list_title_fallback: DisplayText;
  ask_user_other: DisplayText;
  ask_user_placeholder: DisplayText;
  ask_user_submit: DisplayText;
};

export type CfgPackagingChrome = {
  import_package: DisplayText;
  imported_package: DisplayText;
  review_select_steps_heading: DisplayText;
  review_reorder_steps_heading: DisplayText;
  deployment_confirmation_heading: DisplayText;
  back_to_package: DisplayText;
  inbound_packages: DisplayText;
  wizard_select_steps: DisplayText;
  wizard_confirm: DisplayText;
  blocked_steps_warning: DisplayText;
  show_blocked_status: DisplayText;
  reorder: DisplayText;
  steps_selected: DisplayText;
  exclusions_saved: DisplayText;
  step_numbers_unique: DisplayText;
  step_numbers_min: DisplayText;
  step_order_saved: DisplayText;
  deploy_finished: DisplayText;
  comparison_dependencies_title: DisplayText;
  close: DisplayText;
  comparison_tab: DisplayText;
  dependencies_tab: DisplayText;
  column_operation: DisplayText;
  column_item: DisplayText;
  column_from_target: DisplayText;
  column_to: DisplayText;
  column_component_name: DisplayText;
  column_component_type: DisplayText;
  column_subcomponent_name: DisplayText;
  column_subcomponent_type: DisplayText;
  column_referenced_by_name: DisplayText;
  column_status: DisplayText;
  column_step: DisplayText;
  column_step_type: DisplayText;
  column_label: DisplayText;
  column_name: DisplayText;
  column_type: DisplayText;
  column_deployment_status: DisplayText;
  column_deployment_action: DisplayText;
  filter_all_operations: DisplayText;
  filter_change: DisplayText;
  filter_add: DisplayText;
  filter_remove: DisplayText;
  filter_modify: DisplayText;
  filter_no_change: DisplayText;
  filter_all_statuses: DisplayText;
  search_placeholder: DisplayText;
  no_differences: DisplayText;
  no_dependencies: DisplayText;
  finish: DisplayText;
  resume_deploy: DisplayText;
  next: DisplayText;
  view_add_dependencies: DisplayText;
  view_add_dependencies_failed: DisplayText;
  view_add_dependencies_dialog_title: DisplayText;
  view_add_dependencies_dialog_description: DisplayText;
  view_add_dependencies_target_vault_warning: DisplayText;
  no_missing_dependencies: DisplayText;
  select_all_dependencies: DisplayText;
  add: DisplayText;
  component_fallback: DisplayText;
  deps_pagination_range: DisplayText;
  import_started: DisplayText;
  deploy_started: DisplayText;
  export_started: DisplayText;
};

export type DocumentViewerChrome = {
  title: DisplayText;
  checked_out_by_you: DisplayText;
  checked_out: DisplayText;
  import_from_feishu: DisplayText;
  edit_in_provider: DisplayText;
  sync_from_provider: DisplayText;
  content_not_available: DisplayText;
  content_permission_denied: DisplayText;
  no_source_file: DisplayText;
  pages_count: DisplayText;
  generating_viewable: DisplayText;
  rendition_failed: DisplayText;
  preview_not_available: DisplayText;
  media_playback_unavailable: DisplayText;
  media_transcoding: DisplayText;
  media_transcode_failed: DisplayText;
  media_playback_rate: DisplayText;
  save_to_upload: DisplayText;
  save_to_upload_hint: DisplayText;
  uploading: DisplayText;
  upload_source_file: DisplayText;
  upload_source_hint: DisplayText;
  no_source_hint: DisplayText;
  browse_files: DisplayText;
  importing_from_feishu: DisplayText;
  syncing_from_feishu: DisplayText;
  feishu_export_hint: DisplayText;
  feishu_resync_hint: DisplayText;
  create_draft: DisplayText;
  check_in: DisplayText;
  upload_new_version: DisplayText;
  upload_failed: DisplayText;
  create_draft_failed: DisplayText;
  copying_from_current_version: DisplayText;
  copying_from_current_version_n: DisplayText;
  no_file_selected_yet: DisplayText;
  feishu_document: DisplayText;
  upload: DisplayText;
  create: DisplayText;
  untitled_document: DisplayText;
  intro_create_draft: DisplayText;
  intro_upload: DisplayText;
  state_phrase: DisplayText;
  state_phrase_with_label: DisplayText;
  select_file_prompt: DisplayText;
  copy_from_current_version: DisplayText;
  upload_from_computer: DisplayText;
  file_label: DisplayText;
  version_description_label: DisplayText;
  creating_draft: DisplayText;
  creating_draft_hint: DisplayText;
  creating_new_version_hint: DisplayText;
  uploaded_file: DisplayText;
  imported_from_feishu: DisplayText;
  synced_from_feishu: DisplayText;
  feishu_not_enabled: DisplayText;
  load_viewer_failed: DisplayText;
  load_preview_failed: DisplayText;
  highlight_not_found: DisplayText;
  loading_page: DisplayText;
  loading_page_of: DisplayText;
  my_space: DisplayText;
  shared_and_wiki: DisplayText;
  folders: DisplayText;
  files_in_folder: DisplayText;
  no_importable_files: DisplayText;
  load_more: DisplayText;
  reconnect_feishu: DisplayText;
  browse_my_space_hint: DisplayText;
  search_shared_hint: DisplayText;
  search: DisplayText;
  search_placeholder: DisplayText;
  no_matching_files: DisplayText;
  or_feishu_picker: DisplayText;
  loading_feishu_picker: DisplayText;
  redirecting_authorize: DisplayText;
  feishu_permission_error: DisplayText;
  search_unavailable: DisplayText;
  search_failed: DisplayText;
  picker_failed: DisplayText;
  import_failed: DisplayText;
  reconnect_failed: DisplayText;
  no_file_token: DisplayText;
  file_type_document: DisplayText;
  file_type_spreadsheet: DisplayText;
  file_type_bitable: DisplayText;
  file_type_file: DisplayText;
  view_annotations: DisplayText;
  close_annotations: DisplayText;
  annotations_title: DisplayText;
  annotations_filters: DisplayText;
  annotations_filters_reset: DisplayText;
  annotations_hide: DisplayText;
  annotations_show: DisplayText;
  annotations_previous: DisplayText;
  annotations_next: DisplayText;
  annotations_nav_position: DisplayText;
  annotations_filter_keyword: DisplayText;
  annotations_filter_type: DisplayText;
  annotations_filter_notes: DisplayText;
  annotations_filter_placement: DisplayText;
  annotations_filter_author: DisplayText;
  annotations_filter_created: DisplayText;
  annotations_filter_created_today: DisplayText;
  annotations_filter_created_7d: DisplayText;
  annotations_filter_created_30d: DisplayText;
  annotations_filter_tags: DisplayText;
  annotations_filter_version: DisplayText;
  annotations_filter_all: DisplayText;
  annotations_filter_none: DisplayText;
  annotations_filter_open: DisplayText;
  annotations_filter_resolved: DisplayText;
  annotations_filter_placed: DisplayText;
  annotations_filter_page_level: DisplayText;
  annotations_type_note: DisplayText;
  annotations_type_anchor: DisplayText;
  annotations_type_line: DisplayText;
  annotations_type_document_link: DisplayText;
  annotations_type_permalink: DisplayText;
  annotations_filter_links: DisplayText;
  annotations_link_picker_title: DisplayText;
  annotations_permalink_picker_title: DisplayText;
  annotations_permalink_page: DisplayText;
  annotations_select_anchors: DisplayText;
  annotations_link_whole_document: DisplayText;
  annotations_create_new_anchor: DisplayText;
  annotations_create_anchor_banner: DisplayText;
  annotations_create_anchor_saved: DisplayText;
  annotations_linked_documents: DisplayText;
  annotations_linked_documents_empty: DisplayText;
  annotations_linked_view_target: DisplayText;
  annotations_linked_focus: DisplayText;
  annotations_linked_remove_blocked: DisplayText;
  annotations_linked_add: DisplayText;
  annotations_link_anchors_empty: DisplayText;
  annotations_filter_link_anchor: DisplayText;
  annotations_link_picker_search: DisplayText;
  annotations_link_picker_empty: DisplayText;
  annotations_link_picker_confirm: DisplayText;
  annotations_version_this: DisplayText;
  annotations_version_previous: DisplayText;
  annotations_filtered_empty: DisplayText;
  annotate_reply: DisplayText;
  annotate_reply_placeholder: DisplayText;
  annotate_mention_hint: DisplayText;
  annotate_reply_empty: DisplayText;
  annotate_tags: DisplayText;
  annotate_tags_add: DisplayText;
  annotate_tags_placeholder: DisplayText;
  annotate_select: DisplayText;
  annotate_menu: DisplayText;
  annotate_tools: DisplayText;
  annotate_delete: DisplayText;
  annotate_resolve: DisplayText;
  annotate_reopen: DisplayText;
  annotate_bring_forward: DisplayText;
  annotate_bring_forward_none: DisplayText;
  annotate_bring_forward_done: DisplayText;
  annotate_title: DisplayText;
  annotate_body: DisplayText;
  annotate_save: DisplayText;
  annotate_delete_action: DisplayText;
  annotate_replies_heading: DisplayText;
  annotate_saved: DisplayText;
  annotate_unsaved: DisplayText;
  annotate_discard_title: DisplayText;
  annotate_discard_body: DisplayText;
  annotate_discard: DisplayText;
  annotate_keep_editing: DisplayText;
  annotate_delete_confirm_title: DisplayText;
  annotate_delete_confirm_body: DisplayText;
  annotate_delete_reply_confirm_title: DisplayText;
  annotate_delete_reply_confirm_body: DisplayText;
  annotate_untitled: DisplayText;
  annotate_loading: DisplayText;
  annotate_resolved_badge: DisplayText;
  annotate_empty_hint: DisplayText;
  annotate_page_label: DisplayText;
  annotate_error_generic: DisplayText;
  annotate_error_create: DisplayText;
  annotate_error_save: DisplayText;
  annotate_error_delete: DisplayText;
  annotate_error_reply: DisplayText;
  annotate_error_delete_reply: DisplayText;
  annotate_error_search: DisplayText;
  annotate_error_anchors: DisplayText;
  annotate_error_permalink: DisplayText;
  annotate_error_document_link: DisplayText;
  annotate_error_resolve_permalink: DisplayText;
  annotate_error_bring_forward: DisplayText;
  annotate_mention_empty: DisplayText;
  annotate_mention_loading: DisplayText;
  annotate_link_kind_document: DisplayText;
  annotate_link_kind_anchor: DisplayText;
};

export type DomainUserChrome = {
  field_label: DisplayText;
  name_label: DisplayText;
  username_label: DisplayText;
  email_label: DisplayText;
  search_placeholder: DisplayText;
  no_matching: DisplayText;
  create_action: DisplayText;
  load_failed: DisplayText;
  create_title: DisplayText;
  first_name_label: DisplayText;
  last_name_label: DisplayText;
  language_label: DisplayText;
  locale_label: DisplayText;
  timezone_label: DisplayText;
  user_name_label: DisplayText;
  list_title: DisplayText;
  col_home_domain: DisplayText;
  col_domain_admin: DisplayText;
  col_cross_domain: DisplayText;
  col_status: DisplayText;
  status_active: DisplayText;
  status_inactive: DisplayText;
  yes: DisplayText;
  no: DisplayText;
  empty: DisplayText;
  empty_filtered: DisplayText;
  unknown_view: DisplayText;
  details: DisplayText;
  vault_memberships: DisplayText;
  actions: DisplayText;
  company: DisplayText;
  license_type: DisplayText;
  security_profile: DisplayText;
  vault: DisplayText;
  membership_status: DisplayText;
  no_memberships: DisplayText;
  change_status_to_active: DisplayText;
  change_status_to_inactive: DisplayText;
  change_status_active_help: DisplayText;
  change_status_inactive_help: DisplayText;
  export_csv: DisplayText;
};

export type OperationsChrome = {
  group_jobs: DisplayText;
  group_email_notifications: DisplayText;
  job_definitions_title: DisplayText;
  job_status_title: DisplayText;
  job_queues_title: DisplayText;
  sdk_job_metadata: DisplayText;
  email_suppression_list: DisplayText;
  email_notification_status: DisplayText;
  job_title: DisplayText;
  job_type: DisplayText;
  schedule: DisplayText;
  date_based_object_operation: DisplayText;
  user_account_activation: DisplayText;
  status_active: DisplayText;
  status_inactive: DisplayText;
  schedule_hourly: DisplayText;
  schedule_daily: DisplayText;
  schedule_weekly: DisplayText;
  schedule_monthly: DisplayText;
  job_id: DisplayText;
  started_time: DisplayText;
  completion_time: DisplayText;
  scheduled_start_time: DisplayText;
  job_status: DisplayText;
  scheduled: DisplayText;
  running: DisplayText;
  history: DisplayText;
  start_now: DisplayText;
  started: DisplayText;
  cancelled: DisplayText;
  queued: DisplayText;
  success: DisplayText;
  failed: DisplayText;
  errors_encountered: DisplayText;
  missed_schedule: DisplayText;
  failed_to_run: DisplayText;
  completed_due_to_inactivity: DisplayText;
  max_concurrent_jobs: DisplayText;
  description: DisplayText;
  saved: DisplayText;
  source: DisplayText;
  source_standard: DisplayText;
  source_custom: DisplayText;
  sdk_job_metadata_detail: DisplayText;
  email_suppression_help: DisplayText;
  email_address: DisplayText;
  suppression_reason: DisplayText;
  suppression_date: DisplayText;
  suppression_search_placeholder: DisplayText;
  result_count: DisplayText;
  remove_from_suppression: DisplayText;
  remove_multiple_from_suppression: DisplayText;
  remove_one_confirm: DisplayText;
  remove_many_confirm: DisplayText;
  delete_action: DisplayText;
  send_date: DisplayText;
  recipient_name: DisplayText;
  error_message: DisplayText;
  document_number: DisplayText;
  object_record_name: DisplayText;
  subject: DisplayText;
  export_to_csv: DisplayText;
  emails_show_summary: DisplayText;
  email_status_sent: DisplayText;
  email_status_delivered: DisplayText;
  email_status_failed: DisplayText;
  email_status_blocked: DisplayText;
  email_status_skipped: DisplayText;
  email_status_pending: DisplayText;
  email_status_summary: DisplayText;
  email_status_sent_unknown: DisplayText;
};

export type DeploymentChrome = {
  group_environment: DisplayText;
  group_migration: DisplayText;
};

export type ConfigurationChrome = {
  group_object_setup: DisplayText;
  group_business_logic: DisplayText;
  group_tooling: DisplayText;
  add_favorite_aria: DisplayText;
  remove_favorite_aria: DisplayText;
};

export type CompletenessHoverChrome = {
  dependencies_count: DisplayText;
  milestone: DisplayText;
  planned_finish_date: DisplayText;
  actual_finish_date: DisplayText;
  expected_documents: DisplayText;
  expected: DisplayText;
  actual: DisplayText;
  approved: DisplayText;
  view_all_expected_documents: DisplayText;
  documents_count: DisplayText;
  name_version: DisplayText;
  status: DisplayText;
  clinical_user_tasks: DisplayText;
  total: DisplayText;
  complete: DisplayText;
  required: DisplayText;
  complete_required: DisplayText;
  view_all_tasks: DisplayText;
};

export type ListChrome = {
  loading_list: DisplayText;
  list_view_aria: DisplayText;
  views_title: DisplayText;
  filters_title: DisplayText;
  keyword: DisplayText;
  keyword_placeholder: DisplayText;
  search_columns: DisplayText;
  active_users_view: DisplayText;
  field: DisplayText;
  all_filterable_fields: DisplayText;
  first_page: DisplayText;
  previous_page: DisplayText;
  next_page: DisplayText;
  page_input_label: DisplayText;
  left_first_page: DisplayText;
  page_size_label: DisplayText;
  page_size_option: DisplayText;
  record_count: DisplayText;
  pagination_range: DisplayText;
  empty_list: DisplayText;
  config_error_list: DisplayText;
  sort_fallback_notice: DisplayText;
  create: DisplayText;
  select_object_type: DisplayText;
  edit_columns: DisplayText;
  edit_columns_title: DisplayText;
  edit_filters: DisplayText;
  edit_filters_title: DisplayText;
  available_columns: DisplayText;
  selected_columns: DisplayText;
  available_filters: DisplayText;
  selected_filters: DisplayText;
  restore_defaults: DisplayText;
  columns_search_placeholder: DisplayText;
  move_all_right: DisplayText;
  move_right: DisplayText;
  move_left: DisplayText;
  move_all_left: DisplayText;
  move_to_top: DisplayText;
  move_up: DisplayText;
  move_down: DisplayText;
  move_to_bottom: DisplayText;
  close_dialog: DisplayText;
  cell_text_truncate: DisplayText;
  cell_text_wrap: DisplayText;
  freeze_column: DisplayText;
  unfreeze_column: DisplayText;
  freeze_column_none: DisplayText;
  display_preferences: DisplayText;
  manage_views: DisplayText;
  manage_views_title: DisplayText;
  edit_views: DisplayText;
  edit_views_title: DisplayText;
  save_view: DisplayText;
  save_view_as: DisplayText;
  rename_view: DisplayText;
  share_view: DisplayText;
  remove_from_sidebar: DisplayText;
  search_views: DisplayText;
  sort_by_label: DisplayText;
  sort_by_creation_date: DisplayText;
  view_owner_label: DisplayText;
  save_view_dialog_info: DisplayText;
  list_actions_aria: DisplayText;
  create_view: DisplayText;
  edit_view: DisplayText;
  delete_view: DisplayText;
  copy_view: DisplayText;
  set_personal_default: DisplayText;
  clear_personal_default: DisplayText;
  personal_default_badge: DisplayText;
  view_label: DisplayText;
  view_criteria: DisplayText;
  view_criteria_help: DisplayText;
  delete_view_confirm: DisplayText;
  add_favorite_aria: DisplayText;
  remove_favorite_aria: DisplayText;
  active_filter_label: DisplayText;
  active_filters_heading: DisplayText;
  clear_all_filters: DisplayText;
  link_to_record: DisplayText;
  facet_undefined: DisplayText;
  facet_search_placeholder: DisplayText;
  facet_clear_field: DisplayText;
  facet_loading: DisplayText;
  facet_advanced: DisplayText;
  facet_basic: DisplayText;
  facet_op_in: DisplayText;
  facet_op_equals: DisplayText;
  facet_op_not_equal: DisplayText;
  facet_op_contains: DisplayText;
  facet_op_blank: DisplayText;
  facet_op_not_blank: DisplayText;
  date_filter_range: DisplayText;
  date_filter_before: DisplayText;
  date_filter_after: DisplayText;
  date_filter_equals: DisplayText;
  date_filter_blank: DisplayText;
  date_filter_not_blank: DisplayText;
  date_filter_preset_label: DisplayText;
  date_filter_last_n: DisplayText;
  date_filter_next_n: DisplayText;
  date_filter_not_last_n: DisplayText;
  date_filter_last_full_n: DisplayText;
  date_unit_days: DisplayText;
  date_unit_weeks: DisplayText;
  date_unit_months: DisplayText;
  date_unit_quarters: DisplayText;
  date_unit_years: DisplayText;
  number_filter_equals: DisplayText;
  number_filter_blank: DisplayText;
  number_filter_not_blank: DisplayText;
  number_filter_value_placeholder: DisplayText;
  date_preset_today: DisplayText;
  date_preset_yesterday: DisplayText;
  date_preset_this_week: DisplayText;
  date_preset_last_week: DisplayText;
  date_preset_next_week: DisplayText;
  date_preset_current_month: DisplayText;
  date_preset_prior_month: DisplayText;
  date_preset_next_month: DisplayText;
  date_preset_current_quarter: DisplayText;
  date_preset_prior_quarter: DisplayText;
  date_preset_next_quarter: DisplayText;
  date_preset_current_year: DisplayText;
  date_preset_prior_year: DisplayText;
  date_preset_next_year: DisplayText;
};

export type PageActionLabels = {
  edit: DisplayText;
  delete: DisplayText;
  deleting: DisplayText;
  copy: DisplayText;
  audit: DisplayText;
  all_actions: DisplayText;
  layout: DisplayText;
  switch_layout: DisplayText;
  favorite: DisplayText;
  unfavorite: DisplayText;
  menu_group_manage: DisplayText;
  menu_group_edit: DisplayText;
  menu_group_view: DisplayText;
  workflow_and_state_change: DisplayText;
  menu_group_start_workflow: DisplayText;
  menu_group_change_state: DisplayText;
  view_object_record: DisplayText;
  view_document: DisplayText;
  view_binder: DisplayText;
  vault_ai_chat: DisplayText;
};

export type PageMessages = {
  loading_detail: DisplayText;
  refreshing_detail: DisplayText;
  delete_confirm: DisplayText;
  preview_readonly: DisplayText;
  list_fallback: DisplayText;
  empty_sections: DisplayText;
  related_objects: DisplayText;
  section_nav_aria: DisplayText;
  record_list_position: DisplayText;
  prev_record: DisplayText;
  next_record: DisplayText;
  collapse_section_nav: DisplayText;
  expand_section_nav: DisplayText;
};

export type WorkflowChrome = {
  title: DisplayText;
  task_fallback: DisplayText;
  sign_and_complete: DisplayText;
  processing: DisplayText;
  cancel_workflow: DisplayText;
  cancel_reason_prompt: DisplayText;
  cancel_failed: DisplayText;
  refresh_failed: DisplayText;
  signature_init_failed: DisplayText;
  signature_title_prefix: DisplayText;
  confirm_password: DisplayText;
  signature_failed: DisplayText;
  signature_esig_forbidden: DisplayText;
  submitting: DisplayText;
  confirm_signature: DisplayText;
  signature_capacity_label: DisplayText;
  signature_capacity_required: DisplayText;
  approve_or_reject_title: DisplayText;
  approve_reject_esign_instructions: DisplayText;
  signature_role_label: DisplayText;
  signature_username_label: DisplayText;
  signature_username_required: DisplayText;
  signature_username_mismatch: DisplayText;
  required_to_proceed: DisplayText;
  empty_timeline: DisplayText;
  signature_required_badge: DisplayText;
  timeline_owner: DisplayText;
  timeline_started: DisplayText;
  timeline_finished: DisplayText;
  timeline_completed: DisplayText;
  timeline_tasks_summary: DisplayText;
  timeline_state_change: DisplayText;
  timeline_from_state: DisplayText;
  timeline_view_participants: DisplayText;
  timeline_reassign_task: DisplayText;
  timeline_cancel_task: DisplayText;
  timeline_tasks_truncated: DisplayText;
  timeline_add_participants: DisplayText;
  timeline_replace_owner: DisplayText;
  timeline_email_participants: DisplayText;
  timeline_update_workflow_due_date: DisplayText;
  timeline_update_task_due_date: DisplayText;
  timeline_action_column: DisplayText;
  timeline_details_column: DisplayText;
  timeline_cancelled: DisplayText;
  timeline_no_tasks: DisplayText;
  timeline_unassigned: DisplayText;
  timeline_due: DisplayText;
  timeline_version: DisplayText;
  due_overdue: DisplayText;
  due_coming_soon: DisplayText;
  due_on_track: DisplayText;
  participants_group_column: DisplayText;
  participants_type_column: DisplayText;
  participants_user_column: DisplayText;
  participants_added_column: DisplayText;
  participants_task_status_column: DisplayText;
  participants_related_tasks: DisplayText;
  participants_view_tasks: DisplayText;
  participants_task_status_active: DisplayText;
  participants_task_status_completed: DisplayText;
  participants_task_status_potential: DisplayText;
  participants_loading: DisplayText;
  complete_task: DisplayText;
  claim_task: DisplayText;
  show_more: DisplayText;
  show_less: DisplayText;
  instructions_label: DisplayText;
  continue_to_signature: DisplayText;
  verdict_label: DisplayText;
  verdict_comment: DisplayText;
  verdict_required: DisplayText;
  comment_label: DisplayText;
  comment_required: DisplayText;
  complete_failed: DisplayText;
  complete_task_fallback: DisplayText;
  select_users: DisplayText;
  assignment_available: DisplayText;
  assignment_assigned: DisplayText;
  load_users_failed: DisplayText;
  no_additional_info: DisplayText;
  field_not_on_layout: DisplayText;
};

export type AuditChrome = {
  type_aria: DisplayText;
  panel_login: DisplayText;
  panel_system: DisplayText;
  panel_domain: DisplayText;
  panel_object_records: DisplayText;
  get_history: DisplayText;
  quick_history: DisplayText;
  quick_history_placeholder: DisplayText;
  quick_history_last_day: DisplayText;
  quick_history_last_7_days: DisplayText;
  quick_history_last_2_weeks: DisplayText;
  date_range: DisplayText;
  date_range_to: DisplayText;
  domain_range_required: DisplayText;
  domain_range_too_large: DisplayText;
  trail_title: DisplayText;
  trail_title_for: DisplayText;
  loading_logs: DisplayText;
  loading_records: DisplayText;
  load_logs_failed: DisplayText;
  load_records_failed: DisplayText;
  object_api_name: DisplayText;
  empty_records: DisplayText;
  empty_domain_records: DisplayText;
  empty_columns: DisplayText;
  export_csv: DisplayText;
  exporting: DisplayText;
  export_failed: DisplayText;
  export_timeout: DisplayText;
  filter_user: DisplayText;
  filter_action: DisplayText;
  filter_type: DisplayText;
  filter_status: DisplayText;
  filter_vault_id: DisplayText;
  filter_object: DisplayText;
  filter_time_from: DisplayText;
  filter_time_to: DisplayText;
  include_related_objects: DisplayText;
  include_related_help: DisplayText;
  include_related_placeholder: DisplayText;
  filter_timestamp: DisplayText;
  filter_all: DisplayText;
  filter_in_range: DisplayText;
  filter_equals: DisplayText;
  add_filter: DisplayText;
  showing_events_for: DisplayText;
  apply: DisplayText;
  col_timestamp_alphanumeric: DisplayText;
  col_timestamp_iso8601: DisplayText;
  col_timestamp_numeric: DisplayText;
  col_user_name: DisplayText;
  col_event_description: DisplayText;
  col_record: DisplayText;
  col_item: DisplayText;
  col_source_ip: DisplayText;
  col_type: DisplayText;
  col_status: DisplayText;
  col_browser: DisplayText;
  col_platform: DisplayText;
  col_vault_id: DisplayText;
  field_changed_from: DisplayText;
  field_set_to: DisplayText;
  item_created: DisplayText;
  on_behalf_of: DisplayText;
  none: DisplayText;
  lifecycle_via: DisplayText;
  trigger_create: DisplayText;
  trigger_user_action: DisplayText;
  trigger_entry_action: DisplayText;
  trigger_event_action: DisplayText;
  close: DisplayText;
};

export type SharingChrome = {
  title: DisplayText;
  help: DisplayText;
  loading: DisplayText;
  load_failed: DisplayText;
  empty_rows: DisplayText;
  filter_roles: DisplayText;
  filter_members: DisplayText;
  add: DisplayText;
  display_rule: DisplayText;
  all_roles: DisplayText;
  all_users_and_groups: DisplayText;
  pagination_template: DisplayText;
  member_user_aria: DisplayText;
  member_group_aria: DisplayText;
  add_dialog_title: DisplayText;
  add_role_label: DisplayText;
  add_member_label: DisplayText;
  add_search_label: DisplayText;
  add_submit: DisplayText;
  add_cancel: DisplayText;
  add_failed: DisplayText;
  remove: DisplayText;
  remove_confirm: DisplayText;
  remove_failed: DisplayText;
};

export type FormChrome = {
  loading_form: DisplayText;
  saving: DisplayText;
  create_title: DisplayText;
  edit_title: DisplayText;
  copy_title: DisplayText;
  layout_prefix: DisplayText;
  updating_rules: DisplayText;
  list_fallback: DisplayText;
  submit_create: DisplayText;
  submit_save: DisplayText;
  submit_save_create: DisplayText;
  record_created: DisplayText;
  record_id_placeholder: DisplayText;
  related_after_save: DisplayText;
  field_required: DisplayText;
  field_invalid_email: DisplayText;
  validation_fix_fields: DisplayText;
  /** DateTime field shortcut — Veeva "Now" / 「现在」. */
  datetime_now: DisplayText;
  section_nav_aria: DisplayText;
  collapse_section_nav: DisplayText;
  expand_section_nav: DisplayText;
  open_calendar: DisplayText;
};

export type ClinicalHomeChrome = {
  empty_no_items: DisplayText;
  no_details_available: DisplayText;
  no_enrollment_data: DisplayText;
  last_updated: DisplayText;
  average: DisplayText;
  select_study: DisplayText;
  select_study_country: DisplayText;
  select_site: DisplayText;
  study_scope_aria: DisplayText;
  load_failed_cra: DisplayText;
  load_failed_study_mgmt: DisplayText;
  study_homepage_title: DisplayText;
  study_mgmt_homepage_title: DisplayText;
  summary_metrics: DisplayText;
  monitoring_plan: DisplayText;
  monitoring_compliance: DisplayText;
  monitoring_status: DisplayText;
  my_tasks: DisplayText;
  milestones: DisplayText;
  view_all: DisplayText;
  create: DisplayText;
  export: DisplayText;
  create_communication_log: DisplayText;
  create_issue: DisplayText;
  create_task: DisplayText;
  column_name: DisplayText;
  column_study_site: DisplayText;
  column_planned_visit_start_date: DisplayText;
  column_lifecycle_state: DisplayText;
  column_task_name: DisplayText;
  column_task_due_date: DisplayText;
  column_milestone: DisplayText;
  column_baseline_finish_date: DisplayText;
  column_planned_finish_date: DisplayText;
  column_actual_finish_date: DisplayText;
  column_completeness: DisplayText;
  column_sequence: DisplayText;
  visits_overdue: DisplayText;
  milestone_category: DisplayText;
  metric_actual: DisplayText;
  metric_planned: DisplayText;
  metric_forecast: DisplayText;
  enrollment_rate_default: DisplayText;
  missing_data_warning: DisplayText;
  enrollment_chart_aria: DisplayText;
  number_of_subjects: DisplayText;
};

export type TMFHomeChrome = {
  study_homepage_title: DisplayText;
  study_scope_aria: DisplayText;
  select_study: DisplayText;
  select_study_country: DisplayText;
  select_site: DisplayText;
  related_pages_aria: DisplayText;
  load_failed: DisplayText;
  create: DisplayText;
  view_all: DisplayText;
  upcoming_milestones: DisplayText;
  milestone_category: DisplayText;
  no_upcoming_milestones: DisplayText;
  column_milestone: DisplayText;
  column_completeness: DisplayText;
  column_planned_finish_date: DisplayText;
  column_baseline_finish_date: DisplayText;
  completeness: DisplayText;
  unapproved_documents: DisplayText;
  complete: DisplayText;
  review_overcount: DisplayText;
  review_pending_decisions: DisplayText;
  timeliness: DisplayText;
  approved_within_days: DisplayText;
  approved_after_days: DisplayText;
  tasks_requiring_attention: DisplayText;
  overdue: DisplayText;
  unassigned: DisplayText;
  due_today: DisplayText;
  my_tasks: DisplayText;
  no_items_found: DisplayText;
  column_task_name: DisplayText;
  column_task_due_date: DisplayText;
  quality_issues: DisplayText;
  filter_open: DisplayText;
  filter_closed: DisplayText;
  filter_all: DisplayText;
  filter_assigned_to_me: DisplayText;
};

export type TMFViewerChrome = {
  title: DisplayText;
  subtitle: DisplayText;
  load_failed: DisplayText;
  filter_study: DisplayText;
  filter_study_country: DisplayText;
  filter_study_site: DisplayText;
  filter_view_model: DisplayText;
  select_study: DisplayText;
  all_countries: DisplayText;
  all_sites: DisplayText;
  select_view: DisplayText;
  documents_count: DisplayText;
  expand_all: DisplayText;
  collapse_all: DisplayText;
  empty_tree: DisplayText;
  documents_title: DisplayText;
  shown_count: DisplayText;
  in_branch_count: DisplayText;
  empty_documents: DisplayText;
  column_document: DisplayText;
  column_classification: DisplayText;
  column_status: DisplayText;
  column_document_date: DisplayText;
  column_filing_level: DisplayText;
};

export type MilestoneWorkspaceChrome = {
  title: DisplayText;
  object_label: DisplayText;
  expected_documents_title: DisplayText;
  back: DisplayText;
  load_failed: DisplayText;
  empty_items: DisplayText;
  empty_hint: DisplayText;
  items_count: DisplayText;
  filter_department: DisplayText;
  filter_completeness: DisplayText;
  filter_requiredness: DisplayText;
  search_name: DisplayText;
  all_departments: DisplayText;
  all_completeness: DisplayText;
  all_requiredness: DisplayText;
  column_expected_document: DisplayText;
  column_completeness_status: DisplayText;
  column_level: DisplayText;
  column_document_type: DisplayText;
  column_document_subtype: DisplayText;
  column_classification: DisplayText;
  column_requiredness: DisplayText;
  column_expected_count: DisplayText;
  column_steady_state_count: DisplayText;
  column_all_doc_count: DisplayText;
  column_completeness: DisplayText;
  column_study: DisplayText;
};

export type BinderChrome = {
  title: DisplayText;
  load_failed: DisplayText;
  hide_empty_sections: DisplayText;
  filter_filing_origin: DisplayText;
  filing_origin_all: DisplayText;
  filing_origin_auto: DisplayText;
  filing_origin_manual: DisplayText;
  expand_all: DisplayText;
  collapse_all: DisplayText;
  empty_tree: DisplayText;
  empty_tree_all_hidden: DisplayText;
  show_all_sections: DisplayText;
  documents_title: DisplayText;
  empty_documents: DisplayText;
  documents_count: DisplayText;
  column_document: DisplayText;
  column_status: DisplayText;
  column_filing_origin: DisplayText;
  refresh_autofiling: DisplayText;
  refresh_queued: DisplayText;
  refresh_failed: DisplayText;
  metadata_toggle: DisplayText;
  empty_binders: DisplayText;
  select_binder: DisplayText;
  open_binder: DisplayText;
  add_documents: DisplayText;
  create_document: DisplayText;
  remove_documents: DisplayText;
  move_documents: DisplayText;
  move_documents_title: DisplayText;
  target_section: DisplayText;
  add_documents_title: DisplayText;
  document_field: DisplayText;
  create_custom_section: DisplayText;
  rename_custom_section: DisplayText;
  delete_custom_section: DisplayText;
  custom_section_title: DisplayText;
  section_number_field: DisplayText;
  section_name_field: DisplayText;
  delete_section_confirm: DisplayText;
  move_up: DisplayText;
  move_down: DisplayText;
  sync_structure: DisplayText;
  sync_structure_done: DisplayText;
  deprecated_badge: DisplayText;
  filter_binding: DisplayText;
  binding_all: DisplayText;
  binding_bound: DisplayText;
  binding_unbound: DisplayText;
  set_binding: DisplayText;
  set_binding_binder: DisplayText;
  set_binding_section: DisplayText;
  set_binding_documents: DisplayText;
  set_binding_title: DisplayText;
  binding_mode_unbound: DisplayText;
  binding_mode_steady: DisplayText;
  binding_mode_latest: DisplayText;
  binding_mode_specific: DisplayText;
  binding_overwrite: DisplayText;
  binding_version_field: DisplayText;
  column_binding: DisplayText;
  bound_badge: DisplayText;
  actions_menu: DisplayText;
  menu_group_documents: DisplayText;
  menu_group_binding: DisplayText;
  menu_group_structure: DisplayText;
  save: DisplayText;
  cancel: DisplayText;
};

export type TaskDashboardChrome = {
  views_heading: DisplayText;
  filters_heading: DisplayText;
  clear_filters: DisplayText;
  all_tasks: DisplayText;
  my_tasks: DisplayText;
  available_tasks: DisplayText;
  active_workflows: DisplayText;
  content_type: DisplayText;
  no_content_types: DisplayText;
  task_owner: DisplayText;
  assigned_to_you: DisplayText;
  unassigned: DisplayText;
  task_due_date: DisplayText;
  overdue: DisplayText;
  due_today: DisplayText;
  next_7_days: DisplayText;
  no_due_date: DisplayText;
  due_date_from_aria: DisplayText;
  due_date_to_aria: DisplayText;
  task_assignment_date: DisplayText;
  assignment_date_from_aria: DisplayText;
  assignment_date_to_aria: DisplayText;
  workflow: DisplayText;
  no_workflows: DisplayText;
  content_count: DisplayText;
  no_content_counts: DisplayText;
  content_count_single: DisplayText;
  content_count_multiple: DisplayText;
  save_view_as: DisplayText;
  layout_aria: DisplayText;
  detail_view: DisplayText;
  grid_view: DisplayText;
  sort_due_date: DisplayText;
  load_failed: DisplayText;
  open_complete_failed: DisplayText;
  complete_failed: DisplayText;
  accept_failed: DisplayText;
  required: DisplayText;
  due_date_prefix: DisplayText;
  task_overdue: DisplayText;
  task_coming_due: DisplayText;
  tasks_count: DisplayText;
  column_task_name: DisplayText;
  column_task_due_date: DisplayText;
  column_task_assignment_date: DisplayText;
  column_workflow_owner: DisplayText;
  column_actions: DisplayText;
  current_user: DisplayText;
  range_text: DisplayText;
  range_empty: DisplayText;
  complete: DisplayText;
  continue: DisplayText;
  claim_task: DisplayText;
  show_more: DisplayText;
  show_less: DisplayText;
  instructions_label: DisplayText;
  owner_label: DisplayText;
};

export const defaultTaskDashboardChrome: TaskDashboardChrome = {
  views_heading: t("Views", "task_dashboard.views_heading"),
  filters_heading: t("Filters", "task_dashboard.filters_heading"),
  clear_filters: t("Clear", "task_dashboard.clear_filters"),
  all_tasks: t("All Tasks", "task_dashboard.all_tasks"),
  my_tasks: t("My Tasks", "task_dashboard.my_tasks"),
  available_tasks: t("Available Tasks", "task_dashboard.available_tasks"),
  active_workflows: t("Active Workflows", "task_dashboard.active_workflows"),
  content_type: t("Content Type", "task_dashboard.content_type"),
  no_content_types: t("No content types", "task_dashboard.no_content_types"),
  task_owner: t("Task Owner", "task_dashboard.task_owner"),
  assigned_to_you: t("Assigned to you", "task_dashboard.assigned_to_you"),
  unassigned: t("Unassigned", "task_dashboard.unassigned"),
  task_due_date: t("Task Due Date", "task_dashboard.task_due_date"),
  overdue: t("Overdue", "task_dashboard.overdue"),
  due_today: t("Due today", "task_dashboard.due_today"),
  next_7_days: t("Next 7 days", "task_dashboard.next_7_days"),
  no_due_date: t("No due date", "task_dashboard.no_due_date"),
  due_date_from_aria: t("Due date from", "task_dashboard.due_date_from_aria"),
  due_date_to_aria: t("Due date to", "task_dashboard.due_date_to_aria"),
  task_assignment_date: t(
    "Task Assignment Date",
    "task_dashboard.task_assignment_date",
  ),
  assignment_date_from_aria: t(
    "Assignment date from",
    "task_dashboard.assignment_date_from_aria",
  ),
  assignment_date_to_aria: t(
    "Assignment date to",
    "task_dashboard.assignment_date_to_aria",
  ),
  workflow: t("Workflow", "task_dashboard.workflow"),
  no_workflows: t("No workflows", "task_dashboard.no_workflows"),
  content_count: t("Content Count", "task_dashboard.content_count"),
  no_content_counts: t("No content counts", "task_dashboard.no_content_counts"),
  content_count_single: t("Single", "task_dashboard.content_count_single"),
  content_count_multiple: t(
    "Multiple",
    "task_dashboard.content_count_multiple",
  ),
  save_view_as: t("Save View As", "task_dashboard.save_view_as"),
  layout_aria: t("Layout", "task_dashboard.layout_aria"),
  detail_view: t("Detail View", "task_dashboard.detail_view"),
  grid_view: t("Grid View", "task_dashboard.grid_view"),
  sort_due_date: t("Due Date", "task_dashboard.sort_due_date"),
  load_failed: t("Failed to load tasks", "task_dashboard.load_failed"),
  open_complete_failed: t(
    "Failed to open complete dialog",
    "task_dashboard.open_complete_failed",
  ),
  complete_failed: t(
    "Failed to complete task",
    "task_dashboard.complete_failed",
  ),
  accept_failed: t("Failed to accept task", "task_dashboard.accept_failed"),
  required: t("Required", "task_dashboard.required"),
  due_date_prefix: t("Due: {date}", "task_dashboard.due_date_prefix"),
  task_overdue: t("Task Overdue", "task_dashboard.task_overdue"),
  task_coming_due: t("Task Coming Due", "task_dashboard.task_coming_due"),
  tasks_count: t("{count} tasks", "task_dashboard.tasks_count"),
  column_task_name: t("Task Name", "task_dashboard.column_task_name"),
  column_task_due_date: t(
    "Task Due Date",
    "task_dashboard.column_task_due_date",
  ),
  column_task_assignment_date: t(
    "Task Assignment Date",
    "task_dashboard.column_task_assignment_date",
  ),
  column_workflow_owner: t(
    "Workflow Owner",
    "task_dashboard.column_workflow_owner",
  ),
  column_actions: t("Actions", "task_dashboard.column_actions"),
  current_user: t("Current User", "task_dashboard.current_user"),
  range_text: t("{start}-{end} of {total}", "task_dashboard.range_text"),
  range_empty: t("0 of {total}", "task_dashboard.range_empty"),
  complete: t("Complete", "task_dashboard.complete"),
  continue: t("Continue", "task_dashboard.continue"),
  claim_task: t("Accept", "workflow.claim_task"),
  show_more: t("Show more", "workflow.show_more"),
  show_less: t("Show less", "workflow.show_less"),
  instructions_label: t("Instructions", "workflow.instructions_label"),
  owner_label: t("Owner", "workflow.timeline_owner"),
};

export type RelatedChrome = {
  loading: DisplayText;
  load_failed: DisplayText;
  load_more_failed: DisplayText;
  create_failed: DisplayText;
  creating: DisplayText;
  confirm_create: DisplayText;
  cancel: DisplayText;
  create_related: DisplayText;
  refresh: DisplayText;
  load_more: DisplayText;
  name_field: DisplayText;
  optional: DisplayText;
  empty_sections: DisplayText;
  related_objects: DisplayText;
  range_text: DisplayText;
  filtered_range_text: DisplayText;
  add_existing: DisplayText;
  search_existing: DisplayText;
  search_title: DisplayText;
  filter_label: DisplayText;
  filter_field_placeholder: DisplayText;
  filter_op_placeholder: DisplayText;
  filter_value_placeholder: DisplayText;
  filter_op_contains: DisplayText;
  filter_op_equals: DisplayText;
  filter_op_not_equals: DisplayText;
  filter_op_blank: DisplayText;
  filter_op_not_blank: DisplayText;
  filter_op_between: DisplayText;
  filter_op_after: DisplayText;
  filter_op_before: DisplayText;
  filter_op_last_n: DisplayText;
  filter_op_next_n: DisplayText;
  filter_unit_days: DisplayText;
  filter_unit_weeks: DisplayText;
  filter_unit_months: DisplayText;
  filter_unit_quarters: DisplayText;
  filter_unit_years: DisplayText;
  add_filter: DisplayText;
  remove_filter: DisplayText;
  filter_search: DisplayText;
  link_selected: DisplayText;
  link_failed: DisplayText;
  search_failed: DisplayText;
  remove_relationship: DisplayText;
  remove_confirm: DisplayText;
  remove_failed: DisplayText;
  removing: DisplayText;
  show_in_tab: DisplayText;
  no_candidates: DisplayText;
  actions: DisplayText;
  select_all: DisplayText;
  unselect_all: DisplayText;
  selected_count: DisplayText;
  bulk_remove: DisplayText;
  bulk_remove_confirm: DisplayText;
  bulk_result: DisplayText;
  delete_record: DisplayText;
  delete_record_confirm: DisplayText;
};

export type AuthChrome = {
  login: DisplayText;
  logging_in: DisplayText;
  login_failed: DisplayText;
  login_failed_with_code: DisplayText;
  continue: DisplayText;
  username: DisplayText;
  password: DisplayText;
  login_help: DisplayText;
  privacy_policy: DisplayText;
  log_in_title: DisplayText;
  welcome_title: DisplayText;
  switch_user: DisplayText;
  loading_vaults: DisplayText;
  load_vaults_failed: DisplayText;
  select_vault: DisplayText;
  select_vault_subtitle: DisplayText;
  load_failed_title: DisplayText;
  no_vaults: DisplayText;
  no_vaults_admin: DisplayText;
  open_vault: DisplayText;
  oauth_denied: DisplayText;
  oauth_unauthorized: DisplayText;
  oauth_no_linked_user: DisplayText;
};

export const defaultVaultAIChrome: VaultAIChrome = {
  title: t("Vault AI", "vault_ai.title"),
  empty_hint: t(
    "Ask a question about this record, or pick a suggested action below.",
    "vault_ai.empty_hint",
  ),
  input_placeholder: t(
    "Type a question to ask Vault AI",
    "vault_ai.input_placeholder",
  ),
  tab_input_placeholder: t(
    "Type a question to ask Vault AI",
    "vault_ai.tab_input_placeholder",
  ),
  select_action_prompt: t(
    "Please select an action based on your question.",
    "vault_ai.select_action_prompt",
  ),
  stop: t("Stop", "vault_ai.stop"),
  send: t("Send", "vault_ai.send"),
  time_just_now: t("just now", "vault_ai.time_just_now"),
  time_minutes: t("{count}m", "vault_ai.time_minutes"),
  time_hours: t("{count}h", "vault_ai.time_hours"),
  time_days: t("{count}d", "vault_ai.time_days"),
  stopped: t("Stopped", "vault_ai.stopped"),
  new_chat: t("New Chat", "vault_ai.new_chat"),
  recent_chats: t("Recent Chats", "vault_ai.recent_chats"),
  untitled_chat: t("Untitled chat", "vault_ai.untitled_chat"),
  unavailable: t("Vault AI unavailable", "vault_ai.unavailable"),
  unavailable_with_reason: t(
    "Vault AI unavailable: {reason}",
    "vault_ai.unavailable_with_reason",
  ),
  full_view: t("Full", "vault_ai.full_view"),
  panel_view: t("Panel", "vault_ai.panel_view"),
  pin: t("Dock", "vault_ai.pin"),
  unpin: t("Float", "vault_ai.unpin"),
  float_view: t("Float", "vault_ai.float_view"),
  start_trace: t("Start Trace", "vault_ai.start_trace"),
  stop_trace: t("Stop Trace ({count}/5)", "vault_ai.stop_trace"),
  trace_json: t("Trace JSON", "vault_ai.trace_json"),
  trace_ended: t("Trace ended", "vault_ai.trace_ended"),
  close: t("Close", "vault_ai.close"),
  disclaimer: t(
    "AI Chat responses may be inaccurate and should be verified.",
    "vault_ai.disclaimer",
  ),
  no_record_context: t(
    "Open a record to chat with Vault AI.",
    "vault_ai.no_record_context",
  ),
  actions_section: t("Actions I can help with", "vault_ai.actions_section"),
  history: t("History", "vault_ai.history"),
  history_title: t("Chat history", "vault_ai.history_title"),
  history_empty: t("No conversations yet", "vault_ai.history_empty"),
  greeting_hi: t("Hi {name}", "vault_ai.greeting_hi"),
  help_prompt: t("What can I help you with?", "vault_ai.help_prompt"),
  tab_empty_subtitle: t(
    "Ask about Vault data in plain language. Queries open in Canvas after you review them.",
    "vault_ai.tab_empty_subtitle",
  ),
  try_asking: t("Try asking", "vault_ai.try_asking"),
  starter_prompt_1: t(
    "Show my open workflow tasks",
    "vault_ai.starter_prompt_1",
  ),
  starter_prompt_2: t(
    "Find documents updated in the last 7 days",
    "vault_ai.starter_prompt_2",
  ),
  starter_prompt_3: t("List active studies", "vault_ai.starter_prompt_3"),
  continue_recent: t("Continue a recent chat", "vault_ai.continue_recent"),
  tab_disclaimer: t(
    "AI Chat responses may be inaccurate and should be verified.",
    "vault_ai.tab_disclaimer",
  ),
  what_can_i_do: t("What can I do?", "vault_ai.what_can_i_do"),
  collapse_sidebar: t("Collapse sidebar", "vault_ai.collapse_sidebar"),
  expand_sidebar: t("Expand sidebar", "vault_ai.expand_sidebar"),
  open_menu: t("Open menu", "vault_ai.open_menu"),
  canvas_title: t("Canvas", "vault_ai.canvas_title"),
  canvas_close: t("Close Canvas", "vault_ai.canvas_close"),
  canvas_review_query: t("Review query", "vault_ai.canvas_review_query"),
  canvas_hide_query: t("Hide query", "vault_ai.canvas_hide_query"),
  canvas_run_query: t("Run query", "vault_ai.canvas_run_query"),
  canvas_discard: t("Discard", "vault_ai.canvas_discard"),
  canvas_pending_hint: t(
    "Review the query below, then run it to see results.",
    "vault_ai.canvas_pending_hint",
  ),
  canvas_status_pending: t("Ready to run", "vault_ai.canvas_status_pending"),
  canvas_status_clarify: t(
    "Needs clarification",
    "vault_ai.canvas_status_clarify",
  ),
  canvas_status_running: t("Running", "vault_ai.canvas_status_running"),
  canvas_status_complete: t("Complete", "vault_ai.canvas_status_complete"),
  canvas_status_rejected: t("Discarded", "vault_ai.canvas_status_rejected"),
  canvas_status_error: t("Error", "vault_ai.canvas_status_error"),
  canvas_row_count: t("{count} results", "vault_ai.canvas_row_count"),
  canvas_truncated: t(
    "Showing first {count} rows",
    "vault_ai.canvas_truncated",
  ),
  canvas_empty_results: t(
    "No matching records",
    "vault_ai.canvas_empty_results",
  ),
  canvas_feedback_prompt: t(
    "Was this helpful?",
    "vault_ai.canvas_feedback_prompt",
  ),
  canvas_object_label: t("Object", "vault_ai.canvas_object_label"),
  suggested: t("Suggested", "vault_ai.suggested"),
  tasks_pill: t("Tasks", "vault_ai.tasks_pill"),
  tasks_count: t("Tasks ({count})", "vault_ai.tasks_count"),
  show_my_tasks: t("Show my tasks", "vault_ai.show_my_tasks"),
  result_open: t("Open", "vault_ai.result_open"),
  result_opened: t("Opened", "vault_ai.result_opened"),
  generated_vql: t("Generated VQL Query", "vault_ai.generated_vql"),
  download_excel: t("Download", "vault_ai.download_excel"),
  result_as_of: t(
    "As of {time} (some links may have expired).",
    "vault_ai.result_as_of",
  ),
  history_from_chat: t("Vault AI Chat", "vault_ai.history_from_chat"),
  history_chat_unavailable: t(
    "This Vault AI Chat cannot be opened from here.",
    "vault_ai.history_chat_unavailable",
  ),
  result_list_title: t("{label} Records", "vault_ai.result_list_title"),
  result_list_title_fallback: t(
    "Query results",
    "vault_ai.result_list_title_fallback",
  ),
  ask_user_other: t("Other", "vault_ai.ask_user_other"),
  ask_user_placeholder: t("Type your answer…", "vault_ai.ask_user_placeholder"),
  ask_user_submit: t("Continue", "vault_ai.ask_user_submit"),
};

export const defaultDocumentViewerChrome: DocumentViewerChrome = {
  title: t("Document Viewer", "document_viewer.title"),
  checked_out_by_you: t(
    "Checked out by you",
    "document_viewer.checked_out_by_you",
  ),
  checked_out: t("Checked out", "document_viewer.checked_out"),
  import_from_feishu: t(
    "Import from Feishu",
    "document_viewer.import_from_feishu",
  ),
  edit_in_provider: t("Edit in {provider}", "document_viewer.edit_in_provider"),
  sync_from_provider: t(
    "Sync from {provider}",
    "document_viewer.sync_from_provider",
  ),
  content_not_available: t(
    "Content not available",
    "document_viewer.content_not_available",
  ),
  content_permission_denied: t(
    "You do not have permission to view this document's content.",
    "document_viewer.content_permission_denied",
  ),
  no_source_file: t("No source file", "document_viewer.no_source_file"),
  pages_count: t("{count} pages", "document_viewer.pages_count"),
  generating_viewable: t(
    "Generating viewable format…",
    "document_viewer.generating_viewable",
  ),
  rendition_failed: t("Rendition failed", "document_viewer.rendition_failed"),
  preview_not_available: t(
    "Preview not available for this file type.",
    "document_viewer.preview_not_available",
  ),
  media_playback_unavailable: t(
    "Media playback is unavailable. Configure CDN or object-store presign for video/audio.",
    "document_viewer.media_playback_unavailable",
  ),
  media_transcoding: t(
    "Transcoding media for playback…",
    "document_viewer.media_transcoding",
  ),
  media_transcode_failed: t(
    "Media transcoding failed",
    "document_viewer.media_transcode_failed",
  ),
  media_playback_rate: t("Speed", "document_viewer.media_playback_rate"),
  save_to_upload: t("Save to upload", "document_viewer.save_to_upload"),
  save_to_upload_hint: t(
    "Save the document record first, then upload a source file here.",
    "document_viewer.save_to_upload_hint",
  ),
  uploading: t("Uploading…", "document_viewer.uploading"),
  upload_source_file: t(
    "Upload source file",
    "document_viewer.upload_source_file",
  ),
  upload_source_hint: t(
    "Choose a file to preview this document.",
    "document_viewer.upload_source_hint",
  ),
  no_source_hint: t(
    "This document does not have a source file.",
    "document_viewer.no_source_hint",
  ),
  browse_files: t("Browse files", "document_viewer.browse_files"),
  importing_from_feishu: t(
    "Importing from Feishu…",
    "document_viewer.importing_from_feishu",
  ),
  syncing_from_feishu: t(
    "Syncing from Feishu…",
    "document_viewer.syncing_from_feishu",
  ),
  feishu_export_hint: t(
    "Exporting source file and PDF. This may take up to a minute.",
    "document_viewer.feishu_export_hint",
  ),
  feishu_resync_hint: t(
    "Re-importing the latest content from Feishu and creating a new version.",
    "document_viewer.feishu_resync_hint",
  ),
  create_draft: t("Create Draft", "document_viewer.create_draft"),
  check_in: t("Check In", "document_viewer.check_in"),
  upload_new_version: t(
    "Upload New Version",
    "document_viewer.upload_new_version",
  ),
  upload_failed: t(
    "Failed to upload source file",
    "document_viewer.upload_failed",
  ),
  create_draft_failed: t(
    "Failed to create draft",
    "document_viewer.create_draft_failed",
  ),
  copying_from_current_version: t(
    "Copying from current version",
    "document_viewer.copying_from_current_version",
  ),
  copying_from_current_version_n: t(
    "Copying from current version ({version})",
    "document_viewer.copying_from_current_version_n",
  ),
  no_file_selected_yet: t(
    "No file selected yet",
    "document_viewer.no_file_selected_yet",
  ),
  feishu_document: t("Feishu document", "document_viewer.feishu_document"),
  upload: t("Upload", "document_viewer.upload"),
  create: t("Create", "document_viewer.create"),
  untitled_document: t("Untitled", "document_viewer.untitled_document"),
  intro_create_draft: t(
    'This action creates a new version of this document "{name}", in the lifecycle starting state.',
    "document_viewer.intro_create_draft",
  ),
  intro_upload: t(
    'This action creates a new version of this document "{name}"{state_phrase}.',
    "document_viewer.intro_upload",
  ),
  state_phrase: t(
    " in the current lifecycle state",
    "document_viewer.state_phrase",
  ),
  state_phrase_with_label: t(
    " in the current lifecycle state ({state})",
    "document_viewer.state_phrase_with_label",
  ),
  select_file_prompt: t(
    "Select a file using one of the following actions",
    "document_viewer.select_file_prompt",
  ),
  copy_from_current_version: t(
    "Copy from current version",
    "document_viewer.copy_from_current_version",
  ),
  upload_from_computer: t(
    "Upload from computer",
    "document_viewer.upload_from_computer",
  ),
  file_label: t("File", "document_viewer.file_label"),
  version_description_label: t(
    "Version Description",
    "document_viewer.version_description_label",
  ),
  creating_draft: t("Creating draft…", "document_viewer.creating_draft"),
  creating_draft_hint: t(
    "Creating a new draft version in the lifecycle starting state.",
    "document_viewer.creating_draft_hint",
  ),
  creating_new_version_hint: t(
    "Creating a new document version.",
    "document_viewer.creating_new_version_hint",
  ),
  uploaded_file: t("Uploaded {name}", "document_viewer.uploaded_file"),
  imported_from_feishu: t(
    "Imported from Feishu",
    "document_viewer.imported_from_feishu",
  ),
  synced_from_feishu: t(
    "Synced from Feishu",
    "document_viewer.synced_from_feishu",
  ),
  feishu_not_enabled: t(
    "Feishu import is not enabled",
    "document_viewer.feishu_not_enabled",
  ),
  load_viewer_failed: t(
    "Failed to load document viewer",
    "document_viewer.load_viewer_failed",
  ),
  load_preview_failed: t(
    "Failed to load document preview",
    "document_viewer.load_preview_failed",
  ),
  highlight_not_found: t(
    "Jumped to page {page}; cited text was not found for highlight.",
    "document_viewer.highlight_not_found",
  ),
  loading_page: t("Loading page {page}…", "document_viewer.loading_page"),
  loading_page_of: t(
    "Loading page {page} of {total}…",
    "document_viewer.loading_page_of",
  ),
  my_space: t("My Space", "document_viewer.my_space"),
  shared_and_wiki: t("Shared & Wiki", "document_viewer.shared_and_wiki"),
  folders: t("Folders", "document_viewer.folders"),
  files_in_folder: t("Files in {folder}", "document_viewer.files_in_folder"),
  no_importable_files: t(
    "No importable files",
    "document_viewer.no_importable_files",
  ),
  load_more: t("Load more", "document_viewer.load_more"),
  reconnect_feishu: t("Reconnect Feishu", "document_viewer.reconnect_feishu"),
  browse_my_space_hint: t(
    "Browse your Feishu cloud space. Shortcuts to shared files are resolved automatically.",
    "document_viewer.browse_my_space_hint",
  ),
  search_shared_hint: t(
    "Search documents you can access across My Space, Shared, and Wiki. Leave empty to show recently opened files.",
    "document_viewer.search_shared_hint",
  ),
  search: t("Search", "document_viewer.search"),
  search_placeholder: t(
    "Search title or keyword",
    "document_viewer.search_placeholder",
  ),
  no_matching_files: t(
    "No matching files",
    "document_viewer.no_matching_files",
  ),
  or_feishu_picker: t("Or Feishu picker", "document_viewer.or_feishu_picker"),
  loading_feishu_picker: t(
    "Loading Feishu picker…",
    "document_viewer.loading_feishu_picker",
  ),
  redirecting_authorize: t(
    "Redirecting to Feishu to authorize document access…",
    "document_viewer.redirecting_authorize",
  ),
  feishu_permission_error: t(
    "Feishu authorization is missing required permissions. Please reconnect Feishu and try again.",
    "document_viewer.feishu_permission_error",
  ),
  search_unavailable: t(
    "Search is temporarily unavailable. Please try again later.",
    "document_viewer.search_unavailable",
  ),
  search_failed: t(
    "Could not search Feishu documents. Please try again.",
    "document_viewer.search_failed",
  ),
  picker_failed: t(
    "Could not open the Feishu picker. Please try again.",
    "document_viewer.picker_failed",
  ),
  import_failed: t("Import failed", "document_viewer.import_failed"),
  reconnect_failed: t(
    "Could not reconnect Feishu",
    "document_viewer.reconnect_failed",
  ),
  no_file_token: t(
    "Selected item has no file token",
    "document_viewer.no_file_token",
  ),
  file_type_document: t("Document", "document_viewer.file_type_document"),
  file_type_spreadsheet: t(
    "Spreadsheet",
    "document_viewer.file_type_spreadsheet",
  ),
  file_type_bitable: t("Bitable", "document_viewer.file_type_bitable"),
  file_type_file: t("File", "document_viewer.file_type_file"),
  view_annotations: t("View annotations", "document_viewer.view_annotations"),
  close_annotations: t(
    "Close annotations",
    "document_viewer.close_annotations",
  ),
  annotations_title: t(
    "Annotations ({count})",
    "document_viewer.annotations_title",
  ),
  annotations_filters: t("Filters", "document_viewer.annotations_filters"),
  annotations_filters_reset: t(
    "Reset all",
    "document_viewer.annotations_filters_reset",
  ),
  annotations_hide: t("Hide annotations", "document_viewer.annotations_hide"),
  annotations_show: t("Show annotations", "document_viewer.annotations_show"),
  annotations_previous: t(
    "Previous annotation",
    "document_viewer.annotations_previous",
  ),
  annotations_next: t("Next annotation", "document_viewer.annotations_next"),
  annotations_nav_position: t(
    "{current} / {total}",
    "document_viewer.annotations_nav_position",
  ),
  annotations_filter_keyword: t(
    "Filter by keyword",
    "document_viewer.annotations_filter_keyword",
  ),
  annotations_filter_type: t("Type", "document_viewer.annotations_filter_type"),
  annotations_filter_notes: t(
    "Notes",
    "document_viewer.annotations_filter_notes",
  ),
  annotations_filter_placement: t(
    "Placement",
    "document_viewer.annotations_filter_placement",
  ),
  annotations_filter_author: t(
    "Author",
    "document_viewer.annotations_filter_author",
  ),
  annotations_filter_created: t(
    "Creation date",
    "document_viewer.annotations_filter_created",
  ),
  annotations_filter_created_today: t(
    "Today",
    "document_viewer.annotations_filter_created_today",
  ),
  annotations_filter_created_7d: t(
    "Last 7 days",
    "document_viewer.annotations_filter_created_7d",
  ),
  annotations_filter_created_30d: t(
    "Last 30 days",
    "document_viewer.annotations_filter_created_30d",
  ),
  annotations_filter_tags: t("Tags", "document_viewer.annotations_filter_tags"),
  annotations_filter_version: t(
    "Version",
    "document_viewer.annotations_filter_version",
  ),
  annotations_filter_all: t("All", "document_viewer.annotations_filter_all"),
  annotations_filter_none: t("None", "document_viewer.annotations_filter_none"),
  annotations_filter_open: t(
    "Unresolved",
    "document_viewer.annotations_filter_open",
  ),
  annotations_filter_resolved: t(
    "Resolved",
    "document_viewer.annotations_filter_resolved",
  ),
  annotations_filter_placed: t(
    "Placed",
    "document_viewer.annotations_filter_placed",
  ),
  annotations_filter_page_level: t(
    "Page level",
    "document_viewer.annotations_filter_page_level",
  ),
  annotations_type_note: t("Note", "document_viewer.annotations_type_note"),
  annotations_type_anchor: t(
    "Anchor",
    "document_viewer.annotations_type_anchor",
  ),
  annotations_type_line: t("Line", "document_viewer.annotations_type_line"),
  annotations_type_document_link: t(
    "Document link",
    "document_viewer.annotations_type_document_link",
  ),
  annotations_type_permalink: t(
    "Permalink",
    "document_viewer.annotations_type_permalink",
  ),
  annotations_filter_links: t(
    "Links",
    "document_viewer.annotations_filter_links",
  ),
  annotations_link_picker_title: t(
    "Select link target",
    "document_viewer.annotations_link_picker_title",
  ),
  annotations_permalink_picker_title: t(
    "Select permalink target",
    "document_viewer.annotations_permalink_picker_title",
  ),
  annotations_permalink_page: t(
    "Target page (optional)",
    "document_viewer.annotations_permalink_page",
  ),
  annotations_select_anchors: t(
    "Select anchors",
    "document_viewer.annotations_select_anchors",
  ),
  annotations_link_whole_document: t(
    "Link whole document",
    "document_viewer.annotations_link_whole_document",
  ),
  annotations_create_new_anchor: t(
    "Create new anchor in this document",
    "document_viewer.annotations_create_new_anchor",
  ),
  annotations_create_anchor_banner: t(
    "Select text or an area, enter an Anchor Name, then save. Close this window when finished and return to Select anchors.",
    "document_viewer.annotations_create_anchor_banner",
  ),
  annotations_create_anchor_saved: t(
    "Anchor created. You can close this window and return to Select anchors.",
    "document_viewer.annotations_create_anchor_saved",
  ),
  annotations_linked_documents: t(
    "Linked Documents",
    "document_viewer.annotations_linked_documents",
  ),
  annotations_linked_documents_empty: t(
    "No linked documents yet. Create a Document link annotation to add one.",
    "document_viewer.annotations_linked_documents_empty",
  ),
  annotations_linked_view_target: t(
    "View in mini-browser",
    "document_viewer.annotations_linked_view_target",
  ),
  annotations_linked_focus: t(
    "Show link annotation",
    "document_viewer.annotations_linked_focus",
  ),
  annotations_linked_remove_blocked: t(
    "Delete the link annotation(s) first to remove this relationship.",
    "document_viewer.annotations_linked_remove_blocked",
  ),
  annotations_linked_add: t(
    "Add document link",
    "document_viewer.annotations_linked_add",
  ),
  annotations_link_anchors_empty: t(
    "No anchors on this version. Create a new anchor, or link the whole document.",
    "document_viewer.annotations_link_anchors_empty",
  ),
  annotations_filter_link_anchor: t(
    "Anchor",
    "document_viewer.annotations_filter_link_anchor",
  ),
  annotations_link_picker_search: t(
    "Search by document number or name",
    "document_viewer.annotations_link_picker_search",
  ),
  annotations_link_picker_empty: t(
    "No matching documents.",
    "document_viewer.annotations_link_picker_empty",
  ),
  annotations_link_picker_confirm: t(
    "Link",
    "document_viewer.annotations_link_picker_confirm",
  ),
  annotations_version_this: t(
    "This version",
    "document_viewer.annotations_version_this",
  ),
  annotations_version_previous: t(
    "Previous versions",
    "document_viewer.annotations_version_previous",
  ),
  annotations_filtered_empty: t(
    "No annotations match the current filters.",
    "document_viewer.annotations_filtered_empty",
  ),
  annotate_reply: t("Reply", "document_viewer.annotate_reply"),
  annotate_reply_placeholder: t(
    "Type @ to mention a user",
    "document_viewer.annotate_reply_placeholder",
  ),
  annotate_mention_hint: t(
    "Type @ to mention a user",
    "document_viewer.annotate_mention_hint",
  ),
  annotate_reply_empty: t(
    "No replies yet.",
    "document_viewer.annotate_reply_empty",
  ),
  annotate_tags: t("Tags", "document_viewer.annotate_tags"),
  annotate_tags_add: t("Add", "document_viewer.annotate_tags_add"),
  annotate_tags_placeholder: t(
    "New tag name",
    "document_viewer.annotate_tags_placeholder",
  ),
  annotate_select: t("Select", "document_viewer.annotate_select"),
  annotate_menu: t("Annotate", "document_viewer.annotate_menu"),
  annotate_tools: t("Annotation tools", "document_viewer.annotate_tools"),
  annotate_delete: t("Delete annotation", "document_viewer.annotate_delete"),
  annotate_resolve: t("Resolve annotation", "document_viewer.annotate_resolve"),
  annotate_reopen: t("Reopen annotation", "document_viewer.annotate_reopen"),
  annotate_bring_forward: t(
    "Bring forward annotations",
    "document_viewer.annotate_bring_forward",
  ),
  annotate_bring_forward_none: t(
    "No annotations available to bring forward.",
    "document_viewer.annotate_bring_forward_none",
  ),
  annotate_bring_forward_done: t(
    "Brought forward {count} annotation(s) from v{major}.{minor}.",
    "document_viewer.annotate_bring_forward_done",
  ),
  annotate_title: t("Title", "document_viewer.annotate_title"),
  annotate_body: t("Body", "document_viewer.annotate_body"),
  annotate_save: t("Save", "document_viewer.annotate_save"),
  annotate_delete_action: t("Delete", "document_viewer.annotate_delete_action"),
  annotate_replies_heading: t(
    "Replies",
    "document_viewer.annotate_replies_heading",
  ),
  annotate_saved: t("Annotation saved", "document_viewer.annotate_saved"),
  annotate_unsaved: t("Unsaved changes", "document_viewer.annotate_unsaved"),
  annotate_discard_title: t(
    "Unsaved changes",
    "document_viewer.annotate_discard_title",
  ),
  annotate_discard_body: t(
    "You have unsaved changes. Discard them?",
    "document_viewer.annotate_discard_body",
  ),
  annotate_discard: t("Discard", "document_viewer.annotate_discard"),
  annotate_keep_editing: t(
    "Keep editing",
    "document_viewer.annotate_keep_editing",
  ),
  annotate_delete_confirm_title: t(
    "Delete annotation",
    "document_viewer.annotate_delete_confirm_title",
  ),
  annotate_delete_confirm_body: t(
    "Delete this annotation? This cannot be undone.",
    "document_viewer.annotate_delete_confirm_body",
  ),
  annotate_delete_reply_confirm_title: t(
    "Delete reply",
    "document_viewer.annotate_delete_reply_confirm_title",
  ),
  annotate_delete_reply_confirm_body: t(
    "Delete this reply? This cannot be undone.",
    "document_viewer.annotate_delete_reply_confirm_body",
  ),
  annotate_untitled: t(
    "(untitled p.{page})",
    "document_viewer.annotate_untitled",
  ),
  annotate_loading: t("Loading…", "document_viewer.annotate_loading"),
  annotate_resolved_badge: t(
    "Resolved",
    "document_viewer.annotate_resolved_badge",
  ),
  annotate_empty_hint: t(
    "Choose Note, Line, Document link, or Anchor; drag over text or an empty area.",
    "document_viewer.annotate_empty_hint",
  ),
  annotate_page_label: t("p.{page}", "document_viewer.annotate_page_label"),
  annotate_error_generic: t(
    "Something went wrong. Please try again.",
    "document_viewer.annotate_error_generic",
  ),
  annotate_error_create: t(
    "Failed to create annotation",
    "document_viewer.annotate_error_create",
  ),
  annotate_error_save: t(
    "Failed to save annotation",
    "document_viewer.annotate_error_save",
  ),
  annotate_error_delete: t(
    "Failed to delete annotation",
    "document_viewer.annotate_error_delete",
  ),
  annotate_error_reply: t(
    "Failed to add reply",
    "document_viewer.annotate_error_reply",
  ),
  annotate_error_delete_reply: t(
    "Failed to delete reply",
    "document_viewer.annotate_error_delete_reply",
  ),
  annotate_error_search: t(
    "Failed to search documents",
    "document_viewer.annotate_error_search",
  ),
  annotate_error_anchors: t(
    "Failed to load anchors",
    "document_viewer.annotate_error_anchors",
  ),
  annotate_error_permalink: t(
    "Failed to create permalink",
    "document_viewer.annotate_error_permalink",
  ),
  annotate_error_document_link: t(
    "Failed to create document link",
    "document_viewer.annotate_error_document_link",
  ),
  annotate_error_resolve_permalink: t(
    "Failed to open linked document",
    "document_viewer.annotate_error_resolve_permalink",
  ),
  annotate_error_bring_forward: t(
    "Failed to bring forward annotations",
    "document_viewer.annotate_error_bring_forward",
  ),
  annotate_mention_empty: t(
    "No matching users",
    "document_viewer.annotate_mention_empty",
  ),
  annotate_mention_loading: t(
    "Searching…",
    "document_viewer.annotate_mention_loading",
  ),
  annotate_link_kind_document: t(
    "Document",
    "document_viewer.annotate_link_kind_document",
  ),
  annotate_link_kind_anchor: t(
    "Anchor",
    "document_viewer.annotate_link_kind_anchor",
  ),
};

export const defaultCfgPackagingChrome: CfgPackagingChrome = {
  import_package: t("Import Package", "cfg_packaging.import_package"),
  imported_package: t("Imported {name}", "cfg_packaging.imported_package"),
  review_select_steps_heading: t(
    "Review and Select Steps",
    "cfg_packaging.review_select_steps_heading",
  ),
  review_reorder_steps_heading: t(
    "Review and Order Steps",
    "cfg_packaging.review_reorder_steps_heading",
  ),
  deployment_confirmation_heading: t(
    "Deployment Confirmation",
    "cfg_packaging.deployment_confirmation_heading",
  ),
  back_to_package: t("Back to package", "cfg_packaging.back_to_package"),
  inbound_packages: t("Inbound Packages", "cfg_packaging.inbound_packages"),
  wizard_select_steps: t("Select Steps", "cfg_packaging.wizard_select_steps"),
  wizard_confirm: t("Confirm", "cfg_packaging.wizard_confirm"),
  blocked_steps_warning: t(
    "One or more selected steps are Blocked. Exclude them or resolve dependencies before continuing.",
    "cfg_packaging.blocked_steps_warning",
  ),
  show_blocked_status: t("Show blocked status", "cfg_packaging.show_blocked_status"),
  reorder: t("Reorder", "cfg_packaging.reorder"),
  steps_selected: t("{selected} of {total} steps selected.", "cfg_packaging.steps_selected"),
  exclusions_saved: t("Exclusions saved", "cfg_packaging.exclusions_saved"),
  step_numbers_unique: t("Step numbers must be unique", "cfg_packaging.step_numbers_unique"),
  step_numbers_min: t("Step numbers must be >= 1", "cfg_packaging.step_numbers_min"),
  step_order_saved: t("Step order saved", "cfg_packaging.step_order_saved"),
  deploy_finished: t("Deploy finished: {status}", "cfg_packaging.deploy_finished"),
  comparison_dependencies_title: t(
    "Comparison and Dependencies",
    "cfg_packaging.comparison_dependencies_title",
  ),
  close: t("Close", "cfg_packaging.close"),
  comparison_tab: t("Comparison", "cfg_packaging.comparison_tab"),
  dependencies_tab: t("Dependencies", "cfg_packaging.dependencies_tab"),
  column_operation: t("Operation", "cfg_packaging.column_operation"),
  column_item: t("Item", "cfg_packaging.column_item"),
  column_from_target: t("From Target Vault", "cfg_packaging.column_from_target"),
  column_to: t("To", "cfg_packaging.column_to"),
  column_component_name: t("Component Name", "cfg_packaging.column_component_name"),
  column_component_type: t("Component Type", "cfg_packaging.column_component_type"),
  column_subcomponent_name: t("Subcomponent Name", "cfg_packaging.column_subcomponent_name"),
  column_subcomponent_type: t("Subcomponent Type", "cfg_packaging.column_subcomponent_type"),
  column_referenced_by_name: t("Referenced by: Name", "cfg_packaging.column_referenced_by_name"),
  column_status: t("Status", "cfg_packaging.column_status"),
  column_step: t("Step", "cfg_packaging.column_step"),
  column_step_type: t("Step Type", "cfg_packaging.column_step_type"),
  column_label: t("Label", "cfg_packaging.column_label"),
  column_name: t("Name", "cfg_packaging.column_name"),
  column_type: t("Type", "cfg_packaging.column_type"),
  column_deployment_status: t("Deployment Status", "cfg_packaging.column_deployment_status"),
  column_deployment_action: t("Deployment Action", "cfg_packaging.column_deployment_action"),
  filter_all_operations: t("All Operations", "cfg_packaging.filter_all_operations"),
  filter_change: t("Change", "cfg_packaging.filter_change"),
  filter_add: t("Add", "cfg_packaging.filter_add"),
  filter_remove: t("Remove", "cfg_packaging.filter_remove"),
  filter_modify: t("Modify", "cfg_packaging.filter_modify"),
  filter_no_change: t("No Change", "cfg_packaging.filter_no_change"),
  filter_all_statuses: t("All Statuses", "cfg_packaging.filter_all_statuses"),
  search_placeholder: t("Search", "cfg_packaging.search_placeholder"),
  no_differences: t("No differences.", "cfg_packaging.no_differences"),
  no_dependencies: t("No dependencies.", "cfg_packaging.no_dependencies"),
  finish: t("Finish", "cfg_packaging.finish"),
  resume_deploy: t("Resume Deploy", "cfg_packaging.resume_deploy"),
  next: t("Next", "cfg_packaging.next"),
  view_add_dependencies: t("View/Add Dependencies", "cfg_packaging.view_add_dependencies"),
  view_add_dependencies_failed: t(
    "Failed to View/Add Dependencies in the package",
    "cfg_packaging.view_add_dependencies_failed",
  ),
  view_add_dependencies_dialog_title: t(
    "View and add dependent components to the package",
    "cfg_packaging.view_add_dependencies_dialog_title",
  ),
  view_add_dependencies_dialog_description: t(
    "Select the component dependencies and add them to the package. These dependencies may be required to successfully deploy your package.",
    "cfg_packaging.view_add_dependencies_dialog_description",
  ),
  view_add_dependencies_target_vault_warning: t(
    "You have not selected a target Vault for this package. Dependencies listed below may already exist in the target Vault.",
    "cfg_packaging.view_add_dependencies_target_vault_warning",
  ),
  no_missing_dependencies: t("No missing dependencies.", "cfg_packaging.no_missing_dependencies"),
  select_all_dependencies: t("+ Select All", "cfg_packaging.select_all_dependencies"),
  add: t("Add", "cfg_packaging.add"),
  component_fallback: t("Component", "cfg_packaging.component_fallback"),
  deps_pagination_range: t("{start}-{end}, of {total}", "cfg_packaging.deps_pagination_range"),
  import_started: t(
    "Importing and validating Inbound Package. You will receive a notification when the process is complete.",
    "cfg_packaging.import_started",
  ),
  deploy_started: t(
    "Performing deployment. You will receive a notification when processing is complete.",
    "cfg_packaging.deploy_started",
  ),
  export_started: t(
    "Exporting Outbound Package. You will receive a notification when the process is complete.",
    "cfg_packaging.export_started",
  ),
};

export const defaultDomainUserChrome: DomainUserChrome = {
  field_label: t("Domain User", "domain_user.field_label"),
  name_label: t("Name", "domain_user.name_label"),
  username_label: t("Username", "domain_user.username_label"),
  email_label: t("Email", "domain_user.email_label"),
  search_placeholder: t(
    "Search by username, email, or name",
    "domain_user.search_placeholder",
  ),
  no_matching: t("No matching domain users", "domain_user.no_matching"),
  create_action: t("+ Create Domain User", "domain_user.create_action"),
  load_failed: t("Failed to load domain users", "domain_user.load_failed"),
  create_title: t("Create Domain User", "domain_user.create_title"),
  first_name_label: t("First name", "domain_user.first_name_label"),
  last_name_label: t("Last name", "domain_user.last_name_label"),
  language_label: t("Language", "domain_user.language_label"),
  locale_label: t("Locale", "domain_user.locale_label"),
  timezone_label: t("Timezone", "domain_user.timezone_label"),
  user_name_label: t("User Name", "domain_user.user_name_label"),
  list_title: t("Domain Users", "domain_user.list_title"),
  col_home_domain: t("Home Domain", "domain_user.col_home_domain"),
  col_domain_admin: t("Domain Admin", "domain_user.col_domain_admin"),
  col_cross_domain: t("Cross-Domain", "domain_user.col_cross_domain"),
  col_status: t("Domain Status", "domain_user.col_status"),
  status_active: t("Active", "domain_user.status_active"),
  status_inactive: t("Inactive", "domain_user.status_inactive"),
  yes: t("Yes", "domain_user.yes"),
  no: t("No", "domain_user.no"),
  empty: t("No users found in this domain.", "domain_user.empty"),
  empty_filtered: t(
    "No users found matching the current filters.",
    "domain_user.empty_filtered",
  ),
  unknown_view: t("Unknown Users & Groups view", "domain_user.unknown_view"),
  details: t("Details", "domain_user.details"),
  vault_memberships: t("Vault Memberships", "domain_user.vault_memberships"),
  actions: t("Actions", "domain_user.actions"),
  company: t("Company", "domain_user.company"),
  license_type: t("License Type", "domain_user.license_type"),
  security_profile: t("Security Profile", "domain_user.security_profile"),
  vault: t("Vault", "domain_user.vault"),
  membership_status: t("Status", "domain_user.membership_status"),
  no_memberships: t("No vault memberships.", "domain_user.no_memberships"),
  change_status_to_active: t(
    "Change Domain Status to Active",
    "domain_user.change_status_to_active",
  ),
  change_status_to_inactive: t(
    "Change Domain Status to Inactive",
    "domain_user.change_status_to_inactive",
  ),
  change_status_active_help: t(
    "Re-enable this Domain User's domain identity? Vault memberships stay inactive until activated per Vault.",
    "domain_user.change_status_active_help",
  ),
  change_status_inactive_help: t(
    "Disable this Domain User across the whole home domain? Active login sessions will be revoked.",
    "domain_user.change_status_inactive_help",
  ),
  export_csv: t("Export CSV", "audit.export_csv"),
};

export const defaultOperationsChrome: OperationsChrome = {
  group_jobs: t("Jobs", "navigation.admin.operations.group.jobs"),
  group_email_notifications: t(
    "Email Notifications",
    "navigation.admin.operations.group.email_notifications",
  ),
  job_definitions_title: t("Job Definitions", "operations.job_definitions_title"),
  job_status_title: t("Job Status", "operations.job_status_title"),
  job_queues_title: t("Job Queues", "operations.job_queues_title"),
  sdk_job_metadata: t("SDK Job Metadata", "navigation.admin.operations.sdk_job_metadata"),
  email_suppression_list: t(
    "Email Suppression List",
    "navigation.admin.operations.email_suppression_list",
  ),
  email_notification_status: t(
    "Email Notification Status",
    "navigation.admin.operations.email_notification_status",
  ),
  job_title: t("Job Title", "operations.job_title"),
  job_type: t("Job Type", "operations.job_type"),
  schedule: t("Schedule", "operations.schedule"),
  date_based_object_operation: t(
    "Date Based Object Operation",
    "operations.date_based_object_operation",
  ),
  user_account_activation: t("User Account Activation", "operations.user_account_activation"),
  status_active: t("Active", "operations.status_active"),
  status_inactive: t("Inactive", "operations.status_inactive"),
  schedule_hourly: t("Hourly", "operations.schedule_hourly"),
  schedule_daily: t("Daily", "operations.schedule_daily"),
  schedule_weekly: t("Weekly", "operations.schedule_weekly"),
  schedule_monthly: t("Monthly", "operations.schedule_monthly"),
  job_id: t("Job ID", "operations.job_id"),
  started_time: t("Started Time", "operations.started_time"),
  completion_time: t("Completion Time", "operations.completion_time"),
  scheduled_start_time: t("Scheduled Start Time", "operations.scheduled_start_time"),
  job_status: t("Job Status", "operations.job_status"),
  scheduled: t("Scheduled", "operations.scheduled"),
  running: t("Running", "operations.running"),
  history: t("History", "operations.history"),
  start_now: t("Start Now", "operations.start_now"),
  started: t("Started", "operations.started"),
  cancelled: t("Cancelled", "operations.cancelled"),
  queued: t("Queued", "operations.queued"),
  success: t("Success", "operations.success"),
  failed: t("Failed", "operations.failed"),
  errors_encountered: t("Errors Encountered", "operations.errors_encountered"),
  missed_schedule: t("Missed Schedule", "operations.missed_schedule"),
  failed_to_run: t("Failed to Run", "operations.failed_to_run"),
  completed_due_to_inactivity: t(
    "Completed due to Inactivity",
    "operations.completed_due_to_inactivity",
  ),
  max_concurrent_jobs: t("Max Concurrent Jobs", "operations.max_concurrent_jobs"),
  description: t("Description", "operations.description"),
  saved: t("Saved", "operations.saved"),
  source: t("Source", "operations.source"),
  source_standard: t("Standard", "operations.source_standard"),
  source_custom: t("Custom", "operations.source_custom"),
  sdk_job_metadata_detail: t("SDK Job Metadata:", "operations.sdk_job_metadata_detail"),
  email_suppression_help: t(
    "Use this page to view suppressed email addresses that Vault will not send emails to",
    "operations.email_suppression_help",
  ),
  email_address: t("Email Address", "operations.email_address"),
  suppression_reason: t("Suppression Reason", "operations.suppression_reason"),
  suppression_date: t("Suppression Date", "operations.suppression_date"),
  suppression_search_placeholder: t(
    "Name, email, or reason (exact)",
    "operations.suppression_search_placeholder",
  ),
  result_count: t("{count} results", "operations.result_count"),
  remove_from_suppression: t(
    "Remove from Suppression List",
    "operations.remove_from_suppression",
  ),
  remove_multiple_from_suppression: t(
    "Remove Multiple Email Addresses from Suppression List",
    "operations.remove_multiple_from_suppression",
  ),
  remove_one_confirm: t(
    "Remove this email address from the suppression list?",
    "operations.remove_one_confirm",
  ),
  remove_many_confirm: t(
    "Remove {count} email addresses from the suppression list?",
    "operations.remove_many_confirm",
  ),
  delete_action: t("Delete", "action.delete"),
  send_date: t("Send Date", "operations.send_date"),
  recipient_name: t("Recipient Name", "operations.recipient_name"),
  error_message: t("Error Message", "operations.error_message"),
  document_number: t("Document Number", "operations.document_number"),
  object_record_name: t("Object Record Name", "operations.object_record_name"),
  subject: t("Subject", "operations.subject"),
  export_to_csv: t("Export to CSV", "operations.export_to_csv"),
  emails_show_summary: t(
    "Showing emails for {from} to {to} ({count} results)",
    "operations.emails_show_summary",
  ),
  email_status_sent: t("Sent", "operations.email_status_sent"),
  email_status_delivered: t("Delivered", "operations.email_status_delivered"),
  email_status_failed: t("Failed", "operations.email_status_failed"),
  email_status_blocked: t("Blocked", "operations.email_status_blocked"),
  email_status_skipped: t("Skipped", "operations.email_status_skipped"),
  email_status_pending: t("Pending", "operations.email_status_pending"),
  email_status_summary: t("Summary", "operations.email_status_summary"),
  email_status_sent_unknown: t("Sent - Unknown", "operations.email_status_sent_unknown"),
};

export const defaultDeploymentChrome: DeploymentChrome = {
  group_environment: t(
    "Environment",
    "navigation.admin.deployment.group.environment",
  ),
  group_migration: t("Migration", "navigation.admin.deployment.group.migration"),
};

export const defaultConfigurationChrome: ConfigurationChrome = {
  group_object_setup: t(
    "Object Setup",
    "admin.configuration.group.object_setup",
  ),
  group_business_logic: t(
    "Business Logic",
    "admin.configuration.group.business_logic",
  ),
  group_tooling: t("Tooling", "admin.configuration.group.tooling"),
  add_favorite_aria: t("Add to favorites", "list.add_favorite_aria"),
  remove_favorite_aria: t("Remove from favorites", "list.remove_favorite_aria"),
};

export const defaultCompletenessHoverChrome: CompletenessHoverChrome = {
  dependencies_count: t(
    "{count} Dependencies",
    "completeness_hover.dependencies_count",
  ),
  milestone: t("Milestone", "completeness_hover.milestone"),
  planned_finish_date: t(
    "Planned Finish Date",
    "completeness_hover.planned_finish_date",
  ),
  actual_finish_date: t(
    "Actual Finish Date",
    "completeness_hover.actual_finish_date",
  ),
  expected_documents: t(
    "Expected Documents",
    "completeness_hover.expected_documents",
  ),
  expected: t("Expected: {count}", "completeness_hover.expected"),
  actual: t("Actual: {count}", "completeness_hover.actual"),
  approved: t("Approved: {count}", "completeness_hover.approved"),
  view_all_expected_documents: t(
    "View All Expected Documents",
    "completeness_hover.view_all_expected_documents",
  ),
  documents_count: t("{count} Documents", "completeness_hover.documents_count"),
  name_version: t("Name (Version)", "completeness_hover.name_version"),
  status: t("Status", "completeness_hover.status"),
  clinical_user_tasks: t(
    "Clinical User Tasks",
    "completeness_hover.clinical_user_tasks",
  ),
  total: t("Total: {count}", "completeness_hover.total"),
  complete: t("Complete: {count}", "completeness_hover.complete"),
  required: t("Required: {count}", "completeness_hover.required"),
  complete_required: t(
    "Complete Required: {count}",
    "completeness_hover.complete_required",
  ),
  view_all_tasks: t("View All Tasks", "completeness_hover.view_all_tasks"),
};

export const defaultShellChrome: ShellChrome = {
  loading: t("Loading…", "ui.loading"),
  load_failed: t("Failed to load", "ui.load_failed"),
  load_form_failed: t("Failed to load form", "ui.load_form_failed"),
  save_failed: t("Failed to save", "ui.save_failed"),
  delete_failed: t("Failed to delete", "ui.delete_failed"),
  action_failed: t("Action failed", "ui.action_failed"),
  lifecycle_entry_criteria_failed: t(
    "This action could not be completed because entry criteria were not met.",
    "ui.lifecycle_entry_criteria_failed",
  ),
  lifecycle_entry_criteria_failure_body: t(
    'This record cannot enter lifecycle state "{state}" because it does not meet one or more entry criteria:',
    "ui.lifecycle_entry_criteria_failure_body",
  ),
  lifecycle_entry_criteria_failure_footer: t(
    "Please update the record and try again.",
    "ui.lifecycle_entry_criteria_failure_footer",
  ),
  lifecycle_entry_criteria_validate_that: t(
    "Validate that",
    "ui.lifecycle_entry_criteria_validate_that",
  ),
  lifecycle_entry_criteria_no_records_equal: t(
    "No records equal",
    "ui.lifecycle_entry_criteria_no_records_equal",
  ),
  lifecycle_entry_criteria_record_equals: t(
    "Equals",
    "ui.lifecycle_entry_criteria_record_equals",
  ),
  lifecycle_entry_criteria_record_not_equals: t(
    "Is not equal to",
    "ui.lifecycle_entry_criteria_record_not_equals",
  ),
  lifecycle_entry_criteria_field_is_not_blank: t(
    "{field} is not blank",
    "ui.lifecycle_entry_criteria_field_is_not_blank",
  ),
  empty_value: t("—", "ui.empty_value"),
  help_placeholder: t("Help content", "ui.help_placeholder"),
  back: t("Back", "ui.back"),
  sign_out: t("Sign out", "ui.sign_out"),
  switch_vault: t("Switch Vault", "ui.switch_vault"),
  all_vaults_label: t("All Vaults", "ui.all_vaults"),
  loading_nav: t("Loading navigation…", "ui.loading_nav"),
  stale_confirm: t(
    "This page is stale (configuration or record changed). Reload now?",
    "ui.stale_confirm",
  ),
  stale_reloaded: t("Page reloaded. Please try again.", "ui.stale_reloaded"),
  unsaved_confirm: t(
    "You have unsaved changes. Leave this page anyway?",
    "ui.unsaved_confirm",
  ),
  apply: t("Apply", "ui.apply"),
  clear: t("Clear", "ui.clear"),
  cancel: t("Cancel", "ui.cancel"),
  confirm: t("Confirm", "ui.confirm"),
  continue: t("Continue", "ui.continue"),
  refresh: t("Refresh", "ui.refresh"),
  load_more: t("Load more", "ui.load_more"),
  admin_config_diagnostics: t(
    "Configuration Diagnostics",
    "admin.config_diagnostics",
  ),
  admin_layout_preview: t("Layout preview", "admin.layout_preview"),
  admin_metadata_viewer: t("Metadata viewer", "admin.metadata_viewer"),
  admin_configuration: t("Configuration", "admin.configuration"),
  admin_configuration_platform: t(
    "Platform Configurations",
    "admin.configuration.platform",
  ),
  admin_configuration_components: t(
    "Components",
    "admin.configuration.components",
  ),
  admin_configuration_search_components: t(
    "Search Components",
    "admin.configuration.search_components",
  ),
  admin_configuration_view_all: t("View All", "admin.configuration.view_all"),
  admin_configuration_no_matches: t(
    "No matching components",
    "admin.configuration.no_matches",
  ),
  admin_configuration_recently_used: t(
    "Recently Used",
    "admin.configuration.recently_used",
  ),
  admin_configuration_favorites: t(
    "Favorites",
    "admin.configuration.favorites",
  ),
  admin_configuration_favorites_empty: t(
    "Add your favorites",
    "admin.configuration.favorites_empty",
  ),
  metadata_objects_title: t("Objects", "metadata.objects_title"),
  metadata_object_detail_title: t("Object", "metadata.object_detail_title"),
  metadata_fields_section: t("Fields", "metadata.fields_section"),
  metadata_field_detail_title: t("Field", "metadata.field_detail_title"),
  metadata_layouts_title: t("Page Layouts", "metadata.layouts_title"),
  metadata_lifecycles_title: t(
    "Object Lifecycles",
    "metadata.lifecycles_title",
  ),
  metadata_lifecycle_detail_title: t(
    "Object Lifecycle",
    "metadata.lifecycle_detail_title",
  ),
  metadata_lifecycle_label: t("Label", "metadata.lifecycle_label"),
  metadata_lifecycle_name: t("Name", "metadata.lifecycle_name"),
  metadata_lifecycle_starting_state: t(
    "Starting state",
    "metadata.lifecycle_starting_state",
  ),
  metadata_lifecycle_states_tab: t("States", "metadata.lifecycle_states_tab"),
  metadata_lifecycle_state_types_tab: t(
    "State Types",
    "metadata.lifecycle_state_types_tab",
  ),
  metadata_lifecycle_state_type: t(
    "State Type",
    "metadata.lifecycle_state_type",
  ),
  metadata_lifecycle_state: t("State", "metadata.lifecycle_state"),
  metadata_lifecycle_roles_tab: t("Roles", "metadata.lifecycle_roles_tab"),
  metadata_lifecycle_permissions_tab: t(
    "Permissions",
    "metadata.lifecycle_permissions_tab",
  ),
  metadata_lifecycle_user_actions: t(
    "User Actions",
    "metadata.lifecycle_user_actions",
  ),
  metadata_lifecycle_entry_criteria: t(
    "Entry Criteria",
    "metadata.lifecycle_entry_criteria",
  ),
  metadata_lifecycle_entry_actions: t(
    "Entry Actions",
    "metadata.lifecycle_entry_actions",
  ),
  metadata_lifecycle_action_summary: t(
    "Action",
    "metadata.lifecycle_action_summary",
  ),
  metadata_lifecycle_target_state: t(
    "Target state",
    "metadata.lifecycle_target_state",
  ),
  metadata_lifecycle_record_status: t(
    "Record status",
    "metadata.lifecycle_record_status",
  ),
  metadata_lifecycle_record_inactive: t(
    "Records become inactive",
    "metadata.lifecycle_record_inactive",
  ),
  metadata_lifecycle_cancel_state: t(
    "Workflow cancel state",
    "metadata.lifecycle_cancel_state",
  ),
  metadata_lifecycle_application_role: t(
    "Application role",
    "metadata.lifecycle_application_role",
  ),
  metadata_lifecycle_permission: t(
    "Permission",
    "metadata.lifecycle_permission",
  ),
  metadata_lifecycle_object: t("Object", "metadata.lifecycle_object"),
  metadata_lifecycle_state_label: t(
    "State Label",
    "metadata.lifecycle_state_label",
  ),
  metadata_lifecycle_state_name: t(
    "State Name",
    "metadata.lifecycle_state_name",
  ),
  metadata_lifecycle_view_objects: t(
    "View objects using lifecycle",
    "metadata.lifecycle_view_objects",
  ),
  metadata_lifecycle_event_actions: t(
    "Event Actions",
    "metadata.lifecycle_event_actions",
  ),
  metadata_lifecycle_event: t("Event", "metadata.lifecycle_event"),
  metadata_lifecycles_search_placeholder: t(
    "Search object lifecycles",
    "metadata.lifecycles_search_placeholder",
  ),
  metadata_empty_lifecycles: t(
    "No object lifecycles found.",
    "metadata.empty_lifecycles",
  ),
  metadata_empty_lifecycle_states: t(
    "No states found.",
    "metadata.empty_lifecycle_states",
  ),
  metadata_empty_lifecycle_state_types: t(
    "No state types configured.",
    "metadata.empty_lifecycle_state_types",
  ),
  metadata_empty_lifecycle_roles: t(
    "No roles found.",
    "metadata.empty_lifecycle_roles",
  ),
  metadata_empty_lifecycle_permissions: t(
    "No permissions found.",
    "metadata.empty_lifecycle_permissions",
  ),
  metadata_empty_lifecycle_objects: t(
    "No objects use this lifecycle.",
    "metadata.empty_lifecycle_objects",
  ),
  metadata_empty_lifecycle_user_actions: t(
    "No user actions configured.",
    "metadata.empty_lifecycle_user_actions",
  ),
  metadata_empty_lifecycle_entry_criteria: t(
    "No entry criteria configured.",
    "metadata.empty_lifecycle_entry_criteria",
  ),
  metadata_empty_lifecycle_entry_actions: t(
    "No entry actions configured.",
    "metadata.empty_lifecycle_entry_actions",
  ),
  metadata_empty_lifecycle_event_actions: t(
    "No event actions configured.",
    "metadata.empty_lifecycle_event_actions",
  ),
  metadata_workflows_title: t("Workflows", "metadata.workflows_title"),
  metadata_picklists_title: t("Picklists", "metadata.picklists_title"),
  metadata_picklist_detail_title: t(
    "Picklist",
    "metadata.picklist_detail_title",
  ),
  metadata_picklists_search_placeholder: t(
    "Search columns",
    "metadata.picklists_search_placeholder",
  ),
  metadata_empty_picklists: t(
    "No picklists found.",
    "metadata.empty_picklists",
  ),
  metadata_empty_picklist_entries: t(
    "No picklist entries found.",
    "metadata.empty_picklist_entries",
  ),
  metadata_picklist_entries: t("Entries", "metadata.picklist_entries"),
  metadata_picklist_entry_order: t("Order", "metadata.picklist_entry_order"),
  metadata_picklist_entry_label: t("Label", "metadata.picklist_entry_label"),
  metadata_picklist_entry_name: t("Name", "metadata.picklist_entry_name"),
  metadata_picklist_ref: t("Picklist", "metadata.picklist_ref"),
  metadata_picklist_can_add_values: t(
    "Users can add values",
    "metadata.picklist_can_add_values",
  ),
  metadata_picklist_can_reorder_values: t(
    "Users can reorder values",
    "metadata.picklist_can_reorder_values",
  ),
  metadata_workflow_detail_title: t(
    "Workflow",
    "metadata.workflow_detail_title",
  ),
  metadata_workflows_search_placeholder: t(
    "Search columns",
    "metadata.workflows_search_placeholder",
  ),
  metadata_empty_workflows: t(
    "No workflows found.",
    "metadata.empty_workflows",
  ),
  metadata_workflow_type: t("Workflow Type", "metadata.workflow_type"),
  metadata_workflow_type_object: t("Object", "metadata.workflow_type_object"),
  metadata_workflow_type_document: t(
    "Document",
    "metadata.workflow_type_document",
  ),
  metadata_workflow_type_filter_all: t(
    "All Workflows",
    "metadata.workflow_type_filter_all",
  ),
  metadata_workflow_lifecycle: t("Lifecycle", "metadata.workflow_lifecycle"),
  metadata_workflow_version: t("Version", "metadata.workflow_version"),
  metadata_view_workflow_versions: t(
    "View Workflow Versions",
    "metadata.view_workflow_versions",
  ),
  metadata_workflow_versions_title: t(
    "Workflow Versions",
    "metadata.workflow_versions_title",
  ),
  metadata_workflow_version_live: t("Live", "metadata.workflow_version_live"),
  metadata_workflow_historical_banner: t(
    "Historical version (read-only)",
    "metadata.workflow_historical_banner",
  ),
  metadata_workflow_placeholder_error: t(
    "Placeholder Error Building",
    "metadata.workflow_placeholder_error",
  ),
  metadata_empty_workflow_versions: t(
    "No activated versions.",
    "metadata.empty_workflow_versions",
  ),
  metadata_workflow_activated: t("Activated", "metadata.workflow_activated"),
  metadata_make_configuration_active: t(
    "Make configuration active",
    "metadata.make_configuration_active",
  ),
  metadata_workflow_start_states: t(
    "Start States",
    "metadata.workflow_start_states",
  ),
  metadata_workflow_options: t("Options", "metadata.workflow_options"),
  metadata_workflow_options_general: t(
    "General",
    "metadata.workflow_options_general",
  ),
  metadata_workflow_segregation: t(
    "Segregation of Duties",
    "metadata.workflow_segregation",
  ),
  metadata_workflow_action_security: t(
    "Active Workflow Action Security",
    "metadata.workflow_action_security",
  ),
  metadata_workflow_steps: t("Workflow Steps", "metadata.workflow_steps"),
  metadata_workflow_step_flow: t(
    "Flowchart View",
    "metadata.workflow_step_flow",
  ),
  metadata_workflow_step_type: t("Step Type", "metadata.workflow_step_type"),
  metadata_workflow_step_label: t("Step", "metadata.workflow_step_label"),
  metadata_workflow_next_steps: t("Next Steps", "metadata.workflow_next_steps"),
  metadata_workflow_step_type_start: t(
    "Start Workflow",
    "metadata.workflow_step_type_start",
  ),
  metadata_workflow_step_type_end: t(
    "End Workflow",
    "metadata.workflow_step_type_end",
  ),
  metadata_workflow_step_type_task: t(
    "Task",
    "metadata.workflow_step_type_task",
  ),
  metadata_workflow_step_type_decision: t(
    "Decision",
    "metadata.workflow_step_type_decision",
  ),
  metadata_workflow_step_type_action: t(
    "Action",
    "metadata.workflow_step_type_action",
  ),
  metadata_workflow_step_type_state_change: t(
    "State Change",
    "metadata.workflow_step_type_state_change",
  ),
  metadata_workflow_step_type_notification: t(
    "Notification",
    "metadata.workflow_step_type_notification",
  ),
  metadata_workflow_step_type_join: t(
    "Join",
    "metadata.workflow_step_type_join",
  ),
  metadata_workflow_step_type_placeholder: t(
    "Placeholder",
    "metadata.workflow_step_type_placeholder",
  ),
  metadata_config_view_only: t(
    "View only — configuration cannot be edited here.",
    "metadata.config_view_only",
  ),
  metadata_more_count: t("+{count} more", "metadata.more_count"),
  metadata_lifecycle_state_overview: t(
    "States",
    "metadata.lifecycle_state_overview",
  ),
  metadata_workflow_envelope: t(
    "Envelope Details",
    "metadata.workflow_envelope",
  ),
  metadata_workflow_variables: t("Variables", "metadata.workflow_variables"),
  metadata_workflow_cancellation_actions: t(
    "Cancellation Actions",
    "metadata.workflow_cancellation_actions",
  ),
  metadata_workflow_cardinality_one: t(
    "Use workflow for single object record",
    "metadata.workflow_cardinality_one",
  ),
  metadata_workflow_cancellation_comment: t(
    "Workflow cancellation comment",
    "metadata.workflow_cancellation_comment",
  ),
  metadata_workflow_auto_start: t(
    "Allow auto-start from entry action and event action",
    "metadata.workflow_auto_start",
  ),
  metadata_workflow_one_task: t(
    "Users in this workflow can only complete one task",
    "metadata.workflow_one_task",
  ),
  metadata_workflow_roles_cannot_complete: t(
    "Role not allowed to complete tasks",
    "metadata.workflow_roles_cannot_complete",
  ),
  metadata_workflow_disallowed_owner: t(
    "Actions not allowed for the Workflow Owner",
    "metadata.workflow_disallowed_owner",
  ),
  metadata_workflow_disallowed_non_task_owner: t(
    "Actions not allowed for all users except the Task Owner",
    "metadata.workflow_disallowed_non_task_owner",
  ),
  metadata_workflow_disallowed_all: t(
    "Actions not allowed for all users",
    "metadata.workflow_disallowed_all",
  ),
  metadata_workflow_envelope_name_format: t(
    "Envelope name format",
    "metadata.workflow_envelope_name_format",
  ),
  metadata_workflow_document_content_lifecycle: t(
    "Document content lifecycle",
    "metadata.workflow_document_content_lifecycle",
  ),
  metadata_workflow_record_content_lifecycle: t(
    "Record content lifecycle",
    "metadata.workflow_record_content_lifecycle",
  ),
  metadata_workflow_cancel_order: t("Order", "metadata.workflow_cancel_order"),
  metadata_empty_workflow_steps: t(
    "No items found.",
    "metadata.empty_workflow_steps",
  ),
  metadata_empty_workflow_variables: t(
    "No items found.",
    "metadata.empty_workflow_variables",
  ),
  metadata_empty_workflow_cancellation_actions: t(
    "No items found.",
    "metadata.empty_workflow_cancellation_actions",
  ),
  metadata_workflow_start_options: t(
    "Start Options",
    "metadata.workflow_start_options",
  ),
  metadata_workflow_start_step_rules: t(
    "Start Step Rules",
    "metadata.workflow_start_step_rules",
  ),
  metadata_workflow_task_options: t(
    "Task Options",
    "metadata.workflow_task_options",
  ),
  metadata_workflow_decision_rules: t(
    "Decision Rules",
    "metadata.workflow_decision_rules",
  ),
  metadata_workflow_notification_options: t(
    "Notification",
    "metadata.workflow_notification_options",
  ),
  metadata_workflow_state_change_options: t(
    "State Change",
    "metadata.workflow_state_change_options",
  ),
  metadata_workflow_step_tags: t("Tags", "metadata.workflow_step_tags"),
  metadata_workflow_control_type: t(
    "Control Type",
    "metadata.workflow_control_type",
  ),
  metadata_workflow_participant_strategy: t(
    "Add Participants",
    "metadata.workflow_participant_strategy",
  ),
  metadata_workflow_roles_allowed: t(
    "Roles allowed to participate",
    "metadata.workflow_roles_allowed",
  ),
  metadata_workflow_roles_not_allowed: t(
    "Roles not allowed to participate",
    "metadata.workflow_roles_not_allowed",
  ),
  metadata_workflow_task_assignment: t(
    "Assign Task To",
    "metadata.workflow_task_assignment",
  ),
  metadata_workflow_task_requirement: t(
    "Task Requirement",
    "metadata.workflow_task_requirement",
  ),
  metadata_workflow_exclude_owner: t(
    "Do not allow Workflow Owner to receive this task",
    "metadata.workflow_exclude_owner",
  ),
  metadata_workflow_hide_home_page_link: t(
    "Hide default link in task pages",
    "metadata.workflow_hide_home_page_link",
  ),
  metadata_workflow_complete_without_viewing: t(
    "Complete task without viewing the item",
    "metadata.workflow_complete_without_viewing",
  ),
  metadata_workflow_previous_tasks_to_display: t(
    "Display information about previous tasks",
    "metadata.workflow_previous_tasks_to_display",
  ),
  metadata_workflow_notification_previous_tasks: t(
    "Include verdicts and comments from previous tasks",
    "metadata.workflow_notification_previous_tasks",
  ),
  metadata_workflow_custom_actions: t(
    "Custom Actions",
    "metadata.workflow_custom_actions",
  ),
  metadata_workflow_verdicts: t(
    "Verdict Options",
    "metadata.workflow_verdicts",
  ),
  metadata_workflow_reminders: t(
    "Task Reminders",
    "metadata.workflow_reminders",
  ),
  metadata_workflow_next_state: t("Next State", "metadata.workflow_next_state"),
  metadata_workflow_message_template: t(
    "Message Template",
    "metadata.workflow_message_template",
  ),
  metadata_workflow_recipients: t("Recipient", "metadata.workflow_recipients"),
  metadata_workflow_decision_summary: t(
    "Condition",
    "metadata.workflow_decision_summary",
  ),
  metadata_workflow_decision_default: t(
    "Else",
    "metadata.workflow_decision_default",
  ),
  metadata_workflow_esig_required: t(
    "Require eSignature",
    "metadata.workflow_esig_required",
  ),
  metadata_empty_start_controls: t(
    "No items found.",
    "metadata.empty_start_controls",
  ),
  metadata_empty_start_rules: t(
    "No items found.",
    "metadata.empty_start_rules",
  ),
  metadata_empty_decision_rules: t(
    "No items found.",
    "metadata.empty_decision_rules",
  ),
  metadata_empty_task_verdicts: t(
    "No items found.",
    "metadata.empty_task_verdicts",
  ),
  metadata_layout_detail_title: t(
    "Page Layout",
    "metadata.layout_detail_title",
  ),
  metadata_load_failed: t("Failed to load metadata.", "metadata.load_failed"),
  metadata_object_not_found: t("Not found", "metadata.object_not_found"),
  metadata_empty_objects: t("No objects found.", "metadata.empty_objects"),
  metadata_empty_layouts: t("No page layouts found.", "metadata.empty_layouts"),
  metadata_empty_object_types: t(
    "No object types found.",
    "metadata.empty_object_types",
  ),
  metadata_source: t("Source", "metadata.source"),
  metadata_status: t("Status", "metadata.status"),
  metadata_status_active: t("Active", "metadata.status_active"),
  metadata_status_inactive: t("Inactive", "metadata.status_inactive"),
  metadata_status_editing: t("Editing", "metadata.status_editing"),
  metadata_namespace: t("Namespace", "metadata.namespace"),
  metadata_in_menu: t("In menu", "metadata.in_menu"),
  metadata_object_class: t("Object Class", "metadata.object_class"),
  metadata_data_store: t("Data Store", "metadata.data_store"),
  metadata_object_configuration: t(
    "Configuration",
    "metadata.object_configuration",
  ),
  metadata_object_options: t("Options", "metadata.object_options"),
  metadata_object_type_independent: t(
    "This object is an independent entity",
    "metadata.object_type_independent",
  ),
  metadata_unique_keys: t("Unique Key", "metadata.unique_keys"),
  metadata_display_in_business_admin: t(
    'Display in "Business Administrator"',
    "metadata.display_in_business_admin",
  ),
  metadata_allow_attachments: t(
    "Allow attachments",
    "metadata.allow_attachments",
  ),
  metadata_enable_signatures: t(
    "Enable signatures",
    "metadata.enable_signatures",
  ),
  metadata_audit_object: t(
    "Audit data changes in this object",
    "metadata.audit_object",
  ),
  metadata_enable_object_types: t(
    "Enable object types",
    "metadata.enable_object_types",
  ),
  metadata_enable_merges: t("Enable merges", "metadata.enable_merges"),
  metadata_dynamic_access_control: t(
    "Dynamic Access Control",
    "metadata.dynamic_access_control",
  ),
  metadata_enable_dynamic_security: t(
    "Enable Dynamic Access Control",
    "metadata.enable_dynamic_security",
  ),
  metadata_user_role_setup_object: t(
    "User Role Setup Object",
    "metadata.user_role_setup_object",
  ),
  metadata_security_tree_object: t(
    "Security Tree Object",
    "metadata.security_tree_object",
  ),
  metadata_action_security: t("Action Security", "metadata.action_security"),
  metadata_secure_audit_trail: t(
    "Use action security to control audit trail",
    "metadata.secure_audit_trail",
  ),
  metadata_secure_sharing_settings: t(
    "Use action security to control sharing settings",
    "metadata.secure_sharing_settings",
  ),
  metadata_secure_copy_record: t(
    "Use action security to control record copying",
    "metadata.secure_copy_record",
  ),
  metadata_record_summary_field: t(
    "Record Summary Field",
    "metadata.record_summary_field",
  ),
  metadata_object_lifecycle: t("Lifecycle", "metadata.object_lifecycle"),
  metadata_allow_types: t("Object Types", "metadata.allow_types"),
  metadata_active: t("Active", "metadata.active"),
  metadata_required: t("Required", "metadata.required"),
  metadata_unique: t("Unique", "metadata.unique"),
  metadata_type: t("Type", "metadata.type"),
  metadata_attributes: t("Attributes", "metadata.attributes"),
  metadata_field_name: t("Field name", "metadata.field_name"),
  metadata_field_label: t("Label", "metadata.field_label"),
  metadata_object_label: t("Object Label", "metadata.object_label"),
  metadata_object_label_plural: t(
    "Object Plural Label",
    "metadata.object_label_plural",
  ),
  metadata_object_name: t("Object name", "metadata.object_name"),
  metadata_attribute_name: t("Attribute", "metadata.attribute_name"),
  metadata_empty_attributes: t(
    "No attributes found.",
    "metadata.empty_attributes",
  ),
  metadata_result_count: t("{count} items", "metadata.result_count"),
  metadata_objects_search_placeholder: t(
    "Search objects",
    "metadata.objects_search_placeholder",
  ),
  metadata_layouts_search_placeholder: t(
    "Search page layouts",
    "metadata.layouts_search_placeholder",
  ),
  metadata_fields_search_placeholder: t(
    "Search fields",
    "metadata.fields_search_placeholder",
  ),
  metadata_attributes_search_placeholder: t(
    "Search attributes",
    "metadata.attributes_search_placeholder",
  ),
  metadata_value: t("Value", "metadata.value"),
  metadata_yes: t("Yes", "metadata.yes"),
  metadata_no: t("No", "metadata.no"),
  metadata_layout_label: t("Label", "metadata.layout_label"),
  metadata_layout_name: t("Name", "metadata.layout_name"),
  metadata_layout_kind: t("Kind", "metadata.layout_kind"),
  metadata_empty_sections: t(
    "No sections in this layout.",
    "metadata.empty_sections",
  ),
  metadata_layout_reference: t("Reference", "metadata.layout_reference"),
  metadata_sections_tab: t("Sections", "metadata.sections_tab"),
  metadata_default: t("Default", "metadata.default"),
  metadata_default_type: t("Default type", "metadata.default_type"),
  metadata_typefield_required_legend: t(
    "✓ = field on type · ✓* = required override on type",
    "metadata.typefield_required_legend",
  ),
  metadata_attr_group_display: t("Display", "metadata.attr_group_display"),
  metadata_attr_group_data: t("Data model", "metadata.attr_group_data"),
  metadata_attr_group_features: t("Features", "metadata.attr_group_features"),
  metadata_attr_group_security: t("Security", "metadata.attr_group_security"),
  metadata_attr_group_lifecycle: t(
    "Lifecycle",
    "metadata.attr_group_lifecycle",
  ),
  metadata_attr_group_other: t("Other", "metadata.attr_group_other"),
  metadata_attr_group_constraints: t(
    "Constraints",
    "metadata.attr_group_constraints",
  ),
  metadata_attr_group_relationship: t(
    "Relationship",
    "metadata.attr_group_relationship",
  ),
  metadata_summary_fields: t("Summary fields", "metadata.summary_fields"),
  metadata_field_editable: t("Editable", "metadata.field_editable"),
  metadata_field_help: t("Help content", "metadata.field_help"),
  metadata_details_tab: t("Details", "metadata.details_tab"),
  metadata_fields_tab: t("Fields", "metadata.fields_tab"),
  metadata_object_types_tab: t("Object Types", "metadata.object_types_tab"),
  metadata_list_layout_tab: t("List Layouts", "metadata.list_layout_tab"),
  metadata_list_column: t("List column", "metadata.list_column"),
  metadata_list_layout_order: t("Order", "metadata.list_layout_order"),
  metadata_list_layout_from_fields: t(
    "From Field list_column (no Listlayout component).",
    "metadata.list_layout_from_fields",
  ),
  metadata_list_layout_from_component: t(
    "From Listlayout {name}.",
    "metadata.list_layout_from_component",
  ),
  metadata_empty_list_layout: t(
    "No list layout columns found.",
    "metadata.empty_list_layout",
  ),
  metadata_layouts_tab: t("Layouts", "metadata.layouts_tab"),
  metadata_actions_tab: t("Actions", "metadata.actions_tab"),
  metadata_empty_actions: t(
    "No object actions found.",
    "metadata.empty_actions",
  ),
  metadata_action_ref: t("Action", "metadata.action_ref"),
  metadata_available_all_states: t(
    "Available All States",
    "metadata.available_all_states",
  ),
  metadata_relationships_tab: t("Relationships", "metadata.relationships_tab"),
  metadata_empty_relationships: t(
    "No relationships found.",
    "metadata.empty_relationships",
  ),
  metadata_related_object: t("Related Object", "metadata.related_object"),
  metadata_relationship_type: t("Type", "metadata.relationship_type"),
  metadata_outbound_relationships: t(
    "Outbound Relationships",
    "metadata.outbound_relationships",
  ),
  metadata_inbound_relationships: t(
    "Inbound Relationships",
    "metadata.inbound_relationships",
  ),
  metadata_empty_outbound: t(
    "No outbound relationships.",
    "metadata.empty_outbound",
  ),
  metadata_empty_inbound: t(
    "No inbound relationships.",
    "metadata.empty_inbound",
  ),
  metadata_relationship_label: t(
    "Relationship Label",
    "metadata.relationship_label",
  ),
  metadata_outbound_name: t(
    "Outbound Relationship Name",
    "metadata.outbound_name",
  ),
  metadata_inbound_name: t(
    "Inbound Relationship Name",
    "metadata.inbound_name",
  ),
  metadata_secured: t("Secured", "metadata.secured"),
  metadata_field_type: t("Field Type", "metadata.field_type"),
  metadata_sharing_rules_tab: t("Sharing Rules", "metadata.sharing_rules_tab"),
  metadata_empty_sharing_rules: t(
    "No sharing rules found.",
    "metadata.empty_sharing_rules",
  ),
  metadata_sharing_rule_criteria: t(
    "Criteria",
    "metadata.sharing_rule_criteria",
  ),
  metadata_sharing_rule_role: t("Role", "metadata.sharing_rule_role"),
  metadata_sharing_rule_members: t("Members", "metadata.sharing_rule_members"),
  metadata_permission_sets_title: t(
    "Permission Sets",
    "metadata.permission_sets_title",
  ),
  metadata_permission_set_detail_title: t(
    "Permission Set",
    "metadata.permission_set_detail_title",
  ),
  metadata_empty_permission_sets: t(
    "No permission sets found.",
    "metadata.empty_permission_sets",
  ),
  metadata_security_profiles_title: t(
    "Security Profiles",
    "metadata.security_profiles_title",
  ),
  metadata_security_profile_detail_title: t(
    "Security Profile",
    "metadata.security_profile_detail_title",
  ),
  metadata_empty_security_profiles: t(
    "No security profiles found.",
    "metadata.empty_security_profiles",
  ),
  metadata_security_profiles_search_placeholder: t(
    "Search security profiles",
    "metadata.security_profiles_search_placeholder",
  ),
  metadata_security_profile_ps_count: t(
    "Permission Sets",
    "metadata.security_profile_ps_count",
  ),
  metadata_security_profile_member_missing: t(
    "missing",
    "metadata.security_profile_member_missing",
  ),
  metadata_security_profile_users_title: t(
    "Users",
    "metadata.security_profile_users_title",
  ),
  metadata_security_profile_user_name: t(
    "User Name",
    "metadata.security_profile_user_name",
  ),
  metadata_security_profile_empty_users: t(
    "No users assigned to this security profile.",
    "metadata.security_profile_empty_users",
  ),
  metadata_security_profile_users_search_placeholder: t(
    "Search users",
    "metadata.security_profile_users_search_placeholder",
  ),
  metadata_permission_entry: t("Permission", "metadata.permission_entry"),
  metadata_permission_actions: t("Actions", "metadata.permission_actions"),
  metadata_permission_description: t(
    "Description",
    "metadata.permission_description",
  ),
  metadata_permission_sets_search_placeholder: t(
    "Search permission sets",
    "metadata.permission_sets_search_placeholder",
  ),
  metadata_permission_objects_search_placeholder: t(
    "Filter objects and permissions",
    "metadata.permission_objects_search_placeholder",
  ),
  metadata_permission_objects_count: t(
    "{objects} objects · {entries} entries",
    "metadata.permission_objects_count",
  ),
  metadata_permission_expand_all: t(
    "Expand all",
    "metadata.permission_expand_all",
  ),
  metadata_permission_collapse_all: t(
    "Collapse all",
    "metadata.permission_collapse_all",
  ),
  metadata_permission_search_placeholder: t(
    "Search permissions across all tabs",
    "metadata.permission_search_placeholder",
  ),
  metadata_permission_no_matches: t(
    "No matching permissions.",
    "metadata.permission_no_matches",
  ),
  metadata_permission_type: t("Type", "metadata.permission_type"),
  metadata_permission_kind_object: t(
    "Object",
    "metadata.permission_kind_object",
  ),
  metadata_permission_kind_object_type: t(
    "Object Type",
    "metadata.permission_kind_object_type",
  ),
  metadata_permission_kind_tab: t("Tab", "metadata.permission_kind_tab"),
  metadata_permission_kind_fields: t(
    "Fields",
    "metadata.permission_kind_fields",
  ),
  metadata_permission_kind_field: t("Field", "metadata.permission_kind_field"),
  metadata_permission_kind_controls: t(
    "Controls",
    "metadata.permission_kind_controls",
  ),
  metadata_permission_kind_record_action: t(
    "Record Action",
    "metadata.permission_kind_record_action",
  ),
  metadata_permission_object_permissions: t(
    "Object Permissions",
    "metadata.permission_object_permissions",
  ),
  metadata_permission_field_permissions: t(
    "Object Field Permissions",
    "metadata.permission_field_permissions",
  ),
  metadata_permission_control_permissions: t(
    "Object Control Permissions",
    "metadata.permission_control_permissions",
  ),
  metadata_permission_all_object_types: t(
    "All Object Types",
    "metadata.permission_all_object_types",
  ),
  metadata_permission_all_object_fields: t(
    "All Object Fields",
    "metadata.permission_all_object_fields",
  ),
  metadata_permission_all_object_controls: t(
    "All Object Controls",
    "metadata.permission_all_object_controls",
  ),
  metadata_permission_objects_total: t(
    "{objects} objects",
    "metadata.permission_objects_total",
  ),
  metadata_permission_record_access: t(
    "Record Access",
    "metadata.permission_record_access",
  ),
  metadata_permission_no_grants: t(
    "No record access",
    "metadata.permission_no_grants",
  ),
  metadata_permission_category_admin: t(
    "Admin",
    "metadata.permission_category_admin",
  ),
  metadata_permission_category_application: t(
    "Application",
    "metadata.permission_category_application",
  ),
  metadata_permission_category_objects: t(
    "Objects",
    "metadata.permission_category_objects",
  ),
  metadata_permission_category_tabs: t(
    "Tabs",
    "metadata.permission_category_tabs",
  ),
  metadata_permission_category_pages: t(
    "Pages",
    "metadata.permission_category_pages",
  ),
  metadata_permission_category_mobile: t(
    "Mobile",
    "metadata.permission_category_mobile",
  ),
  metadata_filter_all_sources: t("All sources", "metadata.filter_all_sources"),
  metadata_filter_all_statuses: t(
    "All statuses",
    "metadata.filter_all_statuses",
  ),
  metadata_filter_all: t("All", "metadata.filter_all"),
  metadata_filter_all_classes: t("All classes", "metadata.filter_all_classes"),
  metadata_permission_reference_count: t(
    "References",
    "metadata.permission_reference_count",
  ),
  metadata_permission_orphan: t("Unused", "metadata.permission_orphan"),
  metadata_reference_filter_all: t(
    "All usage",
    "metadata.reference_filter_all",
  ),
  metadata_reference_filter_referenced: t(
    "Referenced",
    "metadata.reference_filter_referenced",
  ),
  metadata_reference_filter_unreferenced: t(
    "Unreferenced",
    "metadata.reference_filter_unreferenced",
  ),
  metadata_permission_used_by: t("Used By", "metadata.permission_used_by"),
  metadata_permission_used_by_profiles: t(
    "Security Profiles",
    "metadata.permission_used_by_profiles",
  ),
  metadata_permission_used_by_roles: t(
    "Application Roles",
    "metadata.permission_used_by_roles",
  ),
  metadata_permission_used_by_none: t(
    "Not referenced by any security profile or application role.",
    "metadata.permission_used_by_none",
  ),
  metadata_permission_inactive_suffix: t(
    "inactive",
    "metadata.permission_inactive_suffix",
  ),
  metadata_permission_section_other: t(
    "Other",
    "metadata.permission_section_other",
  ),
  metadata_capability_security: t("Security", "metadata.capability.security"),
  metadata_capability_configuration: t(
    "Configuration",
    "metadata.capability.configuration",
  ),
  metadata_capability_operations: t(
    "Operations",
    "metadata.capability.operations",
  ),
  metadata_capability_vault_actions: t(
    "Vault Actions",
    "metadata.capability.vault_actions",
  ),
  metadata_capability_vault_owner_actions: t(
    "Vault Owner Actions",
    "metadata.capability.vault_owner_actions",
  ),
  metadata_capability_vault_client_applications: t(
    "Vault Client Applications",
    "metadata.capability.vault_client_applications",
  ),
  metadata_capability_vault_loader: t(
    "Vault Loader",
    "metadata.capability.vault_loader",
  ),
  metadata_capability_deployment: t(
    "Deployment",
    "metadata.capability.deployment",
  ),
  metadata_capability_domain_administration: t(
    "Domain Administration",
    "metadata.capability.domain_administration",
  ),
  metadata_capability_users: t("Users", "metadata.capability.users"),
  metadata_capability_user: t("User", "metadata.capability.user"),
  metadata_capability_groups: t("Groups", "metadata.capability.groups"),
  metadata_capability_domain_users: t(
    "Domain Users",
    "metadata.capability.domain_users",
  ),
  metadata_capability_business_admin_objects: t(
    "Business Admin Objects",
    "metadata.capability.business_admin_objects",
  ),
  metadata_capability_object_layouts: t(
    "Object Layouts",
    "metadata.capability.object_layouts",
  ),
  metadata_capability_object: t("Object", "metadata.capability.object"),
  metadata_capability_settings: t("Settings", "metadata.capability.settings"),
  metadata_capability_security_profiles: t(
    "Security Profiles",
    "metadata.capability.security_profiles",
  ),
  metadata_capability_permission_sets: t(
    "Permission Sets",
    "metadata.capability.permission_sets",
  ),
  metadata_capability_localized_labels: t(
    "Localized Labels",
    "metadata.capability.localized_labels",
  ),
  metadata_capability_language_region: t(
    "Language & Region",
    "metadata.capability.language_region",
  ),
  metadata_capability_branding: t("Branding", "metadata.capability.branding"),
  metadata_capability_workflow: t("Workflow", "metadata.capability.workflow"),
  metadata_capability_workflow_administration: t(
    "Workflow Administration",
    "metadata.capability.workflow_administration",
  ),
  metadata_capability_document: t("Document", "metadata.capability.document"),
  metadata_capability_reporting: t(
    "Reporting",
    "metadata.capability.reporting",
  ),
  metadata_capability_search: t("Search", "metadata.capability.search"),
  metadata_capability_audit_trail: t(
    "Audit Trail",
    "metadata.capability.audit_trail",
  ),
  metadata_capability_api: t("API", "metadata.capability.api"),
  metadata_capability_create_button: t(
    "Create Button",
    "metadata.capability.create_button",
  ),
  metadata_capability_edl_matching: t(
    "EDL Matching",
    "metadata.capability.edl_matching",
  ),
  metadata_capability_views: t("Views", "metadata.capability.views"),
  metadata_capability_crosslink: t(
    "CrossLink",
    "metadata.capability.crosslink",
  ),
  metadata_capability_viewer_administration: t(
    "Viewer Administration",
    "metadata.capability.viewer_administration",
  ),
  metadata_capability_legal_hold: t(
    "Legal Hold",
    "metadata.capability.legal_hold",
  ),
  metadata_capability_renditions: t(
    "Renditions",
    "metadata.capability.renditions",
  ),
  metadata_capability_jobs: t("Jobs", "metadata.capability.jobs"),
  metadata_capability_sdk_job_queues: t(
    "Job Queues",
    "metadata.capability.sdk_job_queues",
  ),
  metadata_capability_email_notification_status: t(
    "Email Notification Status",
    "metadata.capability.email_notification_status",
  ),
  metadata_capability_all_object_records: t(
    "All Object Records",
    "metadata.capability.all_object_records",
  ),
  metadata_capability_veeva_snap: t(
    "Veeva Snap",
    "metadata.capability.veeva_snap",
  ),
  metadata_capability_picklists: t(
    "Picklists",
    "metadata.capability.picklists",
  ),
  metadata_capability_templates: t(
    "Templates",
    "metadata.capability.templates",
  ),
  metadata_capability_logs: t("Logs", "metadata.capability.logs"),
  metadata_capability_connections: t(
    "Connections",
    "metadata.capability.connections",
  ),
  metadata_capability_all_configuration_read: t(
    "All Configuration Read",
    "metadata.capability.all_configuration_read",
  ),
  metadata_capability_ui_diagnostics: t(
    "UI Diagnostics",
    "metadata.capability.ui_diagnostics",
  ),
  metadata_capability_ui_metadata: t(
    "UI Metadata",
    "metadata.capability.ui_metadata",
  ),
  metadata_capability_bulk_translation: t(
    "Bulk Translation",
    "metadata.capability.bulk_translation",
  ),
  expand_subtabs: t("Expand", "nav.expand_subtabs"),
  collapse_subtabs: t("Collapse", "nav.collapse_subtabs"),
  subtabs_suffix: t("subtabs", "nav.subtabs_suffix"),
  empty_no_columns: t("No columns to display.", "ui.empty_no_columns"),
  empty_no_records: t("No records", "ui.empty_no_records"),
  vault_entering: t("Entering Vault…", "ui.vault_entering"),
  tab_nav_aria: t("Application tabs", "nav.tab_nav_aria"),
  first_page: t("First page", "ui.first_page"),
  next_page: t("Next page", "ui.next_page"),
  filter: t("Filter", "ui.filter"),
  return_to_record: t("Back to record", "ui.return_to_record"),
  vault_home: t("Vault home", "ui.vault_home"),
  admin_logs: t("Admin Logs", "admin.logs"),
  admin_users_groups: t("Users & Groups", "admin.users_groups"),
  admin_language_region_settings: t(
    "Language & Region Settings",
    "language_region_settings.page_title",
  ),
  admin_branding_settings: t(
    "Branding Settings",
    "branding_settings.page_title",
  ),
  admin_search_settings: t("Search Settings", "search_settings.page_title"),
  admin_security_settings: t(
    "Security Settings",
    "security_settings.page_title",
  ),
  admin_domain_settings: t("Domain Settings", "domain_settings.page_title"),
  admin_vault_settings_group: t("Vault Settings", "admin.settings.vault_group"),
  admin_domain_settings_group: t(
    "Domain Settings",
    "admin.settings.domain_group",
  ),
  admin_domain_settings_general_label: t("General", "domain_settings.general_label"),
  admin_domain_settings_features_label: t("Features", "domain_settings.features_label"),
  admin_domain_settings_security_policies_label: t(
    "Security Policies",
    "domain_settings.security_policies_label",
  ),
  admin_domain_settings_network_access_label: t(
    "Network Access Rules",
    "domain_settings.network_access_label",
  ),
  admin_domain_settings_saml_profiles_label: t(
    "SAML Profiles",
    "domain_settings.saml_profiles_label",
  ),
  admin_domain_settings_oauth_profiles_label: t(
    "OAuth 2.0 / OIDC Profiles",
    "domain_settings.oauth_profiles_label",
  ),
  admin_layout_profile: t("Layout Profile", "admin.layout_profile"),
  layout_preview_subtitle: t(
    "Read-only admin preview (POST /ui/preview/page) using a synthetic record snapshot.",
    "admin.layout_preview_subtitle",
  ),
  object_label: t("Object", "ui.object"),
  object_type_label: t("Object type", "ui.object_type"),
  layout_api_name_label: t("Layout api_name", "ui.layout_api_name"),
  record_snapshot_label: t("Record snapshot (JSON)", "ui.record_snapshot"),
  optional_placeholder: t("Optional", "ui.optional"),
  previewing: t("Previewing…", "admin.previewing"),
  generate_preview: t("Generate preview", "admin.generate_preview"),
  layout_preview_failed: t(
    "Layout preview failed",
    "admin.layout_preview_failed",
  ),
  layout_preview_required: t(
    "Object api_name and layout api_name are required",
    "admin.layout_preview_required",
  ),
  snapshot_must_be_object: t(
    "record_snapshot must be a JSON object",
    "admin.snapshot_must_be_object",
  ),
  preview_mode_prefix: t(
    "Preview mode · Record ID",
    "admin.preview_mode_prefix",
  ),
  virtual_layout_suffix: t("Virtual layout", "admin.virtual_layout_suffix"),
  status_prefix: t("Status:", "ui.status_prefix"),
  loading_diagnostics: t("Loading diagnostics…", "admin.loading_diagnostics"),
  load_diagnostics_failed: t(
    "Failed to load configuration diagnostics",
    "admin.load_diagnostics_failed",
  ),
  projection_status_prefix: t(
    "Projection status:",
    "admin.projection_status_prefix",
  ),
  severity: t("Severity", "admin.severity"),
  component_type: t("Component type", "admin.component_type"),
  issue_code: t("Issue code", "admin.issue_code"),
  route_label: t("Route", "admin.route"),
  all_severities: t("All", "admin.all_severities"),
  no_config_issues: t(
    "No unresolved configuration issues",
    "admin.no_config_issues",
  ),
  component: t("Component", "admin.component"),
  locator: t("Locator", "admin.locator"),
  description: t("Description", "admin.description"),
  layout_profile_title: t(
    "Layout Profile assignment",
    "admin.layout_profile_title",
  ),
  layout_profile_subtitle: t(
    "Assign the active layout profile for a Vault user; object default layouts apply when unassigned.",
    "admin.layout_profile_subtitle",
  ),
  loading_layout_profiles: t("Loading…", "admin.loading_layout_profiles"),
  load_layout_profile_failed: t(
    "Failed to load Layout Profile",
    "admin.load_layout_profile_failed",
  ),
  select_layout_profile: t(
    "Select a Layout Profile",
    "admin.select_layout_profile",
  ),
  save_assignment_failed: t(
    "Failed to save assignment",
    "admin.save_assignment_failed",
  ),
  target_user_id: t("Target user ID", "admin.target_user_id"),
  current_user_placeholder: t(
    "Leave blank for current user",
    "admin.current_user_placeholder",
  ),
  please_select: t("Please select…", "ui.please_select"),
  depends_on_field: t("Depends on {field}", "ui.depends_on_field"),
  no_profiles_available: t(
    "(No profiles available)",
    "admin.no_profiles_available",
  ),
  viewing_user: t("Viewing user:", "admin.viewing_user"),
  layout_profile_updated: t(
    "Layout Profile updated.",
    "admin.layout_profile_updated",
  ),
  current_assignment_prefix: t("Current:", "admin.current_assignment_prefix"),
  assigned_at_prefix: t("Assigned at", "admin.assigned_at_prefix"),
  saving: t("Saving…", "ui.saving"),
  save: t("Save", "ui.save"),
  page_tab_stub: t(
    "This Page Tab is wired into navigation and permissions. Full Page runtime (Custom Page / external embed) is out of scope for Phase 3; use the corresponding Admin entry or a dedicated page from a future app spec.",
    "page_tab.stub",
  ),
  reference_target_object: t("Target object:", "form.reference_target_object"),
  reference_filter: t("Filter records…", "form.reference_filter"),
  reference_select_record: t(
    "— Select record —",
    "form.reference_select_record",
  ),
  reference_loading_options: t(
    "Loading options…",
    "form.reference_loading_options",
  ),
  reference_load_failed: t(
    "Failed to load reference records",
    "form.reference_load_failed",
  ),
  reference_manual_id: t(
    "Enter record ID manually",
    "form.reference_manual_id",
  ),
  reference_create_action: t(
    "+ Create {object}",
    "form.reference_create_action",
  ),
  picklist_no_options: t(
    "No picklist options are available for this field.",
    "form.picklist_no_options",
  ),
  reference_missing_target: t(
    "This reference field has no target object configured.",
    "form.reference_missing_target",
  ),
  layout_rules_failed: t(
    "Layout rule evaluation failed",
    "form.layout_rules_failed",
  ),
  breadcrumb_aria: t("Breadcrumb", "ui.breadcrumb_aria"),
  lifecycle_stages_aria: t("Lifecycle stages", "ui.lifecycle_stages_aria"),
  global_search_aria: t("Global search", "ui.global_search_aria"),
  global_search_scope: t("All", "ui.global_search_scope"),
  global_search_placeholder: t("Search", "ui.global_search_placeholder"),
  global_search_advanced: t("Advanced search", "ui.global_search_advanced"),
  global_search_submit: t("Search", "ui.global_search_submit"),
  notifications_aria: t("Notifications", "ui.notifications_aria"),
  tab_collections_aria: t("Tab collections", "nav.tab_collections_aria"),
  tab_collections_label: t("Tab Collections", "nav.tab_collections_label"),
  tab_more_label: t("More Tabs", "nav.tab_more_label"),
  user_profile_menu: t("User Profile", "ui.user_profile_menu"),
  about_this_vault: t("About this Vault", "ui.about_this_vault"),
  help_menu: t("Help", "ui.help_menu"),
  keyboard_shortcuts: t("Keyboard Shortcuts", "ui.keyboard_shortcuts"),
  forbidden_title: t("Access denied", "ui.forbidden_title"),
  forbidden_subtitle: t(
    "You do not have permission to view this page.",
    "ui.forbidden_subtitle",
  ),
  component_type_example: t("Pagelayout", "admin.component_type_example"),
  document_viewer: defaultDocumentViewerChrome,
  cfg_packaging: defaultCfgPackagingChrome,
  vault_ai: defaultVaultAIChrome,
  domain_user: defaultDomainUserChrome,
  operations: defaultOperationsChrome,
  deployment: defaultDeploymentChrome,
  configuration: defaultConfigurationChrome,
  completeness_hover: defaultCompletenessHoverChrome,
  unsupported_image_type: t(
    "Unsupported image type",
    "ui.unsupported_image_type",
  ),
  image_too_large: t("Image must be 2 MB or smaller", "ui.image_too_large"),
  image_upload_failed: t("Upload failed", "ui.image_upload_failed"),
  image_save_failed: t("Save failed", "ui.image_save_failed"),
  image_alt: t("Image", "ui.image_alt"),
  list_create: t("Create", "list.create"),
  select_object_type: t("Select object type", "list.select_object_type"),
  form_create_title: t("Create {object}", "form.create_title"),
  form_submit_create: t("Create", "form.submit_create"),
};

export const defaultAuthChrome: AuthChrome = {
  login: t("Log In", "auth.login"),
  logging_in: t("Logging in…", "auth.logging_in"),
  login_failed: t("Log in failed", "auth.login_failed"),
  login_failed_with_code: t(
    "Log in failed ({code})",
    "auth.login_failed_with_code",
  ),
  continue: t("Continue", "auth.continue"),
  username: t("User Name", "auth.username"),
  password: t("Password", "auth.password"),
  login_help: t("Having trouble logging in?", "auth.login_help"),
  privacy_policy: t("Privacy Policy", "auth.privacy_policy"),
  log_in_title: t("Log in", "auth.log_in_title"),
  welcome_title: t("Welcome", "auth.welcome_title"),
  switch_user: t("Switch user", "auth.switch_user"),
  loading_vaults: t("Loading Vaults…", "auth.loading_vaults"),
  load_vaults_failed: t("Failed to load Vault list", "auth.load_vaults_failed"),
  select_vault: t("Select a Vault", "auth.select_vault"),
  select_vault_subtitle: t(
    "Choose a Vault to continue",
    "auth.select_vault_subtitle",
  ),
  load_failed_title: t("Failed to load", "auth.load_failed_title"),
  no_vaults: t("No Vaults available", "auth.no_vaults"),
  no_vaults_admin: t(
    "This account has no Vault assignments. Contact your administrator.",
    "auth.no_vaults_admin",
  ),
  open_vault: t("Open", "auth.open_vault"),
  oauth_denied: t("Authorization was denied", "auth.oauth_denied"),
  oauth_unauthorized: t("Unauthorized", "auth.oauth_unauthorized"),
  oauth_no_linked_user: t(
    "No linked user found. Contact your administrator.",
    "auth.oauth_no_linked_user",
  ),
};

export const defaultPageActionLabels: PageActionLabels = {
  edit: t("Edit", "action.edit"),
  delete: t("Delete", "action.delete"),
  deleting: t("Deleting…", "action.deleting"),
  copy: t("Copy", "action.copy"),
  audit: t("Audit", "action.audit"),
  all_actions: t("All actions", "action.all_actions"),
  layout: t("Layout", "action.layout"),
  switch_layout: t("Switch page layout", "action.switch_layout"),
  favorite: t("Favorite", "action.favorite"),
  unfavorite: t("Unfavorite", "action.unfavorite"),
  menu_group_manage: t("Manage", "action.menu_group_manage"),
  menu_group_edit: t("Edit", "action.menu_group_edit"),
  menu_group_view: t("View", "action.menu_group_view"),
  workflow_and_state_change: t(
    "Workflow and State Change",
    "action.workflow_and_state_change",
  ),
  menu_group_start_workflow: t(
    "Start Workflow",
    "action.menu_group_start_workflow",
  ),
  menu_group_change_state: t("Change State", "action.menu_group_change_state"),
  view_object_record: t("Object Record", "action.view_object_record"),
  view_document: t("View Document", "action.view_document"),
  view_binder: t("View Binder", "action.view_binder"),
  vault_ai_chat: t("Vault AI Chat", "action.vault_ai_chat"),
};

export const defaultPageMessages: PageMessages = {
  loading_detail: t("Loading record…", "record.loading_detail"),
  refreshing_detail: t("Updating layout…", "record.refreshing_detail"),
  delete_confirm: t(
    "Permanently delete this record? This cannot be undone.",
    "record.delete_confirm",
  ),
  preview_readonly: t(
    "Preview mode: read-only layout preview",
    "record.preview_readonly",
  ),
  list_fallback: t("List", "record.list_fallback"),
  empty_sections: t(
    "This layout has no visible field sections.",
    "record.empty_sections",
  ),
  related_objects: t("Related objects", "record.related_objects"),
  section_nav_aria: t("Page sections", "record.section_nav_aria"),
  record_list_position: t(
    "{index} of {total} records in this list",
    "record.record_list_position",
  ),
  prev_record: t("Previous record", "record.prev_record"),
  next_record: t("Next record", "record.next_record"),
  collapse_section_nav: t("Hide Navigation", "record.collapse_section_nav"),
  expand_section_nav: t("Show Navigation", "record.expand_section_nav"),
};

export const defaultWorkflowChrome: WorkflowChrome = {
  title: t("Workflow tasks", "workflow.title"),
  task_fallback: t("Task", "workflow.task_fallback"),
  sign_and_complete: t("Sign and complete", "workflow.sign_and_complete"),
  processing: t("Processing…", "workflow.processing"),
  cancel_workflow: t("Cancel workflow", "workflow.cancel"),
  cancel_reason_prompt: t(
    "Cancellation reason",
    "workflow.cancel_reason_prompt",
  ),
  cancel_failed: t("Failed to cancel workflow", "workflow.cancel_failed"),
  refresh_failed: t("Failed to refresh page", "workflow.refresh_failed"),
  signature_init_failed: t(
    "Failed to start signature",
    "workflow.signature_init_failed",
  ),
  signature_title_prefix: t(
    "Electronic signature:",
    "workflow.signature_title_prefix",
  ),
  confirm_password: t("Confirm password", "workflow.confirm_password"),
  signature_failed: t("Signature failed", "workflow.signature_failed"),
  signature_esig_forbidden: t(
    "You do not have permission to provide an electronic signature in this vault",
    "workflow.signature_esig_forbidden",
  ),
  submitting: t("Submitting…", "workflow.submitting"),
  confirm_signature: t("Confirm signature", "workflow.confirm_signature"),
  signature_capacity_label: t("Capacity", "workflow.signature_capacity_label"),
  signature_capacity_required: t(
    "Capacity is required",
    "workflow.signature_capacity_required",
  ),
  approve_or_reject_title: t(
    "Approve or Reject",
    "workflow.approve_or_reject_title",
  ),
  approve_reject_esign_instructions: t(
    "Please approve or reject the document(s) by providing your electronic signature and approval comments as appropriate.",
    "workflow.approve_reject_esign_instructions",
  ),
  signature_role_label: t("Role", "workflow.signature_role_label"),
  signature_username_label: t("User Name", "workflow.signature_username_label"),
  signature_username_required: t(
    "User Name is required",
    "workflow.signature_username_required",
  ),
  signature_username_mismatch: t(
    "User Name does not match the signed-in account",
    "workflow.signature_username_mismatch",
  ),
  required_to_proceed: t(
    "*Required to proceed",
    "workflow.required_to_proceed",
  ),
  empty_timeline: t("No workflow activity yet.", "workflow.empty_timeline"),
  signature_required_badge: t(
    "Signature required",
    "workflow.signature_required_badge",
  ),
  timeline_owner: t("Owner", "workflow.timeline_owner"),
  timeline_started: t("Started", "workflow.timeline_started"),
  timeline_finished: t("Finished", "workflow.timeline_finished"),
  timeline_completed: t("Completed", "workflow.timeline_completed"),
  timeline_tasks_summary: t(
    "tasks (active/completed/total)",
    "workflow.timeline_tasks_summary",
  ),
  timeline_state_change: t(
    "State changed to",
    "workflow.timeline_state_change",
  ),
  timeline_from_state: t("From", "workflow.timeline_from_state"),
  timeline_view_participants: t(
    "View Participants",
    "workflow.timeline_view_participants",
  ),
  timeline_reassign_task: t("Reassign Task", "workflow.timeline_reassign_task"),
  timeline_cancel_task: t("Cancel Task", "workflow.timeline_cancel_task"),
  timeline_tasks_truncated: t(
    "Showing the first 100 tasks.",
    "workflow.timeline_tasks_truncated",
  ),
  timeline_add_participants: t(
    "Add Participants",
    "workflow.timeline_add_participants",
  ),
  timeline_replace_owner: t(
    "Replace Workflow Owner",
    "workflow.timeline_replace_owner",
  ),
  timeline_email_participants: t(
    "Email Participants",
    "workflow.timeline_email_participants",
  ),
  timeline_update_workflow_due_date: t(
    "Update Workflow Due Date",
    "workflow.timeline_update_workflow_due_date",
  ),
  timeline_update_task_due_date: t(
    "Update Task Due Date",
    "workflow.timeline_update_task_due_date",
  ),
  timeline_action_column: t("ACTION", "workflow.timeline_action_column"),
  timeline_details_column: t("DETAILS", "workflow.timeline_details_column"),
  timeline_cancelled: t("Cancelled", "workflow.timeline_cancelled"),
  timeline_no_tasks: t(
    "This workflow has no tasks on this item",
    "workflow.timeline_no_tasks",
  ),
  timeline_unassigned: t("Unassigned", "workflow.timeline_unassigned"),
  timeline_due: t("Due", "workflow.timeline_due"),
  timeline_version: t("Version", "workflow.timeline_version"),
  due_overdue: t("Overdue", "workflow.due_overdue"),
  due_coming_soon: t("Due soon", "workflow.due_coming_soon"),
  due_on_track: t("On track", "workflow.due_on_track"),
  participants_group_column: t(
    "Participant Group",
    "workflow.participants_group_column",
  ),
  participants_type_column: t(
    "Participant Type",
    "workflow.participants_type_column",
  ),
  participants_user_column: t(
    "Participant",
    "workflow.participants_user_column",
  ),
  participants_added_column: t("Added", "workflow.participants_added_column"),
  participants_task_status_column: t(
    "Status",
    "workflow.participants_task_status_column",
  ),
  participants_related_tasks: t(
    "Related Tasks",
    "workflow.participants_related_tasks",
  ),
  participants_view_tasks: t("View Tasks", "workflow.participants_view_tasks"),
  participants_task_status_active: t(
    "Active",
    "workflow.participants_task_status_active",
  ),
  participants_task_status_completed: t(
    "Completed",
    "workflow.participants_task_status_completed",
  ),
  participants_task_status_potential: t(
    "Potential",
    "workflow.participants_task_status_potential",
  ),
  participants_loading: t(
    "Loading participants…",
    "workflow.participants_loading",
  ),
  complete_task: t("Complete", "workflow.complete_task"),
  claim_task: t("Accept", "workflow.claim_task"),
  show_more: t("Show more", "workflow.show_more"),
  show_less: t("Show less", "workflow.show_less"),
  instructions_label: t("Instructions", "workflow.instructions_label"),
  continue_to_signature: t(
    "Continue to signature",
    "workflow.continue_to_signature",
  ),
  verdict_label: t("Verdict", "workflow.verdict_label"),
  verdict_comment: t("Verdict Comment", "workflow.verdict_comment"),
  verdict_required: t("Verdict is required", "workflow.verdict_required"),
  comment_label: t("Comment", "workflow.comment_label"),
  comment_required: t("Comment is required", "workflow.comment_required"),
  complete_failed: t("Failed to complete task", "workflow.complete_failed"),
  complete_task_fallback: t("Complete", "workflow.complete_task_fallback"),
  select_users: t("Select users", "workflow.select_users"),
  assignment_available: t(
    "Available to any user",
    "workflow.assignment_available",
  ),
  assignment_assigned: t(
    "Assigned to every user",
    "workflow.assignment_assigned",
  ),
  load_users_failed: t("Failed to load users", "workflow.load_users_failed"),
  no_additional_info: t(
    "This workflow does not require additional information.",
    "workflow.no_additional_info",
  ),
  field_not_on_layout: t(
    "Field {field} is not on this page layout.",
    "workflow.field_not_on_layout",
  ),
};

export const defaultAuditChrome: AuditChrome = {
  type_aria: t("Audit types", "audit.type_aria"),
  panel_login: t("Login audit", "audit.panel_login"),
  panel_system: t("System audit", "audit.panel_system"),
  panel_domain: t("Domain Audit History", "audit.panel_domain"),
  panel_object_records: t(
    "Object Record Audit History",
    "audit.panel_object_records",
  ),
  get_history: t("Get History", "audit.get_history"),
  quick_history: t("Quick history", "audit.quick_history"),
  quick_history_placeholder: t(
    "Select time period...",
    "audit.quick_history_placeholder",
  ),
  quick_history_last_day: t("Last day", "audit.quick_history_last_day"),
  quick_history_last_7_days: t(
    "Last 7 days",
    "audit.quick_history_last_7_days",
  ),
  quick_history_last_2_weeks: t(
    "Last 2 weeks",
    "audit.quick_history_last_2_weeks",
  ),
  date_range: t("Date range", "audit.date_range"),
  date_range_to: t("to", "audit.date_range_to"),
  domain_range_required: t(
    "Select a time period or date range before getting history.",
    "audit.domain_range_required",
  ),
  domain_range_too_large: t(
    "Date range cannot exceed 2 weeks.",
    "audit.domain_range_too_large",
  ),
  trail_title: t("Audit trail", "audit.trail_title"),
  trail_title_for: t(
    "Audit trail for {object} : {object}: {record}",
    "audit.trail_title_for",
  ),
  loading_logs: t("Loading audit logs…", "audit.loading_logs"),
  loading_records: t("Loading audit records…", "audit.loading_records"),
  load_logs_failed: t("Failed to load audit logs", "audit.load_logs_failed"),
  load_records_failed: t(
    "Failed to load audit records",
    "audit.load_records_failed",
  ),
  object_api_name: t("Object api_name", "audit.object_api_name"),
  empty_records: t("No audit records", "audit.empty_records"),
  empty_domain_records: t("No items found", "audit.empty_domain_records"),
  empty_columns: t("No columns to display.", "audit.empty_columns"),
  export_csv: t("Export CSV", "audit.export_csv"),
  exporting: t("Exporting…", "audit.exporting"),
  export_failed: t("Export failed", "audit.export_failed"),
  export_timeout: t(
    "Export timed out. Please try again later.",
    "audit.export_timeout",
  ),
  filter_user: t("User", "audit.filter_user"),
  filter_action: t("Action", "audit.filter_action"),
  filter_type: t("Type", "audit.filter_type"),
  filter_status: t("Status", "audit.filter_status"),
  filter_vault_id: t("Vault ID", "audit.filter_vault_id"),
  filter_object: t("Object", "audit.filter_object"),
  filter_time_from: t("From", "audit.filter_time_from"),
  filter_time_to: t("To", "audit.filter_time_to"),
  include_related_objects: t(
    "Include related objects",
    "audit.include_related_objects",
  ),
  include_related_help: t(
    "Include audit events for related object records.",
    "audit.include_related_help",
  ),
  include_related_placeholder: t(
    "Select related objects…",
    "audit.include_related_placeholder",
  ),
  filter_timestamp: t("Timestamp", "audit.filter_timestamp"),
  filter_all: t("all", "audit.filter_all"),
  filter_in_range: t("is in the range", "audit.filter_in_range"),
  filter_equals: t("equals", "audit.filter_equals"),
  add_filter: t("Add filter", "audit.add_filter"),
  showing_events_for: t(
    "Showing events for {from} to {to} ({count} results)",
    "audit.showing_events_for",
  ),
  apply: t("Apply", "audit.apply"),
  col_timestamp_alphanumeric: t(
    "Timestamp (dd MMM yyyy)",
    "audit.col_timestamp_alphanumeric",
  ),
  col_timestamp_iso8601: t(
    "Timestamp (yyyy-MM-dd)",
    "audit.col_timestamp_iso8601",
  ),
  col_timestamp_numeric: t(
    "Timestamp (MM/dd/yyyy)",
    "audit.col_timestamp_numeric",
  ),
  col_user_name: t("User Name", "audit.col_user_name"),
  col_event_description: t("Event Description", "audit.col_event_description"),
  col_record: t("Record", "audit.col_record"),
  col_item: t("Item", "audit.col_item"),
  col_source_ip: t("Source IP", "audit.col_source_ip"),
  col_type: t("Type", "audit.col_type"),
  col_status: t("Status", "audit.col_status"),
  col_browser: t("Browser", "audit.col_browser"),
  col_platform: t("Platform", "audit.col_platform"),
  col_vault_id: t("Vault ID", "audit.col_vault_id"),
  field_changed_from: t(
    `"{field}" changed from "{old}" to "{new}"`,
    "audit.field_changed_from",
  ),
  field_set_to: t(`"{field}" set to "{new}"`, "audit.field_set_to"),
  item_created: t("{item} created", "audit.item_created"),
  on_behalf_of: t("{user} on behalf of {principal}", "audit.on_behalf_of"),
  none: t("<none>", "audit.none"),
  lifecycle_via: t("via {trigger}", "audit.lifecycle_via"),
  trigger_create: t("create", "audit.trigger_create"),
  trigger_user_action: t("user action", "audit.trigger_user_action"),
  trigger_entry_action: t("entry action", "audit.trigger_entry_action"),
  trigger_event_action: t("event action", "audit.trigger_event_action"),
  close: t("Close", "audit.close"),
};

export const defaultSharingChrome: SharingChrome = {
  title: t("Sharing Settings", "sharing_settings_panel_tab"),
  help: t(
    "Use this page to manage sharing settings for an object record. Sharing Settings provide details on who has access to an object record.",
    "record_sharing_settings_help",
  ),
  loading: t("Loading sharing settings…", "sharing.loading"),
  load_failed: t("Failed to load sharing settings", "sharing.load_failed"),
  empty_rows: t("No sharing assignments", "sharing.empty_rows"),
  filter_roles: t("Role", "sharing.filter_roles"),
  filter_members: t("Users and Groups", "sharing.filter_members"),
  add: t("Add", "sharing.add"),
  display_rule: t("Display Rule", "sharing.display_rule"),
  all_roles: t("All Roles", "sharing.all_roles"),
  all_users_and_groups: t(
    "All Users and Groups",
    "sharing.all_users_and_groups",
  ),
  pagination_template: t("{start}-{end} of {total}", "sharing.pagination"),
  member_user_aria: t("User", "sharing.member_user_aria"),
  member_group_aria: t("Group", "sharing.member_group_aria"),
  add_dialog_title: t("Add Sharing Assignment", "sharing.add_dialog_title"),
  add_role_label: t("Role", "sharing.add_role_label"),
  add_member_label: t("User or Group", "sharing.add_member_label"),
  add_search_label: t("Search users and groups", "sharing.add_search_label"),
  add_submit: t("Add", "sharing.add_submit"),
  add_cancel: t("Cancel", "sharing.add_cancel"),
  add_failed: t("Failed to add sharing assignment", "sharing.add_failed"),
  remove: t("Remove", "sharing.remove"),
  remove_confirm: t(
    'Are you sure you wish to remove "{member}"?',
    "sharing.remove_confirm",
  ),
  remove_failed: t(
    "Failed to remove sharing assignment",
    "sharing.remove_failed",
  ),
};

export const defaultListChrome: ListChrome = {
  loading_list: t("Loading list…", "list.loading"),
  list_view_aria: t("List views", "list.view_aria"),
  views_title: t("Views", "list.views_title"),
  filters_title: t("Filters", "list.filters_title"),
  keyword: t("Keyword", "list.keyword"),
  keyword_placeholder: t("Enter keyword…", "list.keyword_placeholder"),
  search_columns: t("Search Columns", "list.search_columns"),
  active_users_view: t("Active Users", "list.active_users_view"),
  field: t("Field", "list.field"),
  all_filterable_fields: t(
    "All filterable fields",
    "list.all_filterable_fields",
  ),
  first_page: t("First page", "list.first_page"),
  previous_page: t("Previous page", "list.previous_page"),
  next_page: t("Next page", "list.next_page"),
  page_input_label: t("Page number", "list.page_input_label"),
  left_first_page: t("Not on first page", "list.left_first_page"),
  page_size_label: t("Page size", "list.page_size_label"),
  page_size_option: t("{size} per page", "list.page_size_option"),
  record_count: t("{count} records", "list.record_count"),
  pagination_range: t("{start}-{end} of {total}", "list.pagination_range"),
  empty_list: t("No records match the current view.", "list.empty"),
  config_error_list: t(
    "This list view is unavailable. Showing a fallback view.",
    "list.config_error",
  ),
  sort_fallback_notice: t(
    "Saved sort is unavailable; using default order.",
    "list.sort_fallback",
  ),
  create: t("Create", "list.create"),
  select_object_type: t("Select object type", "list.select_object_type"),
  edit_columns: t("Edit Columns", "list.edit_columns"),
  edit_columns_title: t("Select Columns to Display", "list.edit_columns_title"),
  edit_filters: t("Edit Filters", "list.edit_filters"),
  edit_filters_title: t("Select Display Filters", "list.edit_filters_title"),
  available_columns: t("Available Columns", "list.available_columns"),
  selected_columns: t("Selected Columns", "list.selected_columns"),
  available_filters: t("Available Filters", "list.available_filters"),
  selected_filters: t("Selected Filters", "list.selected_filters"),
  restore_defaults: t("Restore defaults", "list.restore_defaults"),
  columns_search_placeholder: t(
    "Search columns…",
    "list.columns_search_placeholder",
  ),
  move_all_right: t("Move all to selected", "list.move_all_right"),
  move_right: t("Move to selected", "list.move_right"),
  move_left: t("Move to available", "list.move_left"),
  move_all_left: t("Move all to available", "list.move_all_left"),
  move_to_top: t("Move to top", "list.move_to_top"),
  move_up: t("Move up", "list.move_up"),
  move_down: t("Move down", "list.move_down"),
  move_to_bottom: t("Move to bottom", "list.move_to_bottom"),
  close_dialog: t("Close", "list.close_dialog"),
  cell_text_truncate: t("Truncate cell text", "list.cell_text_truncate"),
  cell_text_wrap: t("Wrap cell text", "list.cell_text_wrap"),
  freeze_column: t("Freeze column", "list.freeze_column"),
  unfreeze_column: t("Unfreeze column", "list.unfreeze_column"),
  freeze_column_none: t("None", "list.freeze_column_none"),
  display_preferences: t("Display preferences", "list.display_preferences"),
  manage_views: t("Manage Views", "list.manage_views"),
  manage_views_title: t("Manage Saved Views", "list.manage_views_title"),
  edit_views: t("Edit views", "list.edit_views"),
  edit_views_title: t("Edit {tab} Views", "list.edit_views_title"),
  save_view: t("Save View", "list.save_view"),
  save_view_as: t("Save View As", "list.save_view_as"),
  rename_view: t("Rename", "list.rename_view"),
  share_view: t("Share", "list.share_view"),
  remove_from_sidebar: t("Remove from Sidebar", "list.remove_from_sidebar"),
  search_views: t("Search views", "list.search_views"),
  sort_by_label: t("Sort by", "list.sort_by_label"),
  sort_by_creation_date: t("Creation Date", "list.sort_by_creation_date"),
  view_owner_label: t("Owner: {owner}", "list.view_owner_label"),
  save_view_dialog_info: t(
    "The saved view will include the current filters, sort order, and column settings.",
    "list.save_view_dialog_info",
  ),
  list_actions_aria: t("List actions", "list.actions_aria"),
  create_view: t("Create View", "list.create_view"),
  edit_view: t("Edit", "list.edit_view"),
  delete_view: t("Delete", "list.delete_view"),
  copy_view: t("Copy", "list.copy_view"),
  set_personal_default: t("Set as my default", "list.set_personal_default"),
  clear_personal_default: t("Clear my default", "list.clear_personal_default"),
  personal_default_badge: t("My default", "list.personal_default_badge"),
  view_label: t("View name", "list.view_label"),
  view_criteria: t("Filter criteria (VQL)", "list.view_criteria"),
  view_criteria_help: t(
    "Example: name__v CONTAINS 'Alpha'",
    "list.view_criteria_help",
  ),
  delete_view_confirm: t("Delete this saved view?", "list.delete_view_confirm"),
  add_favorite_aria: t("Add to favorites", "list.add_favorite_aria"),
  remove_favorite_aria: t("Remove from favorites", "list.remove_favorite_aria"),
  active_filter_label: t("{field}: {value}", "list.active_filter_label"),
  active_filters_heading: t("Filters ({count})", "list.active_filters_heading"),
  clear_all_filters: t("Clear all filters", "list.clear_all_filters"),
  link_to_record: t("[Link to Record]", "list.link_to_record"),
  facet_undefined: t("(undefined)", "list.facet_undefined"),
  facet_search_placeholder: t(
    "Search values…",
    "list.facet_search_placeholder",
  ),
  facet_clear_field: t("Clear", "list.facet_clear_field"),
  facet_loading: t("Loading filters…", "list.facet_loading"),
  facet_advanced: t("Advanced", "list.facet_advanced"),
  facet_basic: t("Basic", "list.facet_basic"),
  facet_op_in: t("in", "list.facet_op_in"),
  facet_op_equals: t("equals", "list.facet_op_equals"),
  facet_op_not_equal: t("is not equal to", "list.facet_op_not_equal"),
  facet_op_contains: t("contains", "list.facet_op_contains"),
  facet_op_blank: t("is blank", "list.facet_op_blank"),
  facet_op_not_blank: t("is not blank", "list.facet_op_not_blank"),
  date_filter_range: t("is in the range", "list.date_filter_range"),
  date_filter_before: t("is before", "list.date_filter_before"),
  date_filter_after: t("is after", "list.date_filter_after"),
  date_filter_equals: t("equals", "list.date_filter_equals"),
  date_filter_blank: t("is blank", "list.date_filter_blank"),
  date_filter_not_blank: t("is not blank", "list.date_filter_not_blank"),
  date_filter_preset_label: t("Preset", "list.date_filter_preset_label"),
  date_filter_last_n: t("is in the last", "list.date_filter_last_n"),
  date_filter_next_n: t("is in the next", "list.date_filter_next_n"),
  date_filter_not_last_n: t(
    "is not in the last",
    "list.date_filter_not_last_n",
  ),
  date_filter_last_full_n: t(
    "is in the last full",
    "list.date_filter_last_full_n",
  ),
  date_unit_days: t("days", "list.date_unit_days"),
  date_unit_weeks: t("weeks", "list.date_unit_weeks"),
  date_unit_months: t("months", "list.date_unit_months"),
  date_unit_quarters: t("quarters", "list.date_unit_quarters"),
  date_unit_years: t("years", "list.date_unit_years"),
  number_filter_equals: t("equals", "list.number_filter_equals"),
  number_filter_blank: t("is blank", "list.number_filter_blank"),
  number_filter_not_blank: t("is not blank", "list.number_filter_not_blank"),
  number_filter_value_placeholder: t(
    "Enter a number",
    "list.number_filter_value_placeholder",
  ),
  date_preset_today: t("Today", "list.date_preset_today"),
  date_preset_yesterday: t("Yesterday", "list.date_preset_yesterday"),
  date_preset_this_week: t("This Week", "list.date_preset_this_week"),
  date_preset_last_week: t("Last Week", "list.date_preset_last_week"),
  date_preset_next_week: t("Next Week", "list.date_preset_next_week"),
  date_preset_current_month: t(
    "Current Month",
    "list.date_preset_current_month",
  ),
  date_preset_prior_month: t("Prior Month", "list.date_preset_prior_month"),
  date_preset_next_month: t("Next Month", "list.date_preset_next_month"),
  date_preset_current_quarter: t(
    "Current Quarter",
    "list.date_preset_current_quarter",
  ),
  date_preset_prior_quarter: t(
    "Prior Quarter",
    "list.date_preset_prior_quarter",
  ),
  date_preset_next_quarter: t("Next Quarter", "list.date_preset_next_quarter"),
  date_preset_current_year: t("Current Year", "list.date_preset_current_year"),
  date_preset_prior_year: t("Prior Year", "list.date_preset_prior_year"),
  date_preset_next_year: t("Next Year", "list.date_preset_next_year"),
};

export const defaultFormChrome: FormChrome = {
  loading_form: t("Loading form…", "form.loading"),
  saving: t("Saving…", "form.saving"),
  create_title: t("Create {object}", "form.create_title"),
  edit_title: t("Edit record", "form.edit_title"),
  copy_title: t("Copy record", "form.copy_title"),
  layout_prefix: t("Layout:", "form.layout_prefix"),
  updating_rules: t("Updating layout rules…", "form.updating_rules"),
  list_fallback: t("List", "form.list_fallback"),
  submit_create: t("Create", "form.submit_create"),
  submit_save: t("Save", "form.submit_save"),
  submit_save_create: t("Save + Create", "form.submit_save_create"),
  record_created: t("Record created", "form.record_created"),
  record_id_placeholder: t("Record ID", "form.record_id_placeholder"),
  related_after_save: t(
    "Save the record to view related records.",
    "form.related_after_save",
  ),
  field_required: t("{field} is required", "form.field_required"),
  field_invalid_email: t(
    "Please enter a valid email",
    "form.field_invalid_email",
  ),
  validation_fix_fields: t(
    "Correct the highlighted fields before saving.",
    "form.validation_fix_fields",
  ),
  datetime_now: t("Now", "form.datetime_now"),
  section_nav_aria: t("Page sections", "record.section_nav_aria"),
  collapse_section_nav: t("Hide Navigation", "record.collapse_section_nav"),
  expand_section_nav: t("Show Navigation", "record.expand_section_nav"),
  open_calendar: t("Open calendar", "form.open_calendar"),
};

export const defaultRelatedChrome: RelatedChrome = {
  loading: t("Loading related records…", "related.loading"),
  load_failed: t("Failed to load related records", "related.load_failed"),
  load_more_failed: t("Failed to load more", "related.load_more_failed"),
  create_failed: t("Failed to create related record", "related.create_failed"),
  creating: t("Creating…", "related.creating"),
  confirm_create: t("Save", "related.confirm_create"),
  cancel: t("Cancel", "related.cancel"),
  create_related: t("Create", "related.create_related"),
  refresh: t("Refresh", "related.refresh"),
  load_more: t("Load more", "related.load_more"),
  name_field: t("Name (name__v)", "related.name_field"),
  optional: t("Optional", "related.optional"),
  empty_sections: t(
    "This layout has no visible field sections.",
    "related.empty_sections",
  ),
  related_objects: t("Related objects", "related.related_objects"),
  range_text: t("{start}-{end} of {total}", "related.range_text"),
  filtered_range_text: t(
    "{count} matching (of {loaded} loaded)",
    "related.filtered_range_text",
  ),
  add_existing: t("Add existing", "related.add_existing"),
  search_existing: t("Search records…", "related.search_existing"),
  search_title: t("Search: {object}", "related.search_title"),
  filter_label: t("Filters", "related.filter_label"),
  filter_field_placeholder: t("Select a field", "related.filter_field_placeholder"),
  filter_op_placeholder: t("Select a condition", "related.filter_op_placeholder"),
  filter_value_placeholder: t("Enter a value…", "related.filter_value_placeholder"),
  filter_op_contains: t("contains", "related.filter_op_contains"),
  filter_op_equals: t("equals", "related.filter_op_equals"),
  filter_op_not_equals: t("does not equal", "related.filter_op_not_equals"),
  filter_op_blank: t("is blank", "related.filter_op_blank"),
  filter_op_not_blank: t("is not blank", "related.filter_op_not_blank"),
  filter_op_between: t("is in the range", "related.filter_op_between"),
  filter_op_after: t("is after", "related.filter_op_after"),
  filter_op_before: t("is before", "related.filter_op_before"),
  filter_op_last_n: t("is in the last", "related.filter_op_last_n"),
  filter_op_next_n: t("is in the next", "related.filter_op_next_n"),
  filter_unit_days: t("days", "related.filter_unit_days"),
  filter_unit_weeks: t("weeks", "related.filter_unit_weeks"),
  filter_unit_months: t("months", "related.filter_unit_months"),
  filter_unit_quarters: t("quarters", "related.filter_unit_quarters"),
  filter_unit_years: t("years", "related.filter_unit_years"),
  add_filter: t("Add filter", "related.add_filter"),
  remove_filter: t("Remove filter", "related.remove_filter"),
  filter_search: t("Search", "related.filter_search"),
  link_selected: t("Add selected", "related.link_selected"),
  link_failed: t("Failed to link record", "related.link_failed"),
  search_failed: t("Failed to search records", "related.search_failed"),
  remove_relationship: t("Remove relationship", "related.remove_relationship"),
  remove_confirm: t(
    "Remove this related record from the relationship? The record will not be deleted.",
    "related.remove_confirm",
  ),
  remove_failed: t("Failed to remove relationship", "related.remove_failed"),
  removing: t("Removing…", "related.removing"),
  show_in_tab: t("Show in Tab", "related.show_in_tab"),
  no_candidates: t("No matching records found.", "related.no_candidates"),
  actions: t("Actions", "related.actions"),
  select_all: t("Select all", "related.select_all"),
  unselect_all: t("Unselect all", "related.unselect_all"),
  selected_count: t("{count} selected", "related.selected_count"),
  bulk_remove: t("Remove selected", "related.bulk_remove"),
  bulk_remove_confirm: t(
    "Remove {count} related records from the relationship? The records will not be deleted.",
    "related.bulk_remove_confirm",
  ),
  bulk_result: t(
    "{success} succeeded, {failure} failed",
    "related.bulk_result",
  ),
  delete_record: t("Delete record", "related.delete_record"),
  delete_record_confirm: t(
    "Permanently delete this related record? This cannot be undone.",
    "related.delete_record_confirm",
  ),
};

const joinRelatedChromeOverrides: Pick<
  RelatedChrome,
  | "add_existing"
  | "link_selected"
  | "remove_relationship"
  | "remove_confirm"
  | "bulk_remove"
  | "bulk_remove_confirm"
  | "remove_failed"
> = {
  add_existing: t("Add", "related.add_join"),
  link_selected: t("Add", "related.link_selected_join"),
  remove_relationship: t("Remove", "related.remove_join"),
  remove_confirm: t(
    "Remove this record from the relationship? The record will not be deleted.",
    "related.remove_join_confirm",
  ),
  bulk_remove: t("Remove", "related.bulk_remove_join"),
  bulk_remove_confirm: t(
    "Remove {count} records from the relationship? The records will not be deleted.",
    "related.bulk_remove_join_confirm",
  ),
  remove_failed: t("Failed to remove", "related.remove_join_failed"),
};

/** Join (M:M) related sections use Add / Remove per metadata-driven-ui spec. */
export function relatedChromeForJoinRelationship(
  chrome: RelatedChrome,
  joinRelationship: boolean,
): RelatedChrome {
  if (!joinRelationship) {
    return chrome;
  }
  return { ...chrome, ...joinRelatedChromeOverrides };
}
