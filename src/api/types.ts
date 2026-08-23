export type VaultRef = {
  vault_id: string;
  domain_id: string;
  name?: string;
  dns?: string;
  state?: string;
};

export type DisplayContext = {
  language: string;
  locale: string;
  timezone: string;
  date_format_profile?: string;
};

export type DisplayText = {
  text: string;
  key?: string;
  fallback_source?: string;
  language?: string;
};

export type LoginResponse = {
  session_token: string;
  user_id: string;
  home_domain_id: string;
  vaults: VaultRef[];
  default_vault_id?: string;
  display_context?: DisplayContext;
  chrome?: import("../lib/i18n/chromeTypes").AuthChrome;
};

export type LoginProviderLink = {
  provider_id: string;
  label: string;
  name: string;
};

export type ResolveLoginResponse = {
  auth_mode: "password" | "sso";
  authorize_url?: string;
  providers?: LoginProviderLink[];
  allow_browser_password_save?: boolean;
};

export type MeVaultsResponse = {
  user_id: string;
  home_domain_id: string;
  vaults: VaultRef[];
  default_vault_id?: string;
  display_context?: DisplayContext;
  chrome?: import("../lib/i18n/chromeTypes").AuthChrome;
};

export type MeIdentityResponse = {
  display_name: string;
  email: string;
  username: string;
};

export type MeAvatarResponse = {
  avatar_url?: string;
  avatar_media_id?: string;
};

export type NavTab = {
  api_name: string;
  label: DisplayText;
  kind: string;
  route: string;
  object_api_name?: string;
  object_type_api_name?: string;
  page_api_name?: string;
  admin_tab?: boolean;
  admin_surface?: string;
  navigation_context?: string;
  sidebar_group?: "vault" | "domain" | "jobs" | "email_notifications" | "environment" | "migration";
  subtabs?: NavTab[];
};

export type NavItem = {
  item_type: string;
  label: DisplayText;
  tab?: NavTab;
  menu_tabs?: NavTab[];
};

export type NavCollection = {
  api_name: string;
  label: DisplayText;
  system_kind?: string;
  help_content?: string;
  items: NavItem[];
};

export type NavigationModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").ShellChrome;
  capabilities?: {
    can_view_user_profile?: boolean;
    can_search?: boolean;
  };
  global_search_scopes?: Array<{
    id: string;
    label: DisplayText;
  }>;
  ui_fingerprint: string;
  collections: NavCollection[];
  /** When Vault AI Tab is available, typically "/vault-ai"; otherwise "/". */
  default_landing_route?: string;
};

export type TaskDashboardTaskItem = {
  task_id: string;
  task_kind: "user_task" | "workflow_task" | "active_workflow";
  name: string;
  due_date?: string;
  due_status: "overdue" | "due_soon" | "on_track" | "none";
  required: boolean;
  assigned_to?: string;
  assigned_to_you?: boolean;
  first_assigned_date?: string;
  title_timestamp?: string;
  object_api_name?: string;
  object_label?: string;
  record_id?: string;
  record_name?: string;
  instructions?: string;
  owner?: string;
  task_progress?: string;
  workflow_task_id?: string;
  workflow_api_name?: string;
  workflow_label?: string;
  workflow_version?: number;
  content_count?: number;
  complete_action?: string;
  can_accept?: boolean;
  can_unclaim?: boolean;
  can_complete?: boolean;
  can_continue?: boolean;
  record_detail_href?: string;
  completion?: WorkflowTaskAction;
};

export type TaskDashboardFilterOption = {
  value: string;
  label: string;
  count: number;
};

export type TaskDashboardFilters = {
  content_types?: string[];
  due_presets?: string[];
  due_from?: string;
  due_to?: string;
  owner_scopes?: string[];
  assigned_from?: string;
  assigned_to?: string;
  workflow_api_names?: string[];
  content_counts?: string[];
};

export type TaskDashboardFilterFacets = {
  content_types: TaskDashboardFilterOption[];
  workflows: TaskDashboardFilterOption[];
  content_counts?: TaskDashboardFilterOption[];
};

export type TaskDashboardModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").TaskDashboardChrome;
  view: string;
  view_counts: {
    all_tasks: number;
    my_tasks: number;
    available_tasks: number;
    active_workflows: number;
  };
  filters?: TaskDashboardFilters;
  filter_facets?: TaskDashboardFilterFacets;
  tasks: TaskDashboardTaskItem[];
  total_count: number;
  page_size: number;
  page_offset: number;
};

export type VaultCreateMenuItem = {
  kind?: string;
  label: DisplayText;
  tab_api_name?: string;
  object_api_name?: string;
  show_plus?: boolean;
  requires_type_selection?: boolean;
  object_types?: ObjectTypeOption[];
  default_object_type?: string;
  object_label?: DisplayText;
  list_routing?: ListRouting | null;
};

export type VaultCreateMenuModel = {
  model_type: string;
  vault_id: string;
  allowed: boolean;
  pinned: VaultCreateMenuItem[];
  recent: VaultCreateMenuItem[];
};

export type TMFHomeScopeOption = {
  record_id: string;
  name: string;
};

export type TMFHomeMilestoneItem = {
  record_id: string;
  name: string;
  planned_finish_date?: string;
  baseline_finish_date?: string;
  milestone_category?: string;
  completeness_label?: string;
  completeness_color?: string;
  record_detail_href: string;
};

export type TMFHomeQualityTypeCount = {
  type_name: string;
  type_label: string;
  count: number;
  open_count?: number;
  closed_count?: number;
};

export type TMFHomeModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").TMFHomeChrome;
  scope: {
    level: string;
    study_id?: string;
    study_name?: string;
    study_lifecycle_state?: string;
    study_lifecycle_label?: string;
    study_country_id?: string;
    study_country_name?: string;
    site_id?: string;
    site_name?: string;
  };
  studies: TMFHomeScopeOption[];
  study_countries: TMFHomeScopeOption[];
  study_sites: TMFHomeScopeOption[];
  navigation: { label: string; href: string }[];
  widgets: {
    upcoming_milestones: {
      items: TMFHomeMilestoneItem[];
      total_count: number;
      page: number;
      page_size: number;
      milestone_categories: string[];
      selected_category?: string;
      create_href?: string;
      view_all_href?: string;
    };
    completeness: {
      percent_complete: number;
      unapproved_count: number;
      overcount_count: number;
      pending_decision_count: number;
      milestone_filter_id?: string;
      unapproved_documents_href?: string;
      review_overcount_href?: string;
      review_pending_href?: string;
    };
    timeliness: {
      timely_percent: number;
      timely_count: number;
      late_percent: number;
      late_count: number;
      total_count: number;
      threshold_days: number;
    };
    tasks_requiring_attention: {
      overdue_count: number;
      unassigned_count: number;
      due_today_count: number;
      selected_category?: string;
      items?: TaskDashboardTaskItem[];
    };
    quality_issues: {
      visible: boolean;
      total_count: number;
      filter: string;
      assignee_filter: string;
      by_type: TMFHomeQualityTypeCount[];
      counts: Record<string, number>;
      create_action?: {
        allowed: boolean;
        href?: string;
        label?: string;
      };
    };
    my_tasks: {
      tasks: TaskDashboardTaskItem[];
      total_count: number;
      view_all_href?: string;
    };
  };
};

export type StudyMgmtHomeScopeOption = {
  record_id: string;
  name: string;
};

export type StudyMgmtHomeSummaryMetric = {
  key: string;
  label: string;
  kind: string;
  actual?: number;
  planned?: number;
  forecast?: number;
  percent?: number;
  display_value?: string;
};

export type StudyMgmtHomeMilestoneItem = {
  record_id: string;
  name: string;
  baseline_finish_date?: string;
  planned_finish_date?: string;
  actual_finish_date?: string;
  completeness_label?: string;
  completeness_color?: string;
  sequence?: number;
  lifecycle_state?: string;
  lifecycle_state_label?: string;
  record_detail_href: string;
};

export type StudyMgmtHomeModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").ClinicalHomeChrome;
  scope: {
    level: string;
    study_id?: string;
    study_name?: string;
    study_lifecycle_state?: string;
    study_lifecycle_label?: string;
    study_country_id?: string;
    study_country_name?: string;
    site_id?: string;
    site_name?: string;
    enrollment_status_title: string;
  };
  studies: StudyMgmtHomeScopeOption[];
  study_countries: StudyMgmtHomeScopeOption[];
  study_sites: StudyMgmtHomeScopeOption[];
  widgets: {
    summary_metrics: {
      items: StudyMgmtHomeSummaryMetric[];
      last_updated?: string;
    };
    monitoring_compliance: {
      visits_overdue: number;
      visits_expected: number;
      cycle_time_label: string;
      cycle_time_display: string;
      compliance_percent?: number;
      compliance_compliant?: number;
      compliance_total?: number;
    };
    my_tasks: {
      tasks: TaskDashboardTaskItem[];
      total_count: number;
      view_all_href?: string;
    };
    monitoring_status: {
      bars: Array<{
        event_type: string;
        event_label: string;
        total: number;
        states: Array<{ state: string; state_label: string; count: number }>;
      }>;
      empty_label?: string;
    };
    milestones: {
      title: string;
      items: StudyMgmtHomeMilestoneItem[];
      total_count: number;
      page: number;
      page_size: number;
      milestone_categories: string[];
      selected_category?: string;
      create_href?: string;
      view_all_href?: string;
    };
    enrollment_status: {
      title: string;
      series: Array<{
        status: string;
        status_label: string;
        points: Array<{ date: string; value: number }>;
      }>;
      legend: string[];
      missing_data?: string[];
      last_updated?: string;
      export_allowed: boolean;
      visible: boolean;
    };
  };
};

export type CRAHomeScopeOption = {
  record_id: string;
  name: string;
};

export type CRAHomeSummaryMetric = StudyMgmtHomeSummaryMetric;

export type CRAHomeQualityBar = {
  key: string;
  label: string;
  total: number;
  segments: Array<{ key: string; label: string; count: number }>;
};

export type CRAHomeModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").ClinicalHomeChrome;
  scope: {
    level: string;
    study_id?: string;
    study_name?: string;
    study_lifecycle_state?: string;
    study_lifecycle_label?: string;
    study_country_id?: string;
    study_country_name?: string;
    site_id?: string;
    site_name?: string;
    enrollment_status_title: string;
    quality_title: string;
    details_title: string;
    page_title: string;
  };
  studies: CRAHomeScopeOption[];
  study_countries: CRAHomeScopeOption[];
  study_sites: CRAHomeScopeOption[];
  widgets: {
    details: {
      title: string;
      fields: Array<{ label: string; value: string }>;
      create_communication_log_href?: string;
    };
    summary_metrics: {
      items: CRAHomeSummaryMetric[];
      last_updated?: string;
    };
    monitoring_plan: {
      items: Array<{
        record_id: string;
        name: string;
        study_site_name?: string;
        planned_visit_start_date?: string;
        lifecycle_state_label?: string;
        record_detail_href: string;
      }>;
      total_count: number;
      create_href?: string;
      view_all_href?: string;
    };
    my_tasks: {
      tasks: TaskDashboardTaskItem[];
      total_count: number;
      view_all_href?: string;
    };
    enrollment_status: {
      title: string;
      series: Array<{
        status: string;
        status_label: string;
        points: Array<{ date: string; value: number }>;
      }>;
      legend: string[];
      missing_data?: string[];
      last_updated?: string;
      export_allowed: boolean;
    };
    quality: {
      title: string;
      issues_chart: {
        title: string;
        bars: CRAHomeQualityBar[];
        status_filter?: string;
        status_options?: string[];
        average_count?: number;
        legend?: string[];
      };
      open_items_chart: {
        title: string;
        bars: CRAHomeQualityBar[];
        status_filter?: string;
        status_options?: string[];
        average_count?: number;
        legend?: string[];
      };
      create_task_href?: string;
      create_issue_href?: string;
    };
  };
};

export type TMFViewerScopeOption = {
  record_id: string;
  name: string;
};

export type TMFViewerTreeNode = {
  id: string;
  parent_id?: string;
  name: string;
  number?: string;
  document_count: number;
  has_children: boolean;
};

export type TMFViewerDocumentItem = {
  record_id: string;
  name: string;
  document_number?: string;
  classification?: string;
  status_label?: string;
  document_date?: string;
  filing_level?: string;
  record_detail_href: string;
};

export type BinderTreeNode = {
  id: string;
  parent_id?: string;
  kind: "section" | "document" | string;
  name: string;
  number?: string;
  document_id?: string;
  filing_origin?: string;
  document_count: number;
  has_children: boolean;
  is_custom?: boolean;
  is_deprecated?: boolean;
  record_detail_href?: string;
};

export type BinderDocumentItem = {
  node_id: string;
  record_id: string;
  name: string;
  document_number?: string;
  status_label?: string;
  filing_origin?: string;
  binding_mode?: string;
  bound_version_id?: string;
  bound_version_label?: string;
  is_bound?: boolean;
  /** Section that directly owns this link (may differ from selected parent). */
  section_id?: string;
  record_detail_href: string;
};

export type BinderTreeModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").BinderChrome;
  binder_id?: string;
  binder_name?: string;
  binder_detail_href?: string;
  binders?: Array<{ record_id: string; name: string; record_detail_href: string }>;
  readonly: boolean;
  hide_empty_sections: boolean;
  filing_origin_filter: string;
  binding_filter?: string;
  selected_section_id?: string;
  tree: { nodes: BinderTreeNode[] };
  documents: BinderDocumentItem[];
  total_document_count: number;
  total_section_count?: number;
  refresh_autofiling_allowed: boolean;
  manual_edit_allowed?: boolean;
  context_defaults?: Record<string, string>;
  create_document_allowed?: boolean;
  manage_sections_allowed?: boolean;
};

export type TMFViewerModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").TMFViewerChrome;
  study_id?: string;
  study_country_id?: string;
  site_id?: string;
  model_id?: string;
  artifact_id?: string;
  studies: TMFViewerScopeOption[];
  study_countries: TMFViewerScopeOption[];
  study_sites: TMFViewerScopeOption[];
  view_models: TMFViewerScopeOption[];
  tree: {
    nodes: TMFViewerTreeNode[];
  };
  documents: TMFViewerDocumentItem[];
  total_document_count: number;
  expand_all_allowed: boolean;
};

export type MilestoneWorkspaceFilterOption = {
  value: string;
  label: string;
};

export type MilestoneWorkspaceDocumentTypeNode = {
  value: string;
  label: string;
  subtypes?: MilestoneWorkspaceFilterOption[];
};

export type MilestoneWorkspaceIcon = {
  name: string;
  color?: string;
  title?: string;
};

export type MilestoneWorkspaceItem = {
  record_id: string;
  name: string;
  completeness_icon?: MilestoneWorkspaceIcon;
  completeness_api_name?: string;
  completeness_label?: string;
  level?: string;
  document_type_id?: string;
  document_type?: string;
  document_subtype_id?: string;
  document_subtype?: string;
  document_classification?: string;
  requiredness_api_name?: string;
  requiredness_label?: string;
  expected_count: number;
  steady_state_doc_count: number;
  all_doc_count: number;
  study_id?: string;
  study_name?: string;
  department_api_name?: string;
  department_label?: string;
  record_detail_href: string;
};

export type MilestoneWorkspaceModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  chrome: import("../lib/i18n/chromeTypes").MilestoneWorkspaceChrome;
  milestone: {
    record_id: string;
    name: string;
    state_api_name?: string;
    state_label?: string;
    study_id?: string;
    study_name?: string;
    study_country_id?: string;
    study_country_name?: string;
    site_id?: string;
    site_name?: string;
    scope_label?: string;
    record_detail_href: string;
  };
  filters: {
    departments: MilestoneWorkspaceFilterOption[];
    completeness: MilestoneWorkspaceFilterOption[];
    requiredness: MilestoneWorkspaceFilterOption[];
    document_types: MilestoneWorkspaceDocumentTypeNode[];
  };
  items: MilestoneWorkspaceItem[];
  total_count: number;
  linked_count: number;
};

export type BusinessAdminObjectOption = {
  api_name: string;
  label: DisplayText;
  label_plural: DisplayText;
  namespace: string;
  source: "standard" | "system" | "custom" | "application";
  route: string;
};

export type BusinessAdminObjectsSelectorModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  objects: BusinessAdminObjectOption[];
  chrome: {
    title: DisplayText;
    description: DisplayText;
    empty_state: DisplayText;
    search_label: DisplayText;
    object_label_column: DisplayText;
    object_name_column: DisplayText;
    source_column: DisplayText;
    recently_used_title: DisplayText;
    favorites_title: DisplayText;
    favorites_empty: DisplayText;
    source_standard: DisplayText;
    source_system: DisplayText;
    source_custom: DisplayText;
    source_application: DisplayText;
    add_favorite_aria: DisplayText;
    remove_favorite_aria: DisplayText;
    previous_page_aria: DisplayText;
    next_page_aria: DisplayText;
    load_failed: DisplayText;
  };
};

export type ViewOption = {
  id: string;
  label: DisplayText;
  kind: string;
  mandatory?: boolean;
  managed?: boolean;
  is_personal?: boolean;
  is_personal_default?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_copy?: boolean;
  can_set_personal_default?: boolean;
};

export type SavedViewDetail = {
  api_name: string;
  label: string;
  status: string;
  mandatory: boolean;
  managed: boolean;
  is_personal: boolean;
  is_personal_default: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_copy: boolean;
  vql_search_criteria?: string;
  search_criteria?: string;
  view_layout_api_name?: string;
  owner_label?: string;
};

export type SavedViewListModel = {
  model_type: string;
  tab_api_name: string;
  personal_default_view?: string;
  views: SavedViewDetail[];
  management_allowed: boolean;
  can_create: boolean;
};

export type SavedViewManagement = {
  allowed: boolean;
  personal_default_view?: string;
  can_create?: boolean;
};

export type ListColumn = {
  field_api_name: string;
  label: DisplayText;
  field_type?: string;
  target_object_api_name?: string;
  sortable?: boolean;
  filterable?: boolean;
  facetable?: boolean;
  frozen?: boolean;
  support_state?: FieldRenderSupportState;
  field_render?: FieldRenderModel;
};

export type ListGridPreferences = {
  visible_columns?: string[];
  column_order?: string[];
  freeze_column?: string;
  cell_text_mode?: "truncate" | "wrap";
  display_filter_fields?: string[];
  column_widths?: Record<string, number>;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
};

export type ListRecordRow = {
  record_id: string;
  favorited?: boolean;
  fields: Record<string, unknown>;
  reference_cells?: Record<string, ReferenceCell>;
  actions?: RelatedRowActions;
};

export type ObjectTypeOption = {
  api_name: string;
  label: DisplayText;
};

export type ListRoute = {
  pagelink_api_name: string;
  page_api_name: string;
  mode: string;
  disable_type_select?: boolean;
};

export type ListRouting = {
  view?: ListRoute;
  create?: ListRoute;
};

export type ObjectListModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  tab_api_name: string;
  tab_label: DisplayText;
  object_api_name: string;
  object_type_api_name?: string;
  object_type_allow_set?: string[];
  selected_view: string;
  views: ViewOption[];
  columns: ListColumn[];
  record_link_field?: string;
  available_columns?: ListColumn[];
  default_columns?: ListColumn[];
  facet_filter_columns?: ListColumn[];
  filter_editor_columns?: ListColumn[];
  display_facet_filter_columns?: ListColumn[];
  default_display_filter_fields?: string[];
  grid_preferences?: ListGridPreferences;
  edit_columns_allowed?: boolean;
  edit_filters_allowed?: boolean;
  list_layout_api_name?: string;
  records: ListRecordRow[];
  list_controls?: {
    sort_by?: string;
    sort_dir?: "asc" | "desc";
    filter?: string;
    filter_field?: string;
    facet_filters?: Record<string, string[] | { op?: string; values?: string[]; preset?: string }>;
    sort_fallback_applied?: boolean;
    search_allowed?: boolean;
  };
  pagination: {
    page_size: number;
    size: number;
    total: number;
    page_token?: string;
    next_page_token?: string;
    has_previous?: boolean;
  };
  actions: {
    allowed: boolean;
    requires_type_selection?: boolean;
    object_types?: ObjectTypeOption[];
    default_object_type?: string;
    object_label?: DisplayText;
  };
  list_routing?: ListRouting;
  list_state?: {
    kind: "ok" | "empty" | "unauthorized" | "config_error";
    code?: string;
  };
  list_context_fingerprint?: string;
  saved_view_management?: SavedViewManagement;
  chrome: import("../lib/i18n/chromeTypes").ListChrome;
  schema_fingerprint: string;
  ui_fingerprint: string;
  row_actions_allowed?: boolean;
};

export type LayoutRef = {
  api_name: string;
  label: DisplayText;
  virtual?: boolean;
};

export type ShowInTabAction = {
  tab_api_name: string;
  filter_field: string;
  filter_value: string;
};

export type RelatedSectionCommands = {
  add_existing_allowed: boolean;
  unlink_allowed: boolean;
  bulk_unlink_allowed?: boolean;
  show_in_tab?: ShowInTabAction;
};

export type RelatedSectionSelectionCommands = {
  enabled: boolean;
  max_size: number;
};

export type RelatedSectionBulkFailureRow = {
  record_id: string;
  error: string;
};

export type RelatedSectionBulkResult = {
  section: RelatedSectionModel;
  success_count: number;
  failure_count: number;
  failure_rows?: RelatedSectionBulkFailureRow[];
};

export type RelatedSectionSelectionResult = {
  model_type: string;
  record_ids: string[];
  total?: number;
  truncated?: boolean;
};

export type FacetValue = {
  value: string;
  label?: DisplayText;
  count: number;
};

export type FacetFieldResult = {
  field_api_name: string;
  values: FacetValue[];
};

export type ObjectListFacetModel = {
  model_type: string;
  vault_id: string;
  tab_api_name: string;
  object_api_name: string;
  selected_view: string;
  facet_filters?: Record<string, string[] | { op?: string; values?: string[]; preset?: string }>;
  fields: FacetFieldResult[];
  chrome?: import("../lib/i18n/chromeTypes").ListChrome;
};

export type RelatedRowActionGuard = {
  schema_fingerprint: string;
  ui_fingerprint: string;
  record_version: number;
};

export type RelatedRowActions = {
  unlink_allowed?: boolean;
  target_object_api_name?: string;
  target_record_id?: string;
  edit_record_allowed?: boolean;
  delete_record_allowed?: boolean;
  lifecycle_actions?: LifecycleAction[];
  sdk_actions?: SdkAction[];
  action_guard?: RelatedRowActionGuard;
};

export type RecordRowActionsModel = {
  model_type: string;
  actions: RelatedRowActions;
};

export type RelatedSectionDescriptor = {
  section_context_token: string;
  target_object_api_name: string;
  link_field_api_name: string;
  remote_object_api_name?: string;
  columns: ListColumn[];
  prevent_record_create: boolean;
  modal_create_record: boolean;
  create_allowed: boolean;
  display_as_simple?: boolean;
  section_commands?: RelatedSectionCommands;
  /** Embedded by BuildPage so collapsed nav badges skip count_only prefetch. */
  row_count?: number;
};

export type PageShellDescriptor = {
  page_api_name?: string;
  kind: "default" | "document_split" | string;
  mode?: string;
};

export type DocumentExternalSource = {
  provider?: string;
  file_token?: string;
  file_type?: string;
  url?: string;
  title?: string;
  imported_by?: string;
  imported_at?: string;
  profile_id?: string;
};

export type DocumentViewerSource = {
  file_name: string;
  media_type: string;
  byte_length: number;
  external_source?: DocumentExternalSource;
};

/** Progressive video/audio playback (Veeva-aligned CDN cookie or presign fallback). */
export type DocumentMediaPlayback = {
  kind: "video" | "audio";
  delivery: "cdn" | "presign";
  mode?: string;
  url: string;
  expires_at?: string;
  media_type: string;
  with_credentials?: boolean;
  signed_cookies?: boolean;
  from_media_rendition?: boolean;
  /** Cover image before playback (server-generated when available). */
  poster_url?: string;
};

export type DocumentMediaRendition = {
  status: string;
  error_message?: string;
  media_type?: string;
  byte_length?: number;
};

export type DocumentViewerRendition = {
  status: string;
  error_message?: string;
  page_count?: number;
};

export type DocumentViewerCheckout = {
  locked: boolean;
  locked_by_me?: boolean;
  locked_by?: string;
};

export type FeishuImportAvailability = {
  enabled: boolean;
  authorized: boolean;
  profile_id?: string;
  profile_name?: string;
  client_id?: string;
  open_id?: string;
  reason?: string;
};

export type FeishuBrowsableItem = {
  kind: "folder" | "file";
  file_token: string;
  title: string;
  file_type?: string;
  url?: string;
};

export type DocumentViewerState = {
  version_record_id: string;
  document_number?: string;
  major_version_number?: number;
  minor_version_number?: number;
  can_view_content?: boolean;
  can_upload_source?: boolean;
  feishu_import?: FeishuImportAvailability;
  source?: DocumentViewerSource | null;
  rendition?: DocumentViewerRendition;
  media_rendition?: DocumentMediaRendition | null;
  media_playback?: DocumentMediaPlayback | null;
  checkout?: DocumentViewerCheckout;
};

export type DocumentSourceUploadResult = {
  version_record_id: string;
  file_name: string;
  media_type: string;
  byte_length: number;
  content_sha256: string;
  bumped?: boolean;
  major_version_number?: number;
  minor_version_number?: number;
};

export type PagelinkDescriptor = {
  api_name: string;
  label: DisplayText;
  mode: string;
  route_path: string;
  disable_type_select?: boolean;
};

export type FieldRenderSupportState = "supported" | "readonly_only" | "unsupported";

export type PicklistEntryOption = {
  name: string;
  label: string;
  order?: number;
  inactive?: boolean;
  selectable?: boolean;
};

export type NavigationTarget = {
  kind: string;
  target_object_ref: string;
  target_record_id: string;
  route_ref: string;
};

export type ReferenceCell = {
  display_value?: unknown;
  navigation_target?: NavigationTarget | null;
  hover_card?: HoverCardModel;
};

export type HoverCardDependency = {
  name: string;
  record_id?: string;
  planned_finish_date?: string;
  actual_finish_date?: string;
};

export type HoverCardDocument = {
  name: string;
  version?: string;
  status?: string;
  record_id?: string;
};

export type HoverCardTaskStats = {
  total: number;
  required: number;
  complete: number;
  complete_required: number;
};

export type HoverCardDocumentTotals = {
  expected: number;
  actual: number;
  approved: number;
};

export type HoverCardModel = {
  milestone_name?: string;
  milestone_record_id?: string;
  percent_complete?: string;
  percent_value?: number;
  dependencies?: HoverCardDependency[];
  document_totals?: HoverCardDocumentTotals;
  documents?: HoverCardDocument[];
  task_stats?: HoverCardTaskStats;
  /** When true, fetch hover details on icon hover instead of using a precomputed payload. */
  lazy?: boolean;
};

/** @deprecated Legacy section shape; no longer emitted by the API. */
export type HoverCardSection = {
  label: string;
  kind?: "pair" | "document_totals";
  completed?: number;
  total?: number;
  expected?: number;
  actual?: number;
  approved?: number;
};

export type FieldRenderModel = {
  field_ref: {
    object_api_name?: string;
    field_api_name: string;
  };
  field_type: string;
  subtype?: string;
  renderer_kind: string;
  support_state: FieldRenderSupportState;
  display_value?: unknown;
  input_value?: unknown;
  navigation_target?: NavigationTarget | null;
  visibility: "visible" | "hidden";
  editability: "editable" | "readonly" | "hidden";
  requiredness: "required" | "optional";
  required_satisfaction:
    | "satisfied"
    | "needs_user_input"
    | "provided_by_default"
    | "provided_by_record"
    | "blocked";
  source_constraints?: Array<{ kind: string; message?: string }>;
  validation_message?: string[];
  /** Neutral guidance hints (e.g. cascading "select parent first"); never an error. */
  hint?: string[];
  diagnostic_ref?: { issue_code?: string; message?: string };
  target_object_api_name?: string;
  max_length?: number;
  scale?: number;
  picklist_options?: PicklistEntryOption[];
  picklist_options_catalog?: PicklistEntryOption[];
  controlling_field_api_name?: string;
  picklist_dependencies?: Record<string, string[]>;
  relationship_criteria?: string;
  /** Veeva create_object_inline — show "+ Create {Object}" on the reference picker. */
  create_object_inline?: boolean;
  /** Localized target object label for "+ Create {object}" when create_object_inline. */
  target_object_label?: DisplayText;
  reference_options?: PicklistEntryOption[];
  multi_value?: boolean;
  base_field_role?:
    | "record_identity"
    | "primary_display"
    | "object_type"
    | "lifecycle_state"
    | "record_status"
    | "audit_stamp"
    | "system_integration"
    | "business_field";
  default_visibility_source?:
    | "system_default"
    | "explicit_layout"
    | "explicit_list"
    | "default_layout_auto_created";
  icon?: {
    name: string;
    color?: string;
    title?: string;
  };
  image?: {
    url?: string;
    alt?: string;
  };
  hover_card?: HoverCardModel;
};

export type PageElement = {
  kind: string;
  field_api_name?: string;
  field_type?: string;
  label?: DisplayText;
  value?: unknown;
  read_only?: boolean;
  required?: boolean;
  name?: string;
  relationship_ref?: string;
  layout_element_id?: string;
  related?: RelatedSectionDescriptor;
  pagelink?: PagelinkDescriptor;
  target_object_api_name?: string;
  support_state?: FieldRenderSupportState;
  field_render?: FieldRenderModel;
  domain_user?: DomainUserElement;
};

export type PageSection = {
  name?: string;
  label: DisplayText;
  help_content?: string;
  form_columns?: number;
  elements?: PageElement[] | null;
};

export type ChangeTypeOption = {
  api_name: string;
  label: DisplayText;
};

export type ChangeTypeLabels = {
  action: DisplayText;
  title: DisplayText;
  message: DisplayText;
  confirm: DisplayText;
  cancel: DisplayText;
  warning_message: DisplayText;
  warning_confirm: DisplayText;
};

export type ChangeTypeLostField = {
  api_name: string;
  label: DisplayText;
};

export type ChangeTypeWarning = {
  required: boolean;
  title: DisplayText;
  message: DisplayText;
  warning_confirm: DisplayText;
  confirm: DisplayText;
  cancel: DisplayText;
  fields?: ChangeTypeLostField[];
};

export type ChangeTypeAction = {
  allowed: boolean;
  options?: ChangeTypeOption[];
  labels: ChangeTypeLabels;
};

export type ActionPlacement = "primary" | "secondary" | "overflow";

export type WorkflowStartDialogControl = {
  type: "instructions" | "field" | "participant" | "date" | string;
  control_name?: string;
  label?: string;
  instructions?: string;
  field_api_name?: string;
  required?: boolean;
  participant_name?: string;
  participant_strategy?: string;
  constrain_role_api_names?: string[];
  exclude_role_api_names?: string[];
  constrain_roles_not_allowed_api_names?: string[];
  assignment_mode_label?: string;
  default_user_ids?: string[];
  set_workflow_due_date?: boolean;
  field_element?: FormElement;
};

export type WorkflowStartDialog = {
  label?: string;
  controls?: WorkflowStartDialogControl[];
};

export type PreExecutionInputValue = {
  key: string;
  label: string;
};

export type PreExecutionInput = {
  key: string;
  label: string;
  type: string;
  possible_values?: PreExecutionInputValue[];
};

export type UserInputRecordInformation = {
  object_api_name?: string;
  object_type_api_name?: string;
};

export type PreExecutionDialogModel = {
  model_type: "pre_execution_dialog";
  message?: string;
  title?: string | null;
  continue_label?: string;
  cancel_label?: string;
  inputs?: PreExecutionInput[];
  resolved_inputs?: Record<string, string>;
  user_input_record_information?: UserInputRecordInformation | null;
};

export type LifecycleAction = {
  name: string;
  label: DisplayText;
  order?: number;
  kind?: "start_workflow" | "change_state" | "object_action" | "application_action";
  display_in_all_actions_menu?: boolean;
  placement?: ActionPlacement;
  workflow_start_dialog?: WorkflowStartDialog;
};

export type WorkflowVerdictOption = {
  name: string;
  label: string;
  display_label?: string;
  signature_required?: boolean;
  signature_type?: string;
  capacities?: { name: string; label: string }[];
  capacities_label?: string;
  capacities_required?: boolean;
  comment_required?: boolean;
  comment_label?: string;
  field_api_name?: string;
  field_label?: string;
  field_required?: boolean;
};

export type WorkflowTaskCommentPrompt = {
  name: string;
  label: string;
  required?: boolean;
};

export type WorkflowTaskFieldPrompt = {
  name: string;
  reference: string;
  field_api_name: string;
  field_label?: string;
  required?: boolean;
};

export type WorkflowTaskCompletionDraft = {
  verdict_label?: string;
  comment?: string;
  fields?: Record<string, string>;
};

export type WorkflowTaskAction = {
  workflow_instance_id: string;
  workflow_task_id?: string;
  workflow_api_name: string;
  workflow_label: string;
  task_api_name?: string;
  task_label?: string;
  task_instructions?: string;
  status: string;
  due_date?: string;
  due_date_status?: "overdue" | "coming_soon" | "on_track" | "";
  signature_required?: boolean;
  signature_type?: string;
  verdict_label?: string;
  verdict_options?: WorkflowVerdictOption[];
  task_comments?: WorkflowTaskCommentPrompt[];
  task_fields?: WorkflowTaskFieldPrompt[];
  completion_draft?: WorkflowTaskCompletionDraft;
  can_complete?: boolean;
  can_claim?: boolean;
  can_unclaim?: boolean;
  can_cancel?: boolean;
};

export type WorkflowTimelineUser = {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
};

export type WorkflowTimelineInstanceActions = {
  can_cancel_workflow?: boolean;
  can_add_participants?: boolean;
  can_replace_owner?: boolean;
  can_email_participants?: boolean;
  can_update_workflow_due_date?: boolean;
  can_view_participants?: boolean;
};

export type WorkflowTimelineTaskActions = {
  can_reassign?: boolean;
  can_cancel_task?: boolean;
  can_update_task_due_date?: boolean;
  can_complete?: boolean;
};

export type WorkflowTimelineTask = {
  workflow_task_id: string;
  task_api_name: string;
  task_label: string;
  status: string;
  assignee?: WorkflowTimelineUser;
  available_assignees?: WorkflowTimelineUser[];
  verdict_label?: string;
  completion_comment?: string;
  signature_required?: boolean;
  created_at: string;
  completed_at?: string;
  due_date?: string;
  due_date_status?: "overdue" | "coming_soon" | "on_track" | "";
  actions: WorkflowTimelineTaskActions;
};

export type WorkflowTimelineInstance = {
  workflow_instance_id: string;
  workflow_api_name: string;
  workflow_label: string;
  status: string;
  owner: WorkflowTimelineUser;
  initiator: WorkflowTimelineUser;
  started_at: string;
  finished_at?: string;
  cancellation_comment?: string;
  active_task_count: number;
  completed_task_count: number;
  total_task_count: number;
	due_date?: string;
  definition_version?: number;
  tasks: WorkflowTimelineTask[];
  actions: WorkflowTimelineInstanceActions;
};

export type WorkflowTimelineStateChange = {
  occurred_at: string;
  source_state_name?: string;
  source_state_label?: string;
  target_state_name: string;
  target_state_label?: string;
  trigger_kind?: string;
  trigger_ref?: string;
  action_label?: string;
};

export type WorkflowTimelineModel = {
  instances: WorkflowTimelineInstance[];
  state_changes?: WorkflowTimelineStateChange[];
  tasks_truncated?: boolean;
};

export type ActionGuard = {
  schema_fingerprint: string;
  ui_fingerprint: string;
  record_version: number;
};

export type SdkAction = {
  name: string;
  label: DisplayText;
  order?: number;
  placement?: ActionPlacement;
};

export type ActionExecutionResult = {
  model_type: string;
  status: string;
  refresh_policy: string;
  lifecycle?: {
    page: RecordPageModel;
    record_version: number;
    source_state_name?: string;
    target_state_name?: string;
  };
  sdk?: {
    page: RecordPageModel;
    record_version: number;
    message?: string;
  };
  change_type?: {
    page: RecordPageModel;
    record_version: number;
  };
  workflow_signature?: WorkflowSignatureChallenge;
  workflow_complete?: {
    page: RecordPageModel;
    workflow_task_id: string;
  };
  workflow_claim?: {
    page: RecordPageModel;
    workflow_task_id: string;
  };
  workflow_unclaim?: {
    page: RecordPageModel;
    workflow_task_id: string;
  };
  workflow_cancel?: {
    page: RecordPageModel;
    record_version: number;
  };
  workflow_task_admin?: {
    page: RecordPageModel;
    record_version: number;
    workflow_task_id: string;
    workflow_instance_id: string;
  };
  workflow_instance_admin?: {
    page: RecordPageModel;
    record_version: number;
    workflow_instance_id: string;
  };
};

export type WorkflowParticipantsModel = {
  model_type: string;
  workflow_instance_id: string;
  groups: Array<{
    group_name: string;
    group_label?: string;
    participant_type: string;
    members: Array<{ user_id: string; display_name?: string; added_at?: string }>;
    related_tasks?: Array<{
      task_api_name: string;
      task_label: string;
      status: "active" | "completed" | "potential" | string;
      workflow_task_id?: string;
    }>;
    related_summary?: {
      active: number;
      completed: number;
      potential: number;
    };
  }>;
  participant_controls?: WorkflowStartDialogControl[];
};

export type WorkflowSignatureChallenge = {
  challenge_id: string;
  signature_meaning: string;
  verdict_label: string;
  task_name: string;
  workflow_name: string;
  expires_at: string;
};

export type LifecycleChevron = {
  visible: boolean;
  current_state?: string;
  stages?: Array<{
    api_name: string;
    label: DisplayText;
    current?: boolean;
  }>;
};

export type SummaryField = {
  field_api_name: string;
  label: DisplayText;
  field_type?: string;
  target_object_api_name?: string;
  value?: unknown;
  support_state?: FieldRenderSupportState;
  field_render?: FieldRenderModel;
};

export type SummaryInfoModel = {
  fields: SummaryField[];
};

export type RecordPageModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  object_api_name: string;
  object_class?: string;
  object_label: DisplayText;
  object_type_api_name?: string;
  record_id: string;
  record_name?: string;
  record_version: number;
  state_api_name?: string;
  state_label?: DisplayText;
  selected_layout: LayoutRef;
  layout_options: Array<LayoutRef & { default_layout?: boolean }>;
  sections: PageSection[];
  lifecycle_actions?: LifecycleAction[];
  sdk_actions?: SdkAction[];
  workflow_tasks?: WorkflowTaskAction[];
  workflow_timeline?: WorkflowTimelineModel;
  actions: {
    edit_allowed: boolean;
    delete_allowed: boolean;
    copy_allowed?: boolean;
    favorite_allowed?: boolean;
    favorited?: boolean;
    change_type?: ChangeTypeAction;
    labels: import("../lib/i18n/chromeTypes").PageActionLabels;
  };
  messages: import("../lib/i18n/chromeTypes").PageMessages;
  workflow: import("../lib/i18n/chromeTypes").WorkflowChrome;
  audit: {
    visible: boolean;
    export_allowed?: boolean;
  };
  sharing: {
    visible: boolean;
    edit_allowed?: boolean;
  };
  schema_fingerprint: string;
  ui_fingerprint: string;
  preview_mode?: boolean;
  lifecycle_chevron?: LifecycleChevron;
  summary_info?: SummaryInfoModel;
  page_shell?: PageShellDescriptor;
  document_header?: DocumentHeaderModel;
};

export type DocumentHeaderCheckout = {
  locked: boolean;
  locked_by_me?: boolean;
  locked_by?: string;
};

export type DocumentHeaderModel = {
  major_version_number: number;
  minor_version_number: number;
  checkout?: DocumentHeaderCheckout;
};

export type DomainUserElement = {
  domain_id: string;
  help_text?: DisplayText;
  read_only?: boolean;
  user_id?: string;
  username?: string;
  email?: string;
  display_name?: string;
};

export type DomainUserOption = {
  user_id: string;
  username: string;
  label: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  display_name?: string;
};

export type DomainUserOptionsModel = {
  model_type: string;
  options: DomainUserOption[];
  has_more: boolean;
};

export type FormElement = {
  kind: string;
  name?: string;
  field_api_name?: string;
  field_type?: string;
  label?: DisplayText;
  read_only?: boolean;
  required?: boolean;
  hidden?: boolean;
  max_length?: number;
  picklist_options?: PicklistEntryOption[];
  reference_options?: PicklistEntryOption[];
  target_object_api_name?: string;
  relationship_ref?: string;
  layout_element_id?: string;
  related?: RelatedSectionDescriptor;
  support_state?: FieldRenderSupportState;
  field_render?: FieldRenderModel;
  domain_user?: DomainUserElement;
  pagelink?: PagelinkDescriptor;
};

export type FormSection = {
  name?: string;
  label: DisplayText;
  hidden?: boolean;
  form_columns?: number;
  elements: FormElement[];
};

export type FormGuard = {
  schema_fingerprint: string;
  ui_fingerprint: string;
  selected_layout_api_name?: string;
  record_version?: number;
};

export type LayoutRuleEffects = {
  hidden_fields: string[];
  hidden_sections: string[];
  required_fields: string[];
  readonly_fields: string[];
};

export type LookupDisplayEffects = {
  displays: Record<string, unknown>;
};

export type RecordFormModel = {
  model_type: string;
  mode: string;
  display_context: DisplayContext;
  copy_from_record_id?: string;
  vault_id: string;
  object_api_name: string;
  object_class?: string;
  object_label?: DisplayText;
  object_type_api_name?: string;
  object_type_label?: DisplayText;
  record_id?: string;
  record_version?: number;
  selected_layout: LayoutRef;
  sections: FormSection[];
  values?: Record<string, unknown>;
  form_guard: FormGuard;
  form_context_token?: string;
  schema_fingerprint: string;
  ui_fingerprint: string;
  layout_rules?: unknown[];
  l10n?: {
    locale_references_by_language?: Record<string, PicklistEntryOption[]>;
  };
  document?: {
    type_options?: PicklistEntryOption[];
    subtype_options_by_type?: Record<string, PicklistEntryOption[]>;
    classification_options_by_subtype?: Record<string, PicklistEntryOption[]>;
  };
  chrome: import("../lib/i18n/chromeTypes").FormChrome;
  submit_blocked?: boolean;
  submit_block_reason?: string;
  page_shell?: PageShellDescriptor;
  disable_type_select?: boolean;
};

export type RelatedSectionListControls = {
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  sort_fallback_applied?: boolean;
  filter?: string;
  search_server_side?: boolean;
};

export type RelatedSectionModel = {
  model_type: string;
  display_context: DisplayContext;
  target_object_api_name: string;
  link_field_api_name: string;
  remote_object_api_name?: string;
  columns: ListColumn[];
  available_columns?: ListColumn[];
  default_columns?: ListColumn[];
  grid_preferences?: ListGridPreferences;
  edit_columns_allowed?: boolean;
  rows: Array<ListRecordRow & { actions?: RelatedRowActions }>;
  total?: number;
  prevent_record_create: boolean;
  modal_create_record: boolean;
  create_allowed: boolean;
  create_defaults?: Record<string, unknown>;
  next_page_token?: string;
  list_controls?: RelatedSectionListControls;
  selection_commands?: RelatedSectionSelectionCommands;
  section_commands?: RelatedSectionCommands;
  display_as_simple?: boolean;
  row_actions_allowed?: boolean;
  row_record_actions_allowed?: boolean;
  record_link_field?: string;
  chrome: import("../lib/i18n/chromeTypes").RelatedChrome;
};

export type RelatedSectionCandidateRow = ListRecordRow;

export type RelatedSectionCandidatesResult = {
  model_type: string;
  display_context?: DisplayContext;
  columns?: ListColumn[];
  remote_object_api_name?: string;
  remote_object_label?: DisplayText;
  record_link_field?: string;
  filterable_fields?: Array<{
    field_api_name: string;
    label: DisplayText;
    field_type?: string;
    picklist_name?: string;
    options?: Array<{ value: string; label: DisplayText }>;
  }>;
  rows: RelatedSectionCandidateRow[];
  total?: number;
  page_size?: number;
  page_offset?: number;
};

export type RelatedSectionMutationResult = {
  section: RelatedSectionModel;
};

export type RelatedSectionCreateResult = {
  record_id: string;
  version: number;
  fields: Record<string, unknown>;
  section: RelatedSectionModel;
};

export type RelatedCreateFormModel = RecordFormModel & {
  section_context_token: string;
  parent_object_api_name?: string;
  parent_record_id?: string;
  parent_record_label?: DisplayText;
};

export type RelatedCreateAction = {
  allowed: boolean;
  requires_type_selection?: boolean;
  object_types?: ObjectTypeOption[];
  default_object_type?: string;
};

export type RelatedCreateOptions = {
  model_type: string;
  section_context_token: string;
  target_object_api_name: string;
  target_object_label?: DisplayText;
  modal_create_record: boolean;
  create_action: RelatedCreateAction;
  return_object_api_name: string;
  return_record_id: string;
};

export type SubmitResult = {
  record_id: string;
  version: number;
  fields: Record<string, unknown>;
  refresh_page: boolean;
};

export type AuditColumn = {
  key: string;
  label: string;
};

export type SharingPanelColumn = {
  key: string;
  label: string;
};

export type SharingPanelRow = {
  id: string;
  member_kind: string;
  member_name: string;
  role_name: string;
  role_label: string;
  access: string;
  access_key: string;
  sharing_rule_id?: string;
  sharing_rule_name?: string;
  display_rule: boolean;
  read_only: boolean;
};

export type SharingPanelModel = {
  model_type: string;
  vault_id: string;
  object_api_name: string;
  record_id: string;
  columns: SharingPanelColumn[];
  rows: SharingPanelRow[];
  pagination: {
    total: number;
    page_start: number;
    page_end: number;
    page_size: number;
  };
  filters: {
    roles: Array<{ value: string; label: string }>;
    members: Array<{ value: string; label: string }>;
  };
  actions: {
    add_allowed: boolean;
    remove_allowed: boolean;
    read_only?: boolean;
  };
  chrome?: import("../lib/i18n/chromeTypes").SharingChrome;
};

export type SharingMemberOption = {
  member_kind: string;
  member_id: string;
  label: string;
  /** user__sys.username__sys when member_kind is user (often an email). */
  username?: string;
};

export type SharingMemberOptionsModel = {
  model_type: string;
  options: SharingMemberOption[];
};

export type SharingGrantAddedModel = {
  model_type: string;
  row: SharingPanelRow;
};

export type SharingGrantRemovedModel = {
  model_type: string;
  grant_id: string;
};

export type AuditPanelModel = {
  model_type: string;
  panel_kind: string;
  vault_id?: string;
  numeric_vault_id?: string;
  domain_id?: string;
  object_api_name?: string;
  record_id?: string;
  columns: AuditColumn[];
  object_rows?: Array<Record<string, unknown>>;
  login_rows?: Array<Record<string, unknown>>;
  system_rows?: Array<Record<string, unknown>>;
  domain_rows?: Array<Record<string, unknown>>;
  pagination: { next_page_token?: string };
  actions: { export_allowed: boolean };
  chrome?: import("../lib/i18n/chromeTypes").AuditChrome;
};

export type UsersGroupsPanelModel = {
  model_type: string;
  view_kind: string;
  vault_id: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<{ cells: Record<string, string> }>;
  pagination: {
    page_size: number;
    size: number;
    page_token?: string;
    next_page_token?: string;
    has_previous: boolean;
  };
  actions: {
    export_allowed: boolean;
    create_allowed: boolean;
    edit_allowed: boolean;
  };
  empty_message?: string;
};

export type DomainUserVaultMembership = {
  vault_id: string;
  vault_name: string;
  license_type: string;
  security_profile: string;
  status: string;
};

export type DomainUserDetailModel = {
  model_type: string;
  vault_id: string;
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  home_domain_id: string;
  domain_status: string;
  domain_active: boolean;
  domain_admin: boolean;
  cross_domain: boolean;
  can_change_domain_status: boolean;
  vault_memberships: DomainUserVaultMembership[];
};

export type UsersGroupsFormOption = { value: string; label: string };

export type UsersGroupsVaultUserSaveBody = {
  username?: string;
  security_profile_api_name: string;
  license_type?: string;
  active?: boolean;
  first_name?: string;
  last_name?: string;
};

/**
 * Body for PUT /api/v1/vault-users/{userID}/profile. Edits the Domain identity
 * fields on a Domain User. `language`/`locale` are admin-key codes (e.g. "en",
 * "en_US") and `timezone` is a picklist code (e.g. "UTC"); the username is
 * immutable and therefore not part of the payload.
 */
export type VaultUserProfileInput = {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  language: string;
  locale: string;
  timezone: string;
  product_announcement_emails: boolean;
  service_availability_notifications: boolean;
};

export type UsersGroupsGroupSaveBody = {
  api_name?: string;
  active?: boolean;
  member_ids?: string[];
};

export type UsersGroupsFormModel = {
  model_type: string;
  entity: "vault_user" | "group";
  mode: "create" | "edit";
  entity_id?: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required?: boolean;
    read_only?: boolean;
  }>;
  values: Record<string, string>;
  options: {
    security_profiles?: UsersGroupsFormOption[];
    license_types?: UsersGroupsFormOption[];
    vault_users?: UsersGroupsFormOption[];
  };
  actions: { save_allowed: boolean; delete_allowed: boolean };
};

export type ConfigIssue = {
  issue_id: string;
  severity: string;
  component_type: string;
  component_locator: string;
  issue_code: string;
  message: string;
  xml_path?: string;
  affected_route?: string;
};

export type ConfigDiagnosticsModel = {
  model_type: string;
  vault_id: string;
  projection: {
    status: string;
    last_projected_at?: string;
    last_error?: string;
  };
  issues: ConfigIssue[];
  pagination: { next_page_token?: string };
};

export type LayoutProfileSummary = {
  api_name: string;
  label: string;
  system_kind?: string;
};

export type LayoutProfileListModel = {
  model_type: string;
  vault_id: string;
  profiles: LayoutProfileSummary[];
};

export type LayoutProfileAssignmentModel = {
  model_type: string;
  vault_id: string;
  user_id: string;
  profile_api_name?: string;
  profile_label?: string;
  system_kind?: string;
  assigned_at?: string;
  assigned_by?: string;
};

export type AuditExportJobModel = {
  model_type: string;
  id: string;
  audit_type: string;
  status: string;
  row_count: number;
  error?: string;
  requested_at: string;
  finished_at?: string;
  expires_at: string;
  actions: { export_allowed: boolean };
};

export type EntryCriteriaViolation = {
  kind: string;
  related_object_label?: string;
  method?: string;
  target_state_label?: string;
  field_label?: string;
  constraint?: string;
};

export type ApiError = {
  error: string | { code?: string; message?: string };
  failed_rule?: string;
  target_state_label?: string;
  target_state_name?: string;
  violations?: EntryCriteriaViolation[];
};

export type UserProfileGeneralField = {
  name: string;
  label: string;
  value?: string;
  input_value?: unknown;
  read_only?: boolean;
  editable?: boolean;
  field_type?: string;
  support_state?: FieldRenderSupportState;
  target_object_api_name?: string;
  field_render?: FieldRenderModel;
};

export type UserProfileModel = {
  model_type: string;
  vault_id: string;
  display_context?: DisplayContext;
  sections?: {
    email_preferences?: boolean;
    mobile_app_registrations?: boolean;
    search_preferences?: boolean;
    delegate_access?: boolean;
  };
  profile: {
    name: string;
    first_name?: string;
    last_name?: string;
    alias?: string;
    email: string;
    username: string;
    title?: string;
    company?: string;
    office_phone?: string;
    mobile_phone?: string;
    fax?: string;
    location?: string;
    timezone?: string;
    language?: string;
    locale?: string;
    avatar_url?: string;
    avatar_media_id?: string;
  };
  general_fields?: UserProfileGeneralField[];
  l10n?: {
    locale_references_by_language?: Record<string, PicklistEntryOption[]>;
  };
  groups: { label: string }[];
  email_preferences: {
    rows: {
      key: string;
      label: string;
      mode?: "never" | "every_occurrence" | "summary";
      every_occurrence: boolean;
      summary: boolean;
      never?: boolean;
      supports_summary: boolean;
      read_only?: boolean;
    }[];
    summary_interval?: string;
    summary_interval_id?: string;
  };
  mobile_app_registrations?: {
    registrations: {
      app_label: string;
      device_label: string;
      enabled: boolean;
    }[];
  };
  search_preferences?: {
    preferred_language?: string;
  };
  delegate_access?: {
    enabled: boolean;
    delegations: { label: string }[];
  };
  capabilities: {
    can_change_password: boolean;
    can_edit_general_info: boolean;
    can_edit_email_preferences: boolean;
    can_edit_avatar?: boolean;
    email_preferences_available: boolean;
  };
  chrome?: {
    general_information_title?: DisplayText;
    email_preferences_title?: DisplayText;
    groups_title?: DisplayText;
    email_label?: DisplayText;
    username_label?: DisplayText;
    password_label?: DisplayText;
    change_password?: DisplayText;
    current_password_label?: DisplayText;
    new_password_label?: DisplayText;
    confirm_password_label?: DisplayText;
    password_changed_label?: DisplayText;
    confirm_label?: DisplayText;
    name_label?: DisplayText;
    first_name_label?: DisplayText;
    last_name_label?: DisplayText;
    alias_label?: DisplayText;
    title_label?: DisplayText;
    company_label?: DisplayText;
    office_phone_label?: DisplayText;
    mobile_phone_label?: DisplayText;
    fax_label?: DisplayText;
    location_label?: DisplayText;
    timezone_label?: DisplayText;
    language_label?: DisplayText;
    locale_label?: DisplayText;
    notification_column?: DisplayText;
    every_occurrence_column?: DisplayText;
    summary_column?: DisplayText;
    summary_interval_label?: DisplayText;
    email_preferences_help?: DisplayText;
    edit_label?: DisplayText;
    coming_soon?: DisplayText;
    load_failed?: DisplayText;
    no_groups?: DisplayText;
    mobile_app_registrations_title?: DisplayText;
    search_preferences_title?: DisplayText;
    delegate_access_title?: DisplayText;
    no_mobile_registrations?: DisplayText;
    no_search_preferences?: DisplayText;
    no_delegations?: DisplayText;
    preferred_language_label?: DisplayText;
    never_column?: DisplayText;
    save_label?: DisplayText;
    cancel_label?: DisplayText;
    saved_label?: DisplayText;
    avatar_dialog_title?: DisplayText;
    avatar_dialog_intro?: DisplayText;
    avatar_use_default_label?: DisplayText;
    avatar_upload_label?: DisplayText;
    avatar_choose_label?: DisplayText;
    avatar_upload_help_formats?: DisplayText;
    avatar_upload_help_resize?: DisplayText;
    ok_label?: DisplayText;
    avatar_no_file_selected?: DisplayText;
    avatar_unsupported_type?: DisplayText;
    avatar_too_large?: DisplayText;
  };
};

export type UserProfilePatch = {
  general_fields?: Record<string, string>;
  email_preferences?: {
    rows: { key: string; mode: "never" | "every_occurrence" | "summary" }[];
    summary_interval_id?: string;
  };
};

export type VqlRecordHit = {
  record_id: string;
  fields: Record<string, unknown>;
};

export type VqlQueryResult = {
  records: VqlRecordHit[];
  responseDetails?: {
    pagesize?: number;
    pageoffset?: number;
    size?: number;
    total?: number;
  };
  next_page_token?: string;
};

export type LanguageRegionSelectOption = {
  value: string;
  label: DisplayText;
};

export type LanguageRegionPageChrome = {
  settings_sidebar_title: DisplayText;
  settings_nav_aria: DisplayText;
  page_title: DisplayText;
  language_region_nav_label?: DisplayText;
  branding_nav_label?: DisplayText;
  multilingual_section_title: DisplayText;
  document_handling_label: DisplayText;
  labels_toggle_label: DisplayText;
  base_settings_section_title: DisplayText;
  base_language_label: DisplayText;
  base_locale_label: DisplayText;
  change_request_button: DisplayText;
  edit_button: DisplayText;
  cancel_button: DisplayText;
  save_button: DisplayText;
  timezone_section_title: DisplayText;
  vault_timezone_label: DisplayText;
  date_format_section_title: DisplayText;
  date_format_label: DisplayText;
  preview_label: DisplayText;
  default_value_suffix: DisplayText;
  select_items_to_translate_label: DisplayText;
  export_translation_file_label: DisplayText;
  import_translation_file_label: DisplayText;
  import_drop_hint: DisplayText;
  languages_section_title: DisplayText;
  reorder_button: DisplayText;
  reorder_hint: DisplayText;
  search_languages_placeholder: DisplayText;
  language_column: DisplayText;
  status_column: DisplayText;
  active_users_column: DisplayText;
  edit_language_button: DisplayText;
  bulk_translation_title: DisplayText;
  export_tab: DisplayText;
  import_tab: DisplayText;
  resource_categories_label: DisplayText;
  select_categories_placeholder: DisplayText;
  target_language_label: DisplayText;
  export_button: DisplayText;
  import_button: DisplayText;
  remove_file_button: DisplayText;
  clear_all_button: DisplayText;
  load_failed: DisplayText;
  settings_saved: DisplayText;
  language_order_updated: DisplayText;
  save_failed: DisplayText;
  export_select_warning: DisplayText;
  export_failed: DisplayText;
  import_upload_warning: DisplayText;
  import_completed: DisplayText;
  import_failed: DisplayText;
  duplicate_file_name: DisplayText;
  max_files_error: DisplayText;
  filter_all: DisplayText;
  filter_active: DisplayText;
  filter_inactive: DisplayText;
  status_active: DisplayText;
  status_inactive: DisplayText;
  edit_language_modal_title: DisplayText;
  deactivate_language_modal_title: DisplayText;
  deactivate_language_body: DisplayText;
  deactivate_confirm_checkbox: DisplayText;
  change_request_modal_title: DisplayText;
  import_success_rows: DisplayText;
  import_ignored_rows: DisplayText;
  import_error_rows: DisplayText;
  ok_button: DisplayText;
  cannot_deactivate_language: DisplayText;
  category_system_messages: DisplayText;
  category_field_labels: DisplayText;
};

export type LanguageRegionSettingsModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  can_edit: boolean;
  chrome: LanguageRegionPageChrome;
  multilingual: {
    document_handling: {
      value: boolean;
      disabled: boolean;
      disabled_reason?: DisplayText;
      info?: DisplayText;
    };
    labels: {
      value: boolean;
      disabled: boolean;
      disabled_reason?: DisplayText;
      info?: DisplayText;
    };
  };
  base: {
    base_language: { label: string; code: string };
    base_locale: { label: string; code: string };
    change_request_help?: DisplayText;
  };
  timezone: {
    current: string;
    options: LanguageRegionSelectOption[];
    help_text: DisplayText;
  };
  date_format: {
    current: string;
    options: LanguageRegionSelectOption[];
    help_text: DisplayText;
    preview_locale: string;
    preview_timezone: string;
  };
  languages: {
    rows: {
      code: string;
      name: string;
      status: string;
      active_users: number;
      is_english: boolean;
      is_base_language: boolean;
      can_deactivate: boolean;
      deactivate_blocked_reason?: DisplayText;
    }[];
  };
  bulk: {
    can_export: boolean;
    can_import: boolean;
    resource_categories: LanguageRegionSelectOption[];
    active_languages: LanguageRegionSelectOption[];
    max_files: number;
  };
};

export type LanguageRegionPatch = {
  vault_timezone?: string;
  date_format_profile?: string;
  enable_multilingual_labels?: boolean;
  language_order?: string[];
  language_code?: string;
  language_status?: "Active" | "Inactive";
};

export type LanguageRegionDeactivationPrep = {
  language: string;
  affected_users: number;
  requires_confirmation: boolean;
  blocked: boolean;
  blocked_reason?: DisplayText;
};

export type LanguageRegionImportResult = {
  success: number;
  ignored: number;
  error: number;
  unauthorized: number;
};

export type BrandingAssetSlot =
  | "document_primary_logo"
  | "document_secondary_logo"
  | "vault_email_banner"
  | "site_header_logo"
  | "site_email_banner";

export type BrandingAsset = {
  storage_key: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  updated_at: string;
};

export type BrandingSettings = {
  document_primary_logo: BrandingAsset;
  document_secondary_logo: BrandingAsset;
  vault_email_banner: BrandingAsset;
  site_header_logo: BrandingAsset;
  site_email_banner: BrandingAsset;
};

export type BrandingDefaults = {
  product_name: string;
  app_name: string;
  header_text: string;
  banner_text: string;
};

export type BrandingConstraints = {
  max_asset_size: number;
  content_types: string[];
};

export type BrandingPageChrome = {
  settings_sidebar_title: DisplayText;
  settings_nav_aria: DisplayText;
  page_title: DisplayText;
  language_region_nav_label: DisplayText;
  branding_nav_label: DisplayText;
  vault_section_title: DisplayText;
  site_user_section_title: DisplayText;
  document_logos_title: DisplayText;
  document_logos_note: DisplayText;
  email_banner_title: DisplayText;
  header_logo_title: DisplayText;
  vault_email_banner_note: DisplayText;
  site_header_logo_note: DisplayText;
  site_email_banner_note: DisplayText;
  primary_logo_label: DisplayText;
  secondary_logo_label: DisplayText;
  default_email_banner_label: DisplayText;
  default_logo_label: DisplayText;
  custom_banner_label: DisplayText;
  custom_logo_label: DisplayText;
  edit_button: DisplayText;
  save_button: DisplayText;
  cancel_button: DisplayText;
  choose_button: DisplayText;
  load_failed: DisplayText;
  upload_success: DisplayText;
  save_success: DisplayText;
  upload_failed: DisplayText;
  save_failed: DisplayText;
  file_too_large: DisplayText;
  unsupported_type: DisplayText;
  choose_image_before_save: DisplayText;
};

export type MediaUploadResult = {
  record_id: string;
  content_url: string;
  filename: string;
};

export type BrandingSettingsModel = {
  model_type: string;
  vault_id: string;
  display_context: DisplayContext;
  can_edit: boolean;
  chrome: BrandingPageChrome;
  settings: BrandingSettings;
  defaults: BrandingDefaults;
  constraints: BrandingConstraints;
};

export type VaultInformationPageChrome = {
  page_title: DisplayText;
  section_title: DisplayText;
  domain_name_label: DisplayText;
  vault_id_label: DisplayText;
  vault_name_label: DisplayText;
  vault_version_label: DisplayText;
  assembly_version_label: DisplayText;
  platform_version_label: DisplayText;
  vault_url_label: DisplayText;
  pod_label: DisplayText;
  geographic_region_label: DisplayText;
  residency_region_label: DisplayText;
  empty_value: DisplayText;
};

export type VaultInformationModel = {
  vault_id: string;
  domain_name: string;
  vault_name: string;
  vault_version: string;
  assembly_version?: string;
  platform_version?: string;
  vault_url: string;
  pod: string;
  geographic_region: string;
  residency_region: string;
  chrome: VaultInformationPageChrome;
};

export type SandboxVaultsPageChrome = {
  page_title: DisplayText;
  available_section_title: DisplayText;
  active_section_title: DisplayText;
  prerelease_available_link: DisplayText;
  create_button: DisplayText;
  create_allowance_exhausted: DisplayText;
  empty_list: DisplayText;
  column_size: DisplayText;
  column_available: DisplayText;
  column_allowed: DisplayText;
  column_prerelease_available: DisplayText;
  column_name: DisplayText;
  column_source_vault: DisplayText;
  column_snapshots: DisplayText;
  column_release: DisplayText;
  column_type: DisplayText;
  column_status: DisplayText;
  column_expiration_date: DisplayText;
  column_domain: DisplayText;
  column_pod: DisplayText;
  column_refresh_available: DisplayText;
  column_actions: DisplayText;
  create_modal_title: DisplayText;
  details_section_title: DisplayText;
  field_name: DisplayText;
  field_size: DisplayText;
  field_release: DisplayText;
  field_domain: DisplayText;
  field_source: DisplayText;
  field_source_vault: DisplayText;
  field_snapshot: DisplayText;
  source_from_vault: DisplayText;
  source_from_snapshot: DisplayText;
  field_vault_owner: DisplayText;
  field_set_owner: DisplayText;
  field_set_owner_help: DisplayText;
  create_success: DisplayText;
  refresh_success: DisplayText;
  delete_success: DisplayText;
  refresh_now: DisplayText;
  refresh_action: DisplayText;
  delete_action: DisplayText;
  refresh_confirm: DisplayText;
  delete_confirm: DisplayText;
  delete_snapshots_option: DisplayText;
  status_active: DisplayText;
  status_provisioning: DisplayText;
  status_refresh_in_progress: DisplayText;
  status_upgrade_in_progress: DisplayText;
  size_small: DisplayText;
  size_medium: DisplayText;
  size_large: DisplayText;
  size_very_large: DisplayText;
  size_extra_large: DisplayText;
  size_full: DisplayText;
  release_general: DisplayText;
  release_prerelease: DisplayText;
  release_limited: DisplayText;
  type_configuration: DisplayText;
  yes: DisplayText;
  no: DisplayText;
  submit: DisplayText;
  cancel: DisplayText;
  back_to_list: DisplayText;
};

export type SandboxEntitlement = {
  size: string;
  size_label: string;
  available: number;
  allowed: number;
  prerelease_available: number;
};

export type ActiveSandboxVault = {
  id: string;
  name: string;
  source_vault: string;
  release: string;
  type: string;
  size: string;
  size_label: string;
  status: string;
  status_label: string;
  expiration_date?: string;
  domain: string;
  pod: string;
  snapshots: number;
  refresh_available: boolean;
  refresh_available_label: string;
  can_refresh: boolean;
  can_delete: boolean;
};

export type SandboxDomainOption = {
  id: string;
  label: string;
};

export type SandboxReleaseOption = {
  id: string;
  label: string;
};

export type SandboxSnapshotOption = {
  id: string;
  name: string;
  release?: string;
};

export type SandboxVaultsModel = {
  production_vault_id: string;
  production_vault_name: string;
  source_vault_id: string;
  source_vault_name: string;
  default_domain_id: string;
  default_release_id: string;
  can_create: boolean;
  entitlements: SandboxEntitlement[];
  domains: SandboxDomainOption[];
  releases: SandboxReleaseOption[];
  snapshots: SandboxSnapshotOption[];
  active: ActiveSandboxVault[];
  chrome: SandboxVaultsPageChrome;
};

export type SandboxVaultCreateResult = {
  operation_id: string;
  status: string;
  message: string;
};

export type SandboxVaultActionResult = {
  operation_id?: string;
  status?: string;
  message: string;
};

export type SandboxSnapshotsPageChrome = {
  page_title: DisplayText;
  available_label: DisplayText;
  all_snapshots_title: DisplayText;
  create_button: DisplayText;
  empty_list: DisplayText;
  column_name: DisplayText;
  column_description: DisplayText;
  column_source_sandbox: DisplayText;
  column_release: DisplayText;
  column_include_data: DisplayText;
  column_status: DisplayText;
  column_upgrade_status: DisplayText;
  column_expiration_date: DisplayText;
  column_actions: DisplayText;
  create_page_title: DisplayText;
  details_section_title: DisplayText;
  field_source_sandbox: DisplayText;
  field_name: DisplayText;
  field_description: DisplayText;
  field_include_data: DisplayText;
  field_include_data_help: DisplayText;
  create_success: DisplayText;
  update_action: DisplayText;
  upgrade_action: DisplayText;
  delete_action: DisplayText;
  change_source_action: DisplayText;
  update_confirm: DisplayText;
  upgrade_confirm: DisplayText;
  delete_confirm: DisplayText;
  change_source_title: DisplayText;
  update_success: DisplayText;
  upgrade_success: DisplayText;
  delete_success: DisplayText;
  change_source_success: DisplayText;
  back_to_list: DisplayText;
  submit: DisplayText;
  confirm: DisplayText;
  cancel: DisplayText;
  yes: DisplayText;
  no: DisplayText;
};

export type SandboxSnapshotRow = {
  id: string;
  name: string;
  description: string;
  source_sandbox_id: string;
  source_sandbox: string;
  release: string;
  include_data: boolean;
  status: string;
  upgrade_status: string;
  expiration_date?: string;
  can_update: boolean;
  can_upgrade: boolean;
  can_delete: boolean;
  can_change_source: boolean;
};

export type SandboxSnapshotSourceOption = {
  id: string;
  name: string;
  available: number;
  release?: string;
};

export type SandboxSnapshotsModel = {
  production_vault_id: string;
  available: number;
  can_create: boolean;
  source_options: SandboxSnapshotSourceOption[];
  change_source_candidates: SandboxSnapshotSourceOption[];
  snapshots: SandboxSnapshotRow[];
  chrome: SandboxSnapshotsPageChrome;
};

export type SandboxSnapshotCreateResult = {
  operation_id: string;
  status: string;
  message: string;
};

export type SandboxSnapshotActionResult = {
  message: string;
};

export type DomainInformationPageChrome = {
  page_title: DisplayText;
  section_title: DisplayText;
  domain_name_label: DisplayText;
  domain_type_label: DisplayText;
  vaults_section_title: DisplayText;
  vault_column: DisplayText;
  vault_id_column: DisplayText;
  status_column: DisplayText;
  pod_column: DisplayText;
  status_active: DisplayText;
  status_inactive: DisplayText;
  empty_value: DisplayText;
  empty_vaults: DisplayText;
};

export type DomainInformationVaultRow = {
  name: string;
  id: string;
  status: string;
  pod: string;
};

export type DomainInformationModel = {
  domain_name: string;
  domain_type: string;
  vaults: DomainInformationVaultRow[];
  chrome: DomainInformationPageChrome;
};

export type DomainSettingsPageChrome = {
  page_title: DisplayText;
  settings_sidebar_title: DisplayText;
  general_label: DisplayText;
  features_label: DisplayText;
  security_policies_label: DisplayText;
  network_access_label: DisplayText;
  saml_profiles_label: DisplayText;
  oauth_profiles_label: DisplayText;
  save_label: DisplayText;
  create_label: DisplayText;
  delete_label: DisplayText;
  reset_all_passwords_label: DisplayText;
  reset_secret_label: DisplayText;
  read_only_banner: DisplayText;
  empty_list_label: DisplayText;
  enabled_label: DisplayText;
  disabled_label: DisplayText;
  default_action_label: DisplayText;
};

export type DomainSettingView = {
  definition_name: string;
  label: string;
  description: string;
  help_text: string;
  section: string;
  one_way: boolean;
  field_name: string;
  field_type: string;
  value: Record<string, unknown>;
  value_revision: number;
};

export type DomainFeatureView = {
  definition_name: string;
  label: string;
  description: string;
  help_text: string;
  enablement_mode: string;
  one_way: boolean;
  effective_state: string;
  editable: boolean;
  state_revision: number;
};

export type DomainSettingsCategory = {
  key: string;
  label: DisplayText;
  implemented: boolean;
};

export type DomainSecurityPolicy = {
  id: string;
  policy_key: string;
  name: string;
  description: string;
  status: string;
  authentication_type: string;
  system_managed?: boolean;
  password_min_length: number;
  password_require_upper: boolean;
  password_require_lower: boolean;
  password_require_digit: boolean;
  password_require_special: boolean;
  password_expiry_days: number;
  password_history_count: number;
  password_reset_daily_limit: number;
  require_security_question: boolean;
  allow_browser_password_save: boolean;
  lockout_threshold: number;
  lockout_unlock_minutes: number;
  saml_profile_id?: string;
  esignature_profile_id?: string;
  oauth_profile_id?: string;
  api_token_expiry_days: number;
  session_idle_timeout_minutes: number;
  session_max_lifetime_hours: number;
  mfa_required: boolean;
  mfa_methods: string[];
  delegate_allowed: boolean;
  delegate_max_days: number;
  compliance_text: string;
  compliance_version: string;
};

export type DomainNetworkAccessSettings = {
  default_action: string;
};

export type DomainNetworkAccessRule = {
  id: string;
  name: string;
  cidr: string;
  action: string;
  priority: number;
  enabled: boolean;
  description: string;
};

export type DomainSAMLProfile = {
  id: string;
  profile_key: string;
  name: string;
  status: string;
  idp_entity_id: string;
  idp_metadata_url: string;
  idp_metadata_xml: string;
  sp_entity_id: string;
  name_id_format: string;
  acs_url: string;
  signing_certificate_pem: string;
  encryption_certificate_pem: string;
  private_key_masked: string;
  has_private_key: boolean;
  is_esignature_profile: boolean;
};

export type DomainOAuthProfile = {
  id: string;
  profile_key: string;
  name: string;
  description: string;
  provider_type: string;
  status: string;
  client_id: string;
  client_secret_masked: string;
  has_client_secret: boolean;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  scopes: string[];
  pkce_required: boolean;
  enable_auth: boolean;
  enable_file_import: boolean;
  file_import_scopes: string[];
  login_button_label: string;
  redirect_uri?: string;
};

export type DomainSettingsModel = {
  model_type: string;
  vault_id: string;
  domain_id: string;
  domain_state: string;
  can_edit: boolean;
  active_category: string;
  categories: DomainSettingsCategory[];
  settings: DomainSettingView[];
  features: DomainFeatureView[];
  security_policies: DomainSecurityPolicy[];
  selected_policy?: DomainSecurityPolicy;
  network_settings?: DomainNetworkAccessSettings;
  network_rules: DomainNetworkAccessRule[];
  saml_profiles: DomainSAMLProfile[];
  oauth_profiles: DomainOAuthProfile[];
  selected_oauth_profile?: DomainOAuthProfile;
  chrome: DomainSettingsPageChrome;
  display_context: DisplayContext;
};

export type DomainSettingsPatchRequest = {
  kind: string;
  action?: string;
  domain_id?: string;
  setting?: {
    definition_name: string;
    patch: Record<string, unknown>;
  };
  feature?: {
    definition_name: string;
    enabled: boolean;
  };
  security_policy?: Partial<DomainSecurityPolicy>;
  network_settings?: { default_action: string };
  network_rule?: Partial<DomainNetworkAccessRule>;
  saml_profile?: Partial<DomainSAMLProfile> & {
    private_key?: string;
  };
  oauth_profile?: Partial<DomainOAuthProfile> & {
    client_secret?: string;
  };
  federated_bind?: {
    oauth_profile_id: string;
    username: string;
    subject_id: string;
  };
  secret_reset?: { id: string; secret: string };
  delete?: { id: string };
};

export type NotificationItem = {
  id: string;
  subject: string;
  body: string;
  target_url?: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
};

export type NotificationUnreadCountResponse = {
  unread_count: number;
};

// --- Admin metadata viewer (Objects / Fields / Pagelayouts) ---

export type MetadataObjectSummary = {
  api_name: string;
  label: string;
  label_plural: string;
  source: string;
  namespace: string;
  in_menu: boolean;
  object_class?: string;
  allow_types?: boolean;
};

export type MetadataObjectListModel = {
  model_type: string;
  vault_id: string;
  objects: MetadataObjectSummary[];
};

export type MetadataFieldSummary = {
  api_name: string;
  label: string;
  type: string;
  required: boolean;
  unique?: boolean;
  active: boolean;
  list_column?: boolean;
  order?: number;
};

export type MetadataNameValuePair = {
  name: string;
  value: unknown;
};

export type MetadataObjectTypeFieldMembership = {
  api_name: string;
  required?: boolean;
};

export type MetadataObjectTypeSummary = {
  api_name: string;
  label: string;
  label_plural?: string;
  default_type: boolean;
  active: boolean;
  fields: MetadataObjectTypeFieldMembership[];
};

export type MetadataObjectListLayoutColumn = {
  api_name: string;
  label: string;
  type: string;
  order: number;
};

export type MetadataObjectListLayout = {
  source: string;
  api_name?: string;
  label?: string;
  columns: MetadataObjectListLayoutColumn[];
};

export type MetadataObjectDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  allow_types?: boolean;
  attributes: MetadataNameValuePair[];
  fields: MetadataFieldSummary[];
  object_types?: MetadataObjectTypeSummary[];
  list_layout?: MetadataObjectListLayout;
  summary_fields?: MetadataObjectListLayoutColumn[];
};

export type MetadataFieldDetailModel = {
  model_type: string;
  vault_id: string;
  object_name: string;
  object_label?: string;
  api_name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  active?: boolean;
  list_column?: boolean;
  editable?: boolean;
  help_content?: string;
  attributes: MetadataNameValuePair[];
  picklist_api_name?: string;
  picklist_entries?: MetadataPicklistEntrySummary[];
};

export type MetadataPicklistEntrySummary = {
  api_name: string;
  label: string;
  order: number;
  active: boolean;
};

export type MetadataPicklistSummary = {
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  entry_count: number;
  can_add_values: boolean;
  can_reorder_values: boolean;
};

export type MetadataPicklistListModel = {
  model_type: string;
  vault_id: string;
  picklists: MetadataPicklistSummary[];
};

export type MetadataPicklistDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  can_add_values: boolean;
  can_reorder_values: boolean;
  attributes: MetadataNameValuePair[];
  entries: MetadataPicklistEntrySummary[];
};

export type MetadataLayoutSummary = {
  api_name: string;
  label: string;
  namespace: string;
  active: boolean;
  default_layout: boolean;
  object_api_name?: string;
};

export type MetadataLayoutListModel = {
  model_type: string;
  vault_id: string;
  layouts: MetadataLayoutSummary[];
};

export type MetadataLayoutDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  namespace: string;
  active: boolean;
  default_layout: boolean;
  description?: string;
  object_api_name?: string;
  object_label?: string;
  object_type_api_name?: string;
  projected?: boolean;
  section_count?: number;
  element_count?: number;
  attributes: MetadataNameValuePair[];
  sections: MetadataLayoutSection[];
};

export type MetadataLayoutElement = {
  kind: string;
  name?: string;
  label?: string;
  field_api_name?: string;
  control_ref?: string;
  relationship_ref?: string;
  detailform_type?: string;
  order_index: number;
  attributes?: MetadataNameValuePair[];
  elements?: MetadataLayoutElement[];
};

export type MetadataLayoutSection = {
  name?: string;
  label?: string;
  elements: MetadataLayoutElement[];
};

export type MetadataObjectLayout = {
  api_name: string;
  label?: string;
  default_layout: boolean;
  object_type_name?: string;
  section_count: number;
  element_count: number;
  projected: boolean;
  sections: MetadataLayoutSection[];
};

export type MetadataObjectLayoutsModel = {
  model_type: string;
  vault_id: string;
  object_name: string;
  layouts: MetadataObjectLayout[];
};

export type MetadataObjectActionSummary = {
  api_name: string;
  label: string;
  action_ref: string;
  available_all_states: boolean;
  active: boolean;
};

export type MetadataObjectActionsModel = {
  model_type: string;
  vault_id: string;
  object_name: string;
  actions: MetadataObjectActionSummary[];
};

export type MetadataOutboundRelationshipSummary = {
  field_label: string;
  field_name: string;
  outbound_name: string;
  related_object: string;
  relationship_type: string;
  field_api_type: string;
};

export type MetadataInboundRelationshipSummary = {
  relationship_label: string;
  secured: boolean;
  inbound_name: string;
  source_object: string;
  relationship_type: string;
  source_field_name: string;
};

export type MetadataObjectRelationshipsModel = {
  model_type: string;
  vault_id: string;
  object_name: string;
  outbound: MetadataOutboundRelationshipSummary[];
  inbound: MetadataInboundRelationshipSummary[];
};

export type MetadataSharingRuleRole = {
  name: string;
  members: string[];
};

export type MetadataSharingRuleSummary = {
  api_name: string;
  label: string;
  criteria: string;
  active: boolean;
  roles: MetadataSharingRuleRole[];
};

export type MetadataObjectSharingRulesModel = {
  model_type: string;
  vault_id: string;
  object_name: string;
  sharing_rules: MetadataSharingRuleSummary[];
};

export type MetadataLifecycleSummary = {
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  starting_state: string;
  state_count: number;
  role_count: number;
  object_count: number;
  state_labels?: string[];
  objects?: MetadataLifecycleBoundObject[];
};

export type MetadataLifecycleListModel = {
  model_type: string;
  vault_id: string;
  lifecycles: MetadataLifecycleSummary[];
};

export type MetadataLifecycleBoundObject = {
  api_name: string;
  label: string;
};

export type MetadataLifecycleStateRule = {
  api_name: string;
  label?: string;
  order: number;
  action_summary?: string;
  target_state?: string;
  rule_xml?: string;
};

export type MetadataLifecycleStateSummary = {
  api_name: string;
  label: string;
  active: boolean;
  record_status?: string;
  record_inactive: boolean;
  cancel_state?: string;
  skip_cancel_state: boolean;
  skip_entry_actions_cancel_state: boolean;
  description?: string;
  is_starting: boolean;
  user_actions: MetadataLifecycleStateRule[];
  entry_criteria: MetadataLifecycleStateRule[];
  entry_actions: MetadataLifecycleStateRule[];
};

export type MetadataLifecycleRoleSummary = {
  api_name: string;
  active: boolean;
  application_role: string;
};

export type MetadataLifecyclePermissionGrant = {
  api_name: string;
  role: string;
  permission: string;
  states: string[];
};

export type MetadataLifecycleEventSummary = {
  api_name: string;
  event?: string;
  label?: string;
  order: number;
  action_summary?: string;
  rule_xml?: string;
};

export type MetadataLifecycleStateTypeBinding = {
  api_name: string;
  state_type: string;
  state_type_label: string;
  state_api_name: string;
  state_label: string;
  description?: string;
  active: boolean;
};

export type MetadataLifecycleDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  starting_state: string;
  attributes: MetadataNameValuePair[];
  state_types: MetadataLifecycleStateTypeBinding[];
  states: MetadataLifecycleStateSummary[];
  roles: MetadataLifecycleRoleSummary[];
  permissions: MetadataLifecyclePermissionGrant[];
  event_actions: MetadataLifecycleEventSummary[];
  objects: MetadataLifecycleBoundObject[];
};

export type MetadataWorkflowSummary = {
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  workflow_content_type: string;
  lifecycle_api_name?: string;
  lifecycle_label?: string;
};

export type MetadataWorkflowListModel = {
  model_type: string;
  vault_id: string;
  workflows: MetadataWorkflowSummary[];
};

export type MetadataWorkflowStepSummary = {
  api_name: string;
  label: string;
  type: string;
  type_label: string;
  next_steps: string[];
  tags?: string[];
  description?: string;
  step_detail_xml?: string;
  placeholder_error?: boolean;
};

export type MetadataWorkflowCancelActionSummary = {
  api_name: string;
  order: number;
  action_summary?: string;
  rule_xml?: string;
};

export type MetadataWorkflowStartState = {
  api_name: string;
  label: string;
};

export type MetadataWorkflowDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  workflow_content_type: string;
  lifecycle_api_name?: string;
  lifecycle_label?: string;
  version: number;
  can_activate?: boolean;
  historical?: boolean;
  version_activated_at?: string;
  start_states: MetadataWorkflowStartState[];
  cardinality: string;
  auto_start: boolean;
  cancellation_comment: boolean;
  users_can_only_complete_one_task: boolean;
  roles_cannot_complete_task?: string;
  disallowed_workflow_owner_actions: string[];
  disallowed_non_task_owner_actions: string[];
  disallowed_actions: string[];
  envelope_name_format?: string;
  document_content_lifecycle?: string;
  record_content_lifecycle?: string;
  workflow_variables?: string;
  steps: MetadataWorkflowStepSummary[];
  cancellation_actions: MetadataWorkflowCancelActionSummary[];
};

export type MetadataWorkflowVersionListItem = {
  definition_version: number;
  label: string;
  activated_at: string;
  live: boolean;
};

export type MetadataWorkflowVersionListModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  versions: MetadataWorkflowVersionListItem[];
};

export type MetadataWorkflowStepRef = {
  api_name: string;
  label: string;
};

export type MetadataWorkflowStartControlView = {
  type: string;
  name?: string;
  label?: string;
  instructions?: string;
  required?: boolean;
  field_api_name?: string;
  participant_strategy?: string;
  participant_strategy_label?: string;
  roles_allowed?: string[];
  roles_not_allowed?: string[];
  user_reference_fields?: string[];
  vault_user_groups?: string[];
  default_users_from_sharing?: boolean;
  allow_task_instructions?: boolean;
  set_workflow_due_date?: boolean;
};

export type MetadataWorkflowStartRuleView = {
  name?: string;
  label?: string;
  type: string;
  controls: string[];
  expression?: string;
};

export type MetadataWorkflowStartStepView = {
  controls: MetadataWorkflowStartControlView[];
  rules: MetadataWorkflowStartRuleView[];
};

export type MetadataWorkflowTaskDueDateView = {
  control_name?: string;
  date_field_type?: string;
  date_field_value?: string;
  offset_amount?: number;
  offset_unit?: string;
};

export type MetadataWorkflowTaskCommentView = {
  name?: string;
  label?: string;
  required: boolean;
};

export type MetadataWorkflowTaskFieldView = {
  control_name?: string;
  field_api_name: string;
  required: boolean;
};

export type MetadataWorkflowTaskVerdictView = {
  name: string;
  label: string;
  signature_required: boolean;
  signature_type?: string;
  comment_label?: string;
  comment_required: boolean;
  field_api_name?: string;
  field_required: boolean;
  capacities_label?: string;
  capacities?: string[];
};

export type MetadataWorkflowTaskReminderView = {
  name?: string;
  template_name: string;
  send_on: string;
  operator: string;
  days: number;
  recipients: string[];
};

export type MetadataWorkflowTaskStepView = {
  task_label?: string;
  instructions?: string;
  participant?: string;
  assignment_type?: string;
  assignment_mode?: string;
  task_requirement?: string;
  exclude_owner: boolean;
  hide_home_page_link?: boolean;
  complete_without_viewing?: boolean;
  prompt_participants?: string[];
  previous_tasks_to_display?: string[];
  notification_templates?: string[];
  notification_previous_tasks?: string[];
  custom_action_references?: string[];
  due_date?: MetadataWorkflowTaskDueDateView | null;
  comments?: MetadataWorkflowTaskCommentView[];
  fields?: MetadataWorkflowTaskFieldView[];
  verdicts?: MetadataWorkflowTaskVerdictView[];
  reminders?: MetadataWorkflowTaskReminderView[];
};

export type MetadataWorkflowDecisionRuleView = {
  default_rule: boolean;
  user_task_step_ref?: string;
  verdict_label?: string;
  summary?: string;
  next_steps: MetadataWorkflowStepRef[];
};

export type MetadataWorkflowDecisionStepView = {
  rules: MetadataWorkflowDecisionRuleView[];
};

export type MetadataWorkflowNotificationStepView = {
  template_name: string;
  recipients: string[];
};

export type MetadataWorkflowStateChangeStepView = {
  next_state: string;
};

export type MetadataWorkflowStepDetailModel = {
  model_type: string;
  vault_id: string;
  workflow_api_name: string;
  workflow_label: string;
  lifecycle_api_name?: string;
  api_name: string;
  label: string;
  type: string;
  type_label: string;
  description?: string;
  next_steps: MetadataWorkflowStepRef[];
  tags?: string[];
  start?: MetadataWorkflowStartStepView | null;
  task?: MetadataWorkflowTaskStepView | null;
  decision?: MetadataWorkflowDecisionStepView | null;
  notification?: MetadataWorkflowNotificationStepView | null;
  state_change?: MetadataWorkflowStateChangeStepView | null;
  step_detail_xml?: string;
  historical?: boolean;
  version?: number;
  placeholder_error?: boolean;
};

export type MetadataPermissionSetSummary = {
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  reference_count: number;
};

export type MetadataPermissionSetListModel = {
  model_type: string;
  vault_id: string;
  permission_sets: MetadataPermissionSetSummary[];
};

export type MetadataPermissionSetEntry = {
  key: string;
  actions: string[];
  available_actions: string[];
};

export type MetadataPermissionSetCategory = {
  key: string;
  label: string;
  order: number;
  entries: MetadataPermissionSetEntry[];
};

export type MetadataPermissionSetReferrer = {
  api_name: string;
  label: string;
  active: boolean;
};

export type MetadataPermissionSetUsage = {
  security_profiles: MetadataPermissionSetReferrer[];
  application_roles: MetadataPermissionSetReferrer[];
};

export type MetadataPermissionSetDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  categories: MetadataPermissionSetCategory[];
  object_labels: Record<string, string>;
  // field_labels / object_type_labels / record_action_labels resolve a sub-entry's api_name to
  // its human label inside the Objects tab, keyed by "<object>.<segment>" (e.g. "study__v.name__v").
  // A segment absent from the map has no distinct label; the viewer falls back to the api_name.
  field_labels: Record<string, string>;
  object_type_labels: Record<string, string>;
  record_action_labels: Record<string, string>;
  // entry_labels resolves a flat-category entry (Tabs / Pages / Mobile) to its referenced
  // component's human label, keyed by the full permission key (e.g. "tab.home__v.tab_actions").
  entry_labels: Record<string, string>;
  used_by: MetadataPermissionSetUsage;
  // objects is the full universe of Object components in the vault (not only the ones this set
  // grants), each annotated with the set's object-level record CRUD grant. The per-object
  // field / type / control / action matrix is loaded lazily via metadataPermissionSetObjectDetail.
  objects: MetadataPermissionSetObjectSummary[];
  // tabs is the full universe of Tab components (with nested Subtabs), each annotated with the
  // set's effective View grant (wildcards + parent + exact).
  tabs: MetadataPermissionSetTabSummary[];
};

export type MetadataPermissionSetTabSummary = {
  api_name: string;
  label: string;
  actions: string[];
  available_actions: string[];
  subtabs?: MetadataPermissionSetTabSubSummary[];
};

export type MetadataPermissionSetTabSubSummary = {
  api_name: string;
  label: string;
  actions: string[];
  available_actions: string[];
};

export type MetadataPermissionSetObjectSummary = {
  api_name: string;
  label: string;
  source: string;
  actions: string[];
  available_actions: string[];
  // object_types are the object's types shown as indented child rows under the object (Veeva
  // Objects tab). Each type carries its effective CRUD grant (wildcard + object-level +
  // type-specific) so broader rules do not leave type rows looking ungranted.
  object_types?: MetadataPermissionSetObjectTypeSummary[];
};

export type MetadataPermissionSetObjectTypeSummary = {
  api_name: string;
  label: string;
  actions: string[];
  available_actions: string[];
};

// MetadataPermissionSetObjectPermissionRow is one row in a per-object permission section (an
// object type, field, or control). actions is the set's grant (empty when ungranted);
// available_actions is the full candidate set for the section's checkbox matrix. is_default marks
// the section-wide default row ("All Object Fields" / "All Object Controls"). object_types lists
// the object type api_names a field belongs to (empty = applies to every type), so the "All
// Object Types" filter can scope the field list to a selected type.
export type MetadataPermissionSetObjectPermissionRow = {
  api_name: string;
  label: string;
  actions: string[];
  available_actions: string[];
  // inherited_actions is the subset of actions that come from an All/wildcard rule (All Object
  // Fields / object.object_actions / etc.). The viewer marks those checkboxes with "*" like Veeva.
  inherited_actions?: string[];
  is_default: boolean;
  object_types?: string[];
};

export type MetadataPermissionSetObjectTypeOption = {
  api_name: string;
  label: string;
};

export type MetadataPermissionSetObjectDetailModel = {
  model_type: string;
  vault_id: string;
  permission_set_api_name: string;
  permission_set_label: string;
  object_name: string;
  object_label: string;
  object_types: MetadataPermissionSetObjectTypeOption[];
  object_permissions: MetadataPermissionSetObjectPermissionRow[];
  field_permissions: MetadataPermissionSetObjectPermissionRow[];
  control_permissions: MetadataPermissionSetObjectPermissionRow[];
};

export type MetadataSecurityProfileSummary = {
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  permission_set_count: number;
};

export type MetadataSecurityProfileListModel = {
  model_type: string;
  vault_id: string;
  security_profiles: MetadataSecurityProfileSummary[];
};

export type MetadataSecurityProfilePermissionSetRef = {
  api_name: string;
  label: string;
  source: string;
  active: boolean;
  exists: boolean;
  description?: string;
};

export type MetadataSecurityProfileUser = {
  user_id: string;
  name: string;
  username: string;
  status: string;
  active: boolean;
};

export type MetadataSecurityProfileDetailModel = {
  model_type: string;
  vault_id: string;
  api_name: string;
  label: string;
  namespace: string;
  source: string;
  active: boolean;
  description: string;
  permission_sets: MetadataSecurityProfilePermissionSetRef[];
  users?: MetadataSecurityProfileUser[];
};

export type SearchSettingsModel = {
  vault_id: string;
  settings: {
    strict_matching_enabled: boolean;
    auto_filters_enabled: boolean;
    multilingual_object_search_enabled: boolean;
    multilingual_object_search_disabled?: boolean;
    multilingual_object_search_hint?: DisplayText;
    export_search_criteria: boolean;
  };
  thesaurus: {
    default_language?: string;
    languages: { value: string; label: DisplayText }[];
  };
  reindex: SearchReindexStatus;
  chrome: SearchSettingsPageChrome;
};

export type ApplicationSettingsModel = {
  vault_id: string;
  can_edit: boolean;
  timeliness: {
    enabled: boolean;
    start_date_field: string;
    end_date_field: string;
    threshold_days: number;
    date_fields: { value: string; label: DisplayText }[];
  };
  chrome: {
    page_title: DisplayText;
    section_title: DisplayText;
    enabled_label: DisplayText;
    start_date_field_label: DisplayText;
    end_date_field_label: DisplayText;
    threshold_days_label: DisplayText;
    save_label: DisplayText;
  };
};

export type ApplicationSettingsPatch = {
  enabled?: boolean;
  start_date_field?: string;
  end_date_field?: string;
  threshold_days?: number;
};

export type VaultAISettingsModel = {
  vault_id: string;
  can_edit: boolean;
  enabled: boolean;
  advanced_llm_connection: string;
  basic_llm_connection: string;
  max_output_tokens: number;
  auto_switch_conversation: boolean;
  chrome: {
    page_title: DisplayText;
    section_title: DisplayText;
    enabled_label: DisplayText;
    advanced_llm_connection_label: DisplayText;
    advanced_llm_help: DisplayText;
    basic_llm_connection_label: DisplayText;
    basic_llm_help: DisplayText;
    max_output_tokens_label: DisplayText;
    max_output_tokens_help: DisplayText;
    auto_switch_conversation_label: DisplayText;
    auto_switch_conversation_help: DisplayText;
    save_label: DisplayText;
  };
};

export type VaultAISettingsPatch = {
  enabled?: boolean;
  advanced_llm_connection?: string;
  basic_llm_connection?: string;
  max_output_tokens?: number;
  auto_switch_conversation?: boolean;
};

export type SecuritySettingsModel = {
  vault_id: string;
  can_edit: boolean;
  auto_managed_group_field_order: {
    objects: SecuritySettingsURSObject[];
  };
  chrome: {
    page_title: DisplayText;
    field_order_title: DisplayText;
    field_order_help: DisplayText;
    reorder_label: DisplayText;
    save_label: DisplayText;
    cancel_label: DisplayText;
    application_role_label: DisplayText;
    application_role_hint: DisplayText;
    empty_objects_label: DisplayText;
  };
};

export type SecuritySettingsURSObject = {
  object_name: string;
  object_label: DisplayText;
  fields: { api_name: string; label: DisplayText }[];
};

export type SecuritySettingsPatch = {
  objects: { object_name: string; fields: string[] }[];
};

export type SearchReindexStatus = {
  pending: number;
  running: number;
  failed: number;
  completed: number;
  in_progress: boolean;
  trigger_label: DisplayText;
  status_label: DisplayText;
};

export type SearchSettingsPageChrome = {
  page_title: DisplayText;
  match_settings_title: DisplayText;
  strict_matching_label: DisplayText;
  auto_filters_label: DisplayText;
  multilingual_object_search_label: DisplayText;
  export_search_criteria_label: DisplayText;
  thesaurus_title: DisplayText;
  thesaurus_language_label: DisplayText;
  thesaurus_export_label: DisplayText;
  thesaurus_import_label: DisplayText;
  thesaurus_import_success_label: DisplayText;
  reindex_title: DisplayText;
  reindex_trigger_label: DisplayText;
  reindex_status_label: DisplayText;
  reindex_in_progress_label: DisplayText;
  reindex_pending_label: DisplayText;
  reindex_running_label: DisplayText;
  reindex_completed_label: DisplayText;
  reindex_failed_label: DisplayText;
  reindex_confirm_title: DisplayText;
  reindex_confirm_body: DisplayText;
  cancel_label: DisplayText;
  save_label: DisplayText;
};

export type SearchModifierSuggestion = {
  kind: "field" | "value";
  field_api_name?: string;
  field_type?: string;
  value?: string;
  label: DisplayText;
};

export type SearchModifierSuggestModel = {
  model_type: string;
  mode: "field" | "value";
  suggestions: SearchModifierSuggestion[];
  apply_text?: string;
};

export type SearchSettingsPatch = {
  strict_matching_enabled?: boolean;
  auto_filters_enabled?: boolean;
  multilingual_object_search_enabled?: boolean;
  export_search_criteria?: boolean;
};

export type JobDefinitionListItem = {
  api_name: string;
  label: string;
  type: string;
  status: string;
  schedule: string;
};

export type JobDefinitionDetail = {
  api_name: string;
  label: string;
  type: string;
  status: string;
  schedule: string;
  timezone?: string;
  priority?: string;
  owner?: string;
  schedule_config?: unknown;
  action?: unknown;
  trigger_date?: unknown;
  conditions?: unknown;
  optional_notifications?: unknown;
  can_edit: boolean;
  can_delete: boolean;
  can_activate: boolean;
};

export type JobDefinitionWrite = {
  label: string;
  api_name?: string;
  schedule: string;
  timezone?: string;
  priority?: string;
  owner?: string;
  active: boolean;
  hourly_interval?: number;
  time?: string;
  week_day?: string;
  month_repeat_type?: string;
  day_of_month?: number;
  week_number?: number;
  action_type: string;
  object_name: string;
  destination_state?: string;
  terminate_existing_workflows?: boolean;
  recipients?: string[];
  template?: string;
  trigger_date_field?: string;
  date_boundary?: "before_and_on" | "only_before" | string;
  conditions?: unknown;
  optional_notifications?: Array<{
    template: string;
    recipients: string[];
    send_date: number;
  }>;
};

export type JobStatusInstance = {
  id: string;
  job_title: string;
  job_definition?: string;
  status: string;
  status_label: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  affected_records: number;
  error_summary?: unknown;
  can_start_now: boolean;
  can_cancel: boolean;
};

export type JobStatusBoard = {
  scheduled: JobStatusInstance[];
  running: JobStatusInstance[];
  history: JobStatusInstance[];
  can_interact: boolean;
};

export type EmailNotificationStatusItem = {
  id: string;
  send_date: string;
  recipient_name: string;
  email_address: string;
  status: string;
  error_message: string;
  document_number: string;
  object_record_name: string;
  subject: string;
};

export type EmailNotificationStatusList = {
  items: EmailNotificationStatusItem[];
  total: number;
  range_from?: string;
  range_to?: string;
};

export type EmailNotificationStatusQuery = {
  send_from?: string;
  send_to?: string;
  email?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type EmailSuppressionItem = {
  id: string;
  name: string;
  email_address: string;
  suppression_reason: string;
  suppression_date: string;
};

export type EmailSuppressionList = {
  items: EmailSuppressionItem[];
  total: number;
};

export type EmailSuppressionQuery = {
  q?: string;
  limit?: number;
  offset?: number;
};

export type EmailSuppressionDeleteResult = {
  deleted: number;
};

export type JobQueueListItem = {
  api_name: string;
  label: string;
  status: string;
  max_concurrent_jobs: number;
  is_default: boolean;
  is_system: boolean;
};

export type JobQueueDetail = {
  api_name: string;
  label: string;
  description?: string;
  status: string;
  max_concurrent_jobs: number;
  is_default: boolean;
  is_system: boolean;
  can_edit: boolean;
};

export type JobQueueWrite = {
  label: string;
  description?: string;
  status: string;
  max_concurrent_jobs: number;
};

export type JobMetadataListItem = {
  api_name: string;
  label: string;
  status: string;
  source: string;
  job_code: string;
};

export type JobMetadataDetail = {
  api_name: string;
  label: string;
  status: string;
  chunk_size: number;
  single_instance_states: string[];
  description?: string;
  job_code: string;
  queue_label: string;
  queue_api_name?: string;
  timeout_duration: string;
  timeout_duration_minutes?: number | null;
  source: string;
  source_label: string;
  can_edit: boolean;
  can_delete: boolean;
};

export type JobMetadataWrite = {
  label: string;
  api_name?: string;
  active: boolean;
  chunk_size: number;
  single_instance_states?: string[];
  description?: string;
  job_code: string;
  queue_api_name?: string;
  timeout_duration_minutes?: number | null;
};

export type OutboundPackageListItem = {
  id: string;
  name: string;
  summary: string;
  package_type: string;
  owner_id: string;
  component_count: number;
  has_artifact: boolean;
  created_at: string;
};

export type OutboundPackageExportResult = {
  id: string;
  name: string;
  package_type: string;
  component_count: number;
  payload_sha256: string;
};

export type OutboundPackageExportJobResult = {
  job_id: string;
  status: string;
};

export type OutboundDependencyCandidate = {
  vault_component_id: string;
  component_type: string;
  component_name: string;
  component_label: string;
  blocking_type: string;
  source_component_type: string;
  source_component_name: string;
  source_component_label: string;
};

export type OutboundDependenciesResult = {
  items: OutboundDependencyCandidate[];
  target_vault_warning: boolean;
};

export type InboundPackageListItem = {
  id: string;
  name: string;
  summary: string;
  package_type: string;
  deployment_status: string;
  source_vault_name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type InboundPackageStep = {
  id: string;
  step_no: number;
  name: string;
  step_type: string;
  review_order: number;
  deployment_status: string;
  deployment_action?: string;
  excluded_by?: string;
  component_summary?: string;
  component_name?: string;
  component_type?: string;
  component_label?: string;
};

export type InboundPackageIssue = {
  severity: string;
  code: string;
  message: string;
  step_id?: string;
};

export type InboundPackageDetail = {
  id: string;
  name: string;
  summary: string;
  description: string;
  package_type: string;
  deployment_status: string;
  source_vault_name: string;
  source_author: string;
  owner_id: string;
  steps: InboundPackageStep[];
  issues: InboundPackageIssue[];
};

export type InboundComparisonRow = {
  operation: string;
  item: string;
  from_target?: string;
  to?: string;
  children?: InboundComparisonRow[];
};

export type InboundDependencyView = {
  component_type: string;
  component_name: string;
  component_label?: string;
  sub_component_name?: string;
  sub_component_type?: string;
  blocking_type?: string;
  status: string;
  in_package: boolean;
};

export type InboundComponentReview = {
  component_type: string;
  component_name: string;
  deployment_action: string;
  comparison: InboundComparisonRow[];
  dependencies: InboundDependencyView[];
};

export type InboundStepReviewDetail = {
  step_id: string;
  step_no: number;
  name: string;
  step_type: string;
  review_order: number;
  deployment_status: string;
  deployment_action: string;
  component_index: number;
  component_count: number;
  step_index: number;
  step_count: number;
  components: InboundComponentReview[];
  prev_step_id?: string;
  next_step_id?: string;
};

export type InboundPackageDeployOutcome = {
  step_id: string;
  step_no: number;
  status: string;
  error?: string;
};

export type InboundPackageDeployResult = {
  id: string;
  deployment_status: string;
  steps_succeeded: number;
  steps_failed: number;
  steps_skipped: number;
  outcomes?: InboundPackageDeployOutcome[];
};

