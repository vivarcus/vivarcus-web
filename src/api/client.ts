import type { ApiError } from "./types";
import { maybeHandleUnauthorized } from "../auth/handleUnauthorized";
import { getSessionToken } from "../auth/session";
import { serializeFacetFilters, type FacetFilters } from "../lib/facetFilters";

const VAULT_HEADER = "X-Vault-Id";

function apiErrorMessage(body: ApiError | null, statusText: string): string {
  const err = body?.error;
  if (err == null) {
    return statusText;
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "object") {
    const structured = err as { message?: string; code?: string };
    if (structured.message?.trim()) {
      return structured.message;
    }
    if (structured.code?.trim()) {
      return structured.code;
    }
  }
  return statusText;
}

export class HttpError extends Error {
  status: number;
  body: ApiError | null;

  constructor(status: number, message: string, body: ApiError | null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  const token = getSessionToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!res.ok) {
    const body = payload as ApiError | null;
    maybeHandleUnauthorized({
      status: res.status,
      body: payload,
      requestPath: path,
      hadSessionToken: Boolean(token),
    });
    throw new HttpError(
      res.status,
      apiErrorMessage(body, res.statusText),
      body,
    );
  }
  return payload as T;
}

async function vaultFetch<T>(
  vaultId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set(VAULT_HEADER, vaultId);
  return apiFetch<T>(path, { ...options, headers });
}

async function vaultFetchRaw(
  vaultId: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set(VAULT_HEADER, vaultId);
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  const token = getSessionToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { error: text };
      }
    }
    const body = payload as ApiError | null;
    maybeHandleUnauthorized({
      status: res.status,
      body: payload,
      requestPath: path,
      hadSessionToken: Boolean(token),
    });
    throw new HttpError(
      res.status,
      apiErrorMessage(body, res.statusText),
      body,
    );
  }
  return res;
}

async function vaultFetchBlob(
  vaultId: string,
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  const res = await vaultFetchRaw(vaultId, path, options);
  return res.blob();
}

export const api = {
  login(username: string, password: string) {
    return apiFetch<import("./types").LoginResponse>("/ui/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout(vaultId?: string) {
    if (vaultId) {
      return vaultFetch<{ ok: boolean }>(vaultId, "/ui/auth/logout", { method: "POST" });
    }
    return apiFetch<{ ok: boolean }>("/ui/auth/logout", { method: "POST" });
  },

  resolveLogin(username: string) {
    return apiFetch<import("./types").ResolveLoginResponse>("/ui/auth/resolve", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },

  startOAuth(domainId: string, providerId: string, username?: string) {
    return apiFetch<{ authorize_url: string }>("/ui/auth/oauth/start", {
      method: "POST",
      body: JSON.stringify({
        domain_id: domainId,
        provider_id: providerId,
        ...(username?.trim() ? { username: username.trim() } : {}),
      }),
    });
  },

  publicAuthConfig() {
    return apiFetch<{ vault_dns_base: string; login_host?: string }>(
      "/ui/auth/public-config",
    );
  },

  issueVaultHandoff(vaultId: string) {
    return apiFetch<{
      ticket: string;
      vault_id: string;
      dns: string;
      vault_host: string;
      expires_in: number;
    }>("/ui/auth/handoff", {
      method: "POST",
      body: JSON.stringify({ vault_id: vaultId }),
    });
  },

  consumeVaultHandoff(ticket: string) {
    return apiFetch<import("./types").LoginResponse>("/ui/auth/handoff/consume", {
      method: "POST",
      body: JSON.stringify({ ticket }),
    });
  },

  listLoginProviders(domain: string) {
    const q = new URLSearchParams({ domain });
    return apiFetch<{ providers: import("./types").LoginProviderLink[] }>(
      `/ui/auth/providers?${q.toString()}`,
    );
  },

  meVaults() {
    return apiFetch<import("./types").MeVaultsResponse>("/ui/me/vaults");
  },

  meIdentity() {
    return apiFetch<import("./types").MeIdentityResponse>("/ui/me/identity");
  },

  meAvatar(vaultId: string) {
    return vaultFetch<import("./types").MeAvatarResponse>(vaultId, `/ui/me/avatar`);
  },

  recordSelectedVault(vaultId: string) {
    return apiFetch<{ vault_id: string; default_vault_id: string }>(
      "/ui/me/selected-vault",
      {
        method: "PUT",
        body: JSON.stringify({ vault_id: vaultId }),
      },
    );
  },

  navigation(vaultId: string) {
    return vaultFetch<import("./types").NavigationModel>(
      vaultId,
      `/ui/navigation`,
    );
  },

  vaultCreateMenu(vaultId: string) {
    return vaultFetch<import("./types").VaultCreateMenuModel>(
      vaultId,
      `/ui/vault-create-menu`,
    );
  },

  taskDashboard(
    vaultId: string,
    params: {
      view?: string;
      pageSize?: number;
      pageOffset?: number;
      contentType?: string[];
      due?: string[];
      dueFrom?: string;
      dueTo?: string;
      owner?: string[];
      assignedFrom?: string;
      assignedTo?: string;
      workflow?: string[];
      contentCount?: string[];
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.pageSize) q.set("page_size", String(params.pageSize));
    if (params.pageOffset != null) q.set("page_offset", String(params.pageOffset));
    if (params.contentType?.length) q.set("content_type", params.contentType.join(","));
    if (params.due?.length) q.set("due", params.due.join(","));
    if (params.dueFrom) q.set("due_from", params.dueFrom);
    if (params.dueTo) q.set("due_to", params.dueTo);
    if (params.owner?.length) q.set("owner", params.owner.join(","));
    if (params.assignedFrom) q.set("assigned_from", params.assignedFrom);
    if (params.assignedTo) q.set("assigned_to", params.assignedTo);
    if (params.workflow?.length) q.set("workflow", params.workflow.join(","));
    if (params.contentCount?.length) q.set("content_count", params.contentCount.join(","));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").TaskDashboardModel>(
      vaultId,
      `/ui/task-dashboard${suffix}`,
    );
  },

  completeUserTask(vaultId: string, objectName: string, recordId: string) {
    return vaultFetch<{ status: string; record_id: string; version: number }>(
      vaultId,
      `/ui/usertask/completeUserTask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ objName: objectName, recordId }).toString(),
      },
    );
  },

  claimHomeWorkflowTask(vaultId: string, workflowTaskId: string) {
    return vaultFetch<{ status: string }>(vaultId, `/ui/task-dashboard/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_task_id: workflowTaskId }),
    });
  },

  unclaimHomeWorkflowTask(vaultId: string, workflowTaskId: string) {
    return vaultFetch<{ status: string }>(vaultId, `/ui/task-dashboard/unclaim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_task_id: workflowTaskId }),
    });
  },

  completeHomeWorkflowTask(
    vaultId: string,
    workflowTaskId: string,
    body: {
      verdict_label?: string;
      comment?: string;
      fields?: Record<string, string>;
      content_verdicts?: Array<{ record_id: string; verdict_label: string; comment?: string }>;
    } = {},
  ) {
    return vaultFetch<{ status: string }>(vaultId, `/ui/task-dashboard/workflow-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow_task_id: workflowTaskId,
        verdict_label: body.verdict_label,
        comment: body.comment,
        fields: body.fields,
        content_verdicts: body.content_verdicts,
      }),
    });
  },

  tmfHome(
    vaultId: string,
    params: {
      studyId?: string;
      studyCountryId?: string;
      siteId?: string;
      milestoneCategory?: string;
      milestoneFilterId?: string;
      milestonesPage?: number;
      milestonesPageSize?: number;
      myTasksPageSize?: number;
      attentionCategory?: string;
      qualityFilter?: string;
      qualityAssignee?: string;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.studyId) q.set("study_id", params.studyId);
    if (params.studyCountryId) q.set("study_country_id", params.studyCountryId);
    if (params.siteId) q.set("site_id", params.siteId);
    if (params.milestoneCategory) q.set("milestone_category", params.milestoneCategory);
    if (params.milestoneFilterId) q.set("milestone_filter_id", params.milestoneFilterId);
    if (params.milestonesPage) q.set("milestones_page", String(params.milestonesPage));
    if (params.milestonesPageSize) q.set("milestones_page_size", String(params.milestonesPageSize));
    if (params.myTasksPageSize) q.set("my_tasks_page_size", String(params.myTasksPageSize));
    if (params.attentionCategory) q.set("attention_category", params.attentionCategory);
    if (params.qualityFilter) q.set("quality_filter", params.qualityFilter);
    if (params.qualityAssignee) q.set("quality_assignee", params.qualityAssignee);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").TMFHomeModel>(vaultId, `/ui/tmf-home${suffix}`);
  },

  studyMgmtHome(
    vaultId: string,
    params: {
      studyId?: string;
      studyCountryId?: string;
      siteId?: string;
      milestoneCategory?: string;
      milestonesPage?: number;
      milestonesPageSize?: number;
      myTasksPageSize?: number;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.studyId) q.set("study_id", params.studyId);
    if (params.studyCountryId) q.set("study_country_id", params.studyCountryId);
    if (params.siteId) q.set("site_id", params.siteId);
    if (params.milestoneCategory) q.set("milestone_category", params.milestoneCategory);
    if (params.milestonesPage) q.set("milestones_page", String(params.milestonesPage));
    if (params.milestonesPageSize) q.set("milestones_page_size", String(params.milestonesPageSize));
    if (params.myTasksPageSize) q.set("my_tasks_page_size", String(params.myTasksPageSize));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").StudyMgmtHomeModel>(vaultId, `/ui/study-management-home${suffix}`);
  },

  craHome(
    vaultId: string,
    params: {
      studyId?: string;
      studyCountryId?: string;
      siteId?: string;
      issueStatus?: string;
      openItemStatus?: string;
      myTasksPageSize?: number;
      monitoringPageSize?: number;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.studyId) q.set("study_id", params.studyId);
    if (params.studyCountryId) q.set("study_country_id", params.studyCountryId);
    if (params.siteId) q.set("site_id", params.siteId);
    if (params.issueStatus) q.set("issue_status", params.issueStatus);
    if (params.openItemStatus) q.set("open_item_status", params.openItemStatus);
    if (params.myTasksPageSize) q.set("my_tasks_page_size", String(params.myTasksPageSize));
    if (params.monitoringPageSize) q.set("monitoring_page_size", String(params.monitoringPageSize));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").CRAHomeModel>(vaultId, `/ui/cra-home${suffix}`);
  },

  tmfViewer(
    vaultId: string,
    params: {
      studyId?: string;
      studyCountryId?: string;
      siteId?: string;
      modelId?: string;
      artifactId?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.studyId) q.set("study_id", params.studyId);
    if (params.studyCountryId) q.set("study_country_id", params.studyCountryId);
    if (params.siteId) q.set("site_id", params.siteId);
    if (params.modelId) q.set("model_id", params.modelId);
    if (params.artifactId) q.set("artifact_id", params.artifactId);
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").TMFViewerModel>(vaultId, `/ui/tmf-viewer${suffix}`);
  },

  milestoneWorkspace(
    vaultId: string,
    params: {
      milestone: string;
      department?: string;
      completeness?: string;
      requiredness?: string;
      type?: string;
      subtype?: string;
      q?: string;
    },
  ) {
    const q = new URLSearchParams();
    q.set("milestone", params.milestone);
    if (params.department) q.set("department", params.department);
    if (params.completeness) q.set("completeness", params.completeness);
    if (params.requiredness) q.set("requiredness", params.requiredness);
    if (params.type) q.set("type", params.type);
    if (params.subtype) q.set("subtype", params.subtype);
    if (params.q) q.set("q", params.q);
    return vaultFetch<import("./types").MilestoneWorkspaceModel>(
      vaultId,
      `/ui/milestone-workspace?${q}`,
    );
  },

  binderTree(
    vaultId: string,
    params: {
      binderId?: string;
      sectionId?: string;
      hideEmptySections?: boolean;
      filingOrigin?: string;
      bindingFilter?: string;
      readonly?: boolean;
      contextObject?: string;
      contextRecord?: string;
    },
  ) {
    const q = new URLSearchParams();
    if (params.binderId) q.set("binder_id", params.binderId);
    if (params.sectionId) q.set("section_id", params.sectionId);
    if (params.hideEmptySections !== undefined) {
      q.set("hide_empty_sections", params.hideEmptySections ? "true" : "false");
    }
    if (params.filingOrigin) q.set("filing_origin", params.filingOrigin);
    if (params.bindingFilter) q.set("binding_filter", params.bindingFilter);
    if (params.readonly) q.set("readonly", "true");
    if (params.contextObject) q.set("context_object", params.contextObject);
    if (params.contextRecord) q.set("context_record", params.contextRecord);
    return vaultFetch<import("./types").BinderTreeModel>(vaultId, `/ui/binder-tree?${q}`);
  },

  refreshBinderAutofiling(vaultId: string, binderId: string) {
    return vaultFetch<{ job_id?: string; message: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/refresh-autofiling`,
      { method: "POST" },
    );
  },

  binderAddDocuments(
    vaultId: string,
    binderId: string,
    body: { section_id: string; document_ids: string[] },
  ) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/links`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderRemoveLinks(vaultId: string, binderId: string, body: { node_ids: string[] }) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/links/remove`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderMoveLink(
    vaultId: string,
    binderId: string,
    body: { node_id: string; target_section_id: string },
  ) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/links/move`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderAddCustomSection(
    vaultId: string,
    binderId: string,
    body: { parent_section_id?: string; number?: string; name: string },
  ) {
    return vaultFetch<{ section_id: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/sections`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderRenameCustomSection(
    vaultId: string,
    binderId: string,
    sectionId: string,
    body: { number?: string; name: string },
  ) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/sections/${encodeURIComponent(sectionId)}/rename`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderDeleteCustomSection(vaultId: string, binderId: string, sectionId: string) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/sections/${encodeURIComponent(sectionId)}/delete`,
      { method: "POST" },
    );
  },

  binderReorderLinks(
    vaultId: string,
    binderId: string,
    body: { section_id: string; node_ids: string[] },
  ) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/links/reorder`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderSyncStructure(vaultId: string, binderId: string) {
    return vaultFetch<{
      sections_created: number;
      sections_removed: number;
      sections_deprecated: number;
    }>(vaultId, `/ui/binder-tree/${encodeURIComponent(binderId)}/sync-structure`, {
      method: "POST",
    });
  },

  binderSetBinding(
    vaultId: string,
    binderId: string,
    body: {
      scope: string;
      section_id?: string;
      node_ids?: string[];
      mode: string;
      version_id?: string;
      overwrite?: boolean;
    },
  ) {
    return vaultFetch<{ updated: number; skipped: number }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/set-binding`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  binderDocumentVersions(vaultId: string, binderId: string, documentId: string) {
    return vaultFetch<{
      versions: Array<{
        record_id: string;
        label: string;
        is_steady?: boolean;
        is_latest?: boolean;
      }>;
    }>(
      vaultId,
      `/ui/binder-tree/${encodeURIComponent(binderId)}/documents/${encodeURIComponent(documentId)}/versions`,
    );
  },

  updateRecordFields(
    vaultId: string,
    objectName: string,
    recordId: string,
    fields: Record<string, unknown>,
  ) {
    return vaultFetch<{ record_id: string; version: number }>(
      vaultId,
      `/api/v1/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      },
    );
  },

  businessAdminObjectsSelector(vaultId: string) {
    return vaultFetch<import("./types").BusinessAdminObjectsSelectorModel>(
      vaultId,
      `/ui/business-admin/objects`,
    );
  },

  businessAdminObjectList(
    vaultId: string,
    objectName: string,
    params: {
      view?: string;
      navigationContext?: string;
      pageSize?: number;
      pageToken?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      filter?: string;
      filterField?: string;
      facetFilters?: FacetFilters;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.pageSize) q.set("page_size", String(params.pageSize));
    if (params.pageToken) q.set("page_token", params.pageToken);
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const facetFilters = serializeFacetFiltersParam(params.facetFilters);
    if (facetFilters) q.set("facet_filters", facetFilters);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListModel>(
      vaultId,
      `/ui/business-admin/objects/${encodeURIComponent(objectName)}/records${suffix}`,
    );
  },

  businessAdminObjectListFacets(
    vaultId: string,
    objectName: string,
    params: {
      view?: string;
      navigationContext?: string;
      filter?: string;
      filterField?: string;
      facetFilters?: FacetFilters;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const facetFilters = serializeFacetFiltersParam(params.facetFilters);
    if (facetFilters) q.set("facet_filters", facetFilters);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListFacetModel>(
      vaultId,
      `/ui/business-admin/objects/${encodeURIComponent(objectName)}/facets${suffix}`,
    );
  },

  saveBusinessAdminObjectListView(
    vaultId: string,
    objectName: string,
    body: { view_id: string; navigation_context?: string },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/business-admin/objects/${encodeURIComponent(objectName)}/selected-view`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  saveBusinessAdminObjectListGridPreference(
    vaultId: string,
    objectName: string,
    body: {
      navigation_context?: string;
      grid_preferences: import("./types").ListGridPreferences;
    },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/business-admin/objects/${encodeURIComponent(objectName)}/grid-preference`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  adminVaultUsersList(
    vaultId: string,
    params: {
      view?: string;
      navigationContext?: string;
      pageSize?: number;
      pageToken?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      filter?: string;
      filterField?: string;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.pageSize) q.set("page_size", String(params.pageSize));
    if (params.pageToken) q.set("page_token", params.pageToken);
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListModel>(
      vaultId,
      `/ui/admin/users-groups/vault_users/records${suffix}`,
    );
  },

  saveAdminVaultUsersListView(
    vaultId: string,
    body: { view_id: string; navigation_context?: string },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/vault_users/selected-view`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  saveAdminVaultUsersListGridPreference(
    vaultId: string,
    body: {
      navigation_context?: string;
      grid_preferences: import("./types").ListGridPreferences;
    },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/vault_users/grid-preference`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  // --- Domain User administration (user__sys record actions) -----------------
  // These target the domain user by its UUID (user__sys.domain_user_id__sys),
  // not the user__sys record id. The Vault is resolved from the X-Vault-Id
  // header injected by vaultFetch.

  updateVaultUserProfile(
    vaultId: string,
    userId: string,
    body: import("./types").VaultUserProfileInput,
  ) {
    return vaultFetch<{ updated: boolean }>(
      vaultId,
      `/api/v1/vault-users/${encodeURIComponent(userId)}/profile`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  updateVaultUserSecurityPolicy(
    vaultId: string,
    userId: string,
    body: { policy_key: string; federated_id?: string },
  ) {
    return vaultFetch<{ updated: boolean }>(
      vaultId,
      `/api/v1/vault-users/${encodeURIComponent(userId)}/security-policy`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  disableDomainUser(vaultId: string, userId: string) {
    return vaultFetch<{ domain_active: boolean }>(
      vaultId,
      `/api/v1/vault-users/${encodeURIComponent(userId)}/domain-disable`,
      { method: "POST" },
    );
  },

  enableDomainUser(vaultId: string, userId: string) {
    return vaultFetch<{ domain_active: boolean }>(
      vaultId,
      `/api/v1/vault-users/${encodeURIComponent(userId)}/domain-enable`,
      { method: "POST" },
    );
  },

  adminGroupsList(
    vaultId: string,
    params: {
      view?: string;
      navigationContext?: string;
      pageSize?: number;
      pageToken?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      filter?: string;
      filterField?: string;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.pageSize) q.set("page_size", String(params.pageSize));
    if (params.pageToken) q.set("page_token", params.pageToken);
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListModel>(
      vaultId,
      `/ui/admin/users-groups/groups/records${suffix}`,
    );
  },

  saveAdminGroupsListView(
    vaultId: string,
    body: { view_id: string; navigation_context?: string },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/groups/selected-view`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  saveAdminGroupsListGridPreference(
    vaultId: string,
    body: {
      navigation_context?: string;
      grid_preferences: import("./types").ListGridPreferences;
    },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/groups/grid-preference`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  adminApplicationRolesList(
    vaultId: string,
    params: {
      view?: string;
      navigationContext?: string;
      pageSize?: number;
      pageToken?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      filter?: string;
      filterField?: string;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.pageSize) q.set("page_size", String(params.pageSize));
    if (params.pageToken) q.set("page_token", params.pageToken);
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListModel>(
      vaultId,
      `/ui/admin/users-groups/application_roles/records${suffix}`,
    );
  },

  saveAdminApplicationRolesListView(
    vaultId: string,
    body: { view_id: string; navigation_context?: string },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/application_roles/selected-view`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  saveAdminApplicationRolesListGridPreference(
    vaultId: string,
    body: {
      navigation_context?: string;
      grid_preferences: import("./types").ListGridPreferences;
    },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/application_roles/grid-preference`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  vqlQuery(vaultId: string, body: { query: string }) {
    return vaultFetch<import("./types").VqlQueryResult>(
      vaultId,
      `/ui/vql`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  objectList(
    vaultId: string,
    tabApiName: string,
    params: {
      view?: string;
      navigationContext?: string;
      pageSize?: number;
      pageToken?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      filter?: string;
      filterField?: string;
      facetFilters?: FacetFilters;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.pageSize) q.set("page_size", String(params.pageSize));
    if (params.pageToken) q.set("page_token", params.pageToken);
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const facetFilters = serializeFacetFiltersParam(params.facetFilters);
    if (facetFilters) q.set("facet_filters", facetFilters);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListModel>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/records${suffix}`,
    );
  },

  objectListFacets(
    vaultId: string,
    tabApiName: string,
    params: {
      view?: string;
      navigationContext?: string;
      filter?: string;
      filterField?: string;
      facetFilters?: FacetFilters;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    if (params.navigationContext) q.set("navigation_context", params.navigationContext);
    if (params.filter) q.set("filter", params.filter);
    if (params.filterField) q.set("filter_field", params.filterField);
    const facetFilters = serializeFacetFiltersParam(params.facetFilters);
    if (facetFilters) q.set("facet_filters", facetFilters);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ObjectListFacetModel>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/facets${suffix}`,
    );
  },

  saveObjectListView(
    vaultId: string,
    tabApiName: string,
    body: { view_id: string; navigation_context?: string },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/selected-view`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  saveObjectListGridPreference(
    vaultId: string,
    tabApiName: string,
    body: {
      navigation_context?: string;
      grid_preferences: import("./types").ListGridPreferences;
    },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/grid-preference`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  listSavedViews(vaultId: string, tabApiName: string, navigationContext?: string) {
    const q = navigationContext
      ? `?navigation_context=${encodeURIComponent(navigationContext)}`
      : "";
    return vaultFetch<import("./types").SavedViewListModel>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/saved-views${q}`,
    );
  },

  getSavedView(vaultId: string, tabApiName: string, viewApiName: string) {
    return vaultFetch<import("./types").SavedViewDetail>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/saved-views/${encodeURIComponent(viewApiName)}`,
    );
  },

  createSavedView(
    vaultId: string,
    tabApiName: string,
    body: {
      navigation_context?: string;
      label: string;
      vql_search_criteria?: string;
      search_criteria?: string;
    },
  ) {
    return vaultFetch<import("./types").SavedViewDetail>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/saved-views`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  updateSavedView(
    vaultId: string,
    tabApiName: string,
    viewApiName: string,
    body: {
      label: string;
      vql_search_criteria?: string;
      search_criteria?: string;
    },
  ) {
    return vaultFetch<import("./types").SavedViewDetail>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/saved-views/${encodeURIComponent(viewApiName)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  deleteSavedView(vaultId: string, tabApiName: string, viewApiName: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/saved-views/${encodeURIComponent(viewApiName)}`,
      { method: "DELETE" },
    );
  },

  copySavedView(
    vaultId: string,
    tabApiName: string,
    viewApiName: string,
    body: { navigation_context?: string; label?: string },
  ) {
    return vaultFetch<import("./types").SavedViewDetail>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/saved-views/${encodeURIComponent(viewApiName)}/copy`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  savePersonalDefaultView(
    vaultId: string,
    tabApiName: string,
    body: { navigation_context?: string; view_id?: string; clear?: boolean },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/personal-default-view`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  setRecordFavorite(
    vaultId: string,
    objectName: string,
    recordId: string,
    favorited: boolean,
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/favorite`,
      { method: "PUT", body: JSON.stringify({ favorited }) },
    );
  },

  recordPage(vaultId: string, objectName: string, recordId: string, params: { layout?: string; page?: string } = {}) {
    const q = new URLSearchParams();
    if (params.layout) q.set("layout", params.layout);
    if (params.page) q.set("page", params.page);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").RecordPageModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/page${suffix}`,
    );
  },

  completenessHover(vaultId: string, recordId: string) {
    return vaultFetch<import("./types").HoverCardModel>(
      vaultId,
      `/ui/objects/milestone__v/records/${encodeURIComponent(recordId)}/completeness-hover`,
    );
  },

  createForm(vaultId: string, objectName: string, params: { objectType?: string; layout?: string; copyFrom?: string; page?: string } = {}) {
    const q = new URLSearchParams();
    if (params.objectType) q.set("object_type", params.objectType);
    if (params.layout) q.set("layout", params.layout);
    if (params.copyFrom) q.set("copy_from", params.copyFrom);
    if (params.page) q.set("page", params.page);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").RecordFormModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/form${suffix}`,
    );
  },

  domainUserOptions(vaultId: string, search?: string, limit?: number) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (limit) q.set("limit", String(limit));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").DomainUserOptionsModel>(
      vaultId,
      `/ui/objects/user__sys/domain-users${suffix}`,
    );
  },

  editForm(
    vaultId: string,
    objectName: string,
    recordId: string,
    params: { layout?: string; page?: string } = {},
  ) {
    const q = new URLSearchParams();
    if (params.layout) q.set("layout", params.layout);
    if (params.page) q.set("page", params.page);
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").RecordFormModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/form${suffix}`,
    );
  },

  changeTypeForm(
    vaultId: string,
    objectName: string,
    recordId: string,
    params: { object_type_name: string },
  ) {
    const q = new URLSearchParams();
    q.set("object_type_name", params.object_type_name);
    return vaultFetch<import("./types").RecordFormModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/change-type-form?${q}`,
    );
  },

  changeTypeWarning(
    vaultId: string,
    objectName: string,
    recordId: string,
    params: { object_type_name: string },
  ) {
    const q = new URLSearchParams();
    q.set("object_type_name", params.object_type_name);
    return vaultFetch<import("./types").ChangeTypeWarning>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/change-type-warning?${q}`,
    );
  },

  submitCreate(
    vaultId: string,
    objectName: string,
    body: {
      fields: Record<string, unknown>;
      object_type_name?: string;
      form_guard: import("./types").FormGuard;
      form_context_token?: string;
    },
  ) {
    if (body.form_context_token) {
      return this.submitFormByToken(vaultId, body.form_context_token, {
        fields: body.fields,
        object_type_name: body.object_type_name,
      });
    }
    return vaultFetch<import("./types").SubmitResult>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/form`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  submitEdit(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      fields: Record<string, unknown>;
      object_type_name?: string;
      form_guard: import("./types").FormGuard;
      form_context_token?: string;
    },
  ) {
    if (body.form_context_token) {
      return this.submitFormByToken(vaultId, body.form_context_token, {
        fields: body.fields,
        object_type_name: body.object_type_name,
      });
    }
    return vaultFetch<import("./types").SubmitResult>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/form`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  submitChangeType(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      fields: Record<string, unknown>;
      object_type_name: string;
      form_guard: import("./types").FormGuard;
      form_context_token?: string;
    },
  ) {
    if (body.form_context_token) {
      return this.submitFormByToken(vaultId, body.form_context_token, {
        fields: body.fields,
        object_type_name: body.object_type_name,
      });
    }
    return vaultFetch<import("./types").SubmitResult>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/change-type-form`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  submitFormByToken(
    vaultId: string,
    formContextToken: string,
    body: {
      fields: Record<string, unknown>;
      object_type_name?: string;
    },
  ) {
    return vaultFetch<import("./types").SubmitResult>(
      vaultId,
      `/ui/forms/${encodeURIComponent(formContextToken)}/submit`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  executeAction(
    vaultId: string,
    actionId: string,
    body: {
      object_api_name: string;
      record_id: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    return vaultFetch<import("./types").ActionExecutionResult>(
      vaultId,
      `/ui/actions/${encodeURIComponent(actionId)}/execute`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  recordActionPreExecutionDialog(
    vaultId: string,
    objectName: string,
    recordId: string,
    actionName: string,
    kind: "lifecycle" | "sdk",
  ) {
    const params = new URLSearchParams({ kind });
    return vaultFetch<import("./types").PreExecutionDialogModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/actions/${encodeURIComponent(actionName)}/pre-execution-dialog?${params}`,
    );
  },

  recordRowActions(vaultId: string, objectName: string, recordId: string) {
    return vaultFetch<import("./types").RecordRowActionsModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/row-actions`,
    );
  },

  listStartableWorkflows(vaultId: string, objectName: string, recordIds: string[]) {
    return vaultFetch<{ model_type: string; actions: import("./types").LifecycleAction[] }>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/workflows/startable`,
      { method: "POST", body: JSON.stringify({ record_ids: recordIds }) },
    );
  },

  workflowStartNext(vaultId: string, objectName: string, recordId: string, workflowTaskId: string) {
    const params = new URLSearchParams({ workflow_task_id: workflowTaskId });
    return vaultFetch<import("./types").StartNextWorkflowResult>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/workflow-start-next?${params}`,
    );
  },

  relatedRecordRowActions(vaultId: string, sectionContextToken: string, recordId: string) {
    const params = new URLSearchParams({ section_context_token: sectionContextToken });
    return vaultFetch<import("./types").RecordRowActionsModel>(
      vaultId,
      `/ui/related-sections/records/${encodeURIComponent(recordId)}/row-actions?${params}`,
    );
  },

  lifecyclePreExecutionDialog(
    vaultId: string,
    objectName: string,
    recordId: string,
    actionName: string,
  ) {
    return this.recordActionPreExecutionDialog(vaultId, objectName, recordId, actionName, "lifecycle");
  },

  lifecycleTransition(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      action: string;
      action_guard: unknown;
      layout?: string;
      workflow_fields?: Record<string, unknown>;
      workflow_participants?: Record<string, string[]>;
      workflow_dates?: Record<string, string>;
      workflow_assignment_types?: Record<string, string>;
      pre_execution_inputs?: Record<string, string>;
      user_input_fields?: Record<string, unknown>;
      record_ids?: string[];
    },
  ) {
    const payload: Record<string, unknown> = {};
    if (body.workflow_fields) {
      payload.workflow_fields = body.workflow_fields;
    }
    if (body.workflow_participants) {
      payload.workflow_participants = body.workflow_participants;
    }
    if (body.workflow_dates) {
      payload.workflow_dates = body.workflow_dates;
    }
    if (body.workflow_assignment_types) {
      payload.workflow_assignment_types = body.workflow_assignment_types;
    }
    if (body.pre_execution_inputs && Object.keys(body.pre_execution_inputs).length > 0) {
      payload.pre_execution_inputs = body.pre_execution_inputs;
    }
    if (body.user_input_fields && Object.keys(body.user_input_fields).length > 0) {
      payload.user_input_fields = body.user_input_fields;
    }
    if (body.record_ids && body.record_ids.length > 0) {
      payload.record_ids = body.record_ids;
    }
    return this.executeAction(vaultId, `lifecycle.${body.action}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard as import("./types").ActionGuard,
      layout: body.layout,
      payload: Object.keys(payload).length > 0 ? payload : undefined,
    }).then((res) => {
      if (!res.lifecycle?.page) {
        throw new Error("lifecycle action failed");
      }
      return {
        page: res.lifecycle.page,
        sourceStateName: res.lifecycle.source_state_name,
        targetStateName: res.lifecycle.target_state_name,
      };
    });
  },

  sdkAction(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      action: string;
      action_guard: unknown;
      layout?: string;
      pre_execution_inputs?: Record<string, string>;
    },
  ) {
    const payload: Record<string, unknown> = {};
    if (body.pre_execution_inputs && Object.keys(body.pre_execution_inputs).length > 0) {
      payload.pre_execution_inputs = body.pre_execution_inputs;
    }
    return this.executeAction(vaultId, `sdk.${body.action}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard as import("./types").ActionGuard,
      layout: body.layout,
      payload: Object.keys(payload).length > 0 ? payload : undefined,
    }).then((res) => {
      if (!res.sdk?.page) {
        throw new Error("sdk action failed");
      }
      return { page: res.sdk.page };
    });
  },

  evaluateLayoutRules(
    vaultId: string,
    body: {
      object_api_name: string;
      layout_api_name: string;
      object_type_api_name?: string;
      field_values: Record<string, unknown>;
    },
  ) {
    return vaultFetch<import("./types").LayoutRuleEffects>(
      vaultId,
      `/ui/layout-rules/evaluate`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  evaluateLookupDisplays(
    vaultId: string,
    body: {
      object_api_name: string;
      object_type_api_name?: string;
      field_values: Record<string, unknown>;
    },
  ) {
    return vaultFetch<import("./types").LookupDisplayEffects>(
      vaultId,
      `/ui/forms/lookup-displays`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  loadRelatedSection(
    vaultId: string,
    body: {
      section_context_token: string;
      page_token?: string;
      page_size?: number;
      sort_by?: string;
      sort_dir?: "asc" | "desc";
      filter?: string;
      count_only?: boolean;
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionModel>(
      vaultId,
      `/ui/related-sections/load`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  createRelatedSection(
    vaultId: string,
    body: {
      section_context_token: string;
      fields: Record<string, unknown>;
      form_guard?: import("./types").FormGuard;
      object_type_name?: string;
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionCreateResult>(
      vaultId,
      `/ui/related-sections/create`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  loadRelatedCreateForm(
    vaultId: string,
    body: {
      section_context_token: string;
      object_type_name?: string;
    },
  ) {
    return vaultFetch<import("./types").RelatedCreateFormModel>(
      vaultId,
      `/ui/related-sections/create-form`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  loadRelatedCreateOptions(
    vaultId: string,
    body: {
      section_context_token: string;
    },
  ) {
    return vaultFetch<import("./types").RelatedCreateOptions>(
      vaultId,
      `/ui/related-sections/create-options`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  searchRelatedCandidates(
    vaultId: string,
    body: {
      section_context_token: string;
      search?: string;
      filters?: Array<{ field: string; op?: string; value?: string; value_to?: string }>;
      filter_field?: string;
      filter_value?: string;
      page_size?: number;
      page_offset?: number;
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionCandidatesResult>(
      vaultId,
      `/ui/related-sections/search-candidates`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  linkRelatedSection(
    vaultId: string,
    body: {
      section_context_token: string;
      target_record_id: string;
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionMutationResult>(
      vaultId,
      `/ui/related-sections/link`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  unlinkRelatedSection(
    vaultId: string,
    body: {
      section_context_token: string;
      target_record_id: string;
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionMutationResult>(
      vaultId,
      `/ui/related-sections/unlink`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  resolveRelatedSelection(
    vaultId: string,
    body: {
      section_context_token: string;
      sort_by?: string;
      sort_dir?: "asc" | "desc";
      filter?: string;
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionSelectionResult>(
      vaultId,
      `/ui/related-sections/selection-ids`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  bulkLinkRelatedSection(
    vaultId: string,
    body: {
      section_context_token: string;
      target_record_ids: string[];
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionBulkResult>(
      vaultId,
      `/ui/related-sections/bulk-link`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  bulkUnlinkRelatedSection(
    vaultId: string,
    body: {
      section_context_token: string;
      target_record_ids: string[];
    },
  ) {
    return vaultFetch<import("./types").RelatedSectionBulkResult>(
      vaultId,
      `/ui/related-sections/bulk-unlink`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  saveRelatedSectionGridPreference(
    vaultId: string,
    body: {
      section_context_token: string;
      grid_preferences: import("./types").ListGridPreferences;
    },
  ) {
    return vaultFetch<void>(
      vaultId,
      `/ui/related-sections/grid-preference`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  vaultAuditPanel(
    vaultId: string,
    params: {
      panel: "login" | "system" | "domain" | "object_records";
      object?: string;
      page_token?: string;
      page_size?: number;
      user?: string;
      action?: string;
      type?: string;
      status?: string;
      vault_id_filter?: string;
      time_from?: string;
      time_to?: string;
      timezone?: string;
      date_format_profile?: string;
      locale?: string;
    },
  ) {
    const q = new URLSearchParams();
    q.set("panel", params.panel);
    if (params.object) q.set("object", params.object);
    if (params.page_token) q.set("page_token", params.page_token);
    if (params.page_size) q.set("page_size", String(params.page_size));
    if (params.user) q.set("user", params.user);
    if (params.action) q.set("action", params.action);
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    if (params.vault_id_filter) q.set("vault_id_filter", params.vault_id_filter);
    if (params.time_from) q.set("time_from", params.time_from);
    if (params.time_to) q.set("time_to", params.time_to);
    if (params.timezone) q.set("timezone", params.timezone);
    if (params.date_format_profile) q.set("date_format_profile", params.date_format_profile);
    if (params.locale) q.set("locale", params.locale);
    return vaultFetch<import("./types").AuditPanelModel>(
      vaultId,
      `/ui/audit-panel?${q}`,
    );
  },

  usersGroupsPanel(
    vaultId: string,
    view: "groups" | "domain_users",
    params: { page_token?: string; page_size?: number; search?: string } = {},
  ) {
    const q = new URLSearchParams();
    if (params.page_token) q.set("page_token", params.page_token);
    if (params.page_size) q.set("page_size", String(params.page_size));
    if (params.search?.trim()) q.set("search", params.search.trim());
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").UsersGroupsPanelModel>(
      vaultId,
      `/ui/admin/users-groups/${view}${suffix}`,
    );
  },

  domainUserDetail(vaultId: string, userId: string) {
    return vaultFetch<import("./types").DomainUserDetailModel>(
      vaultId,
      `/ui/admin/users-groups/domain_users/detail/${encodeURIComponent(userId)}`,
    );
  },

  usersGroupsExport(
    vaultId: string,
    view: "groups" | "domain_users" | "vault_users",
    params: { search?: string } = {},
  ) {
    const q = new URLSearchParams();
    if (params.search?.trim()) q.set("search", params.search.trim());
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetchBlob(vaultId, `/ui/admin/users-groups/${view}/export${suffix}`);
  },

  usersGroupsGroupForm(vaultId: string, groupId?: string) {
    const path = groupId
      ? `/ui/admin/users-groups/groups/${encodeURIComponent(groupId)}/form`
      : "/ui/admin/users-groups/groups/form";
    return vaultFetch<import("./types").UsersGroupsFormModel>(vaultId, path);
  },

  saveUsersGroupsGroup(
    vaultId: string,
    body: import("./types").UsersGroupsGroupSaveBody,
    groupId?: string,
  ) {
    const path = groupId
      ? `/ui/admin/users-groups/groups/${encodeURIComponent(groupId)}`
      : "/ui/admin/users-groups/groups";
    return vaultFetch<{ entity_id: string }>(vaultId, path, {
      method: groupId ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
  },

  deleteUsersGroupsGroup(vaultId: string, groupId: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/admin/users-groups/groups/${encodeURIComponent(groupId)}`,
      { method: "DELETE" },
    );
  },

  recordSharingPanel(
    vaultId: string,
    objectName: string,
    recordId: string,
    params: {
      role?: string;
      member?: string;
      page_size?: number;
      page_offset?: number;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.role) q.set("role", params.role);
    if (params.member) q.set("member", params.member);
    if (params.page_size) q.set("page_size", String(params.page_size));
    if (params.page_offset) q.set("page_offset", String(params.page_offset));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").SharingPanelModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/sharing-panel${suffix}`,
    );
  },

  searchSharingMembers(
    vaultId: string,
    objectName: string,
    recordId: string,
    params: {
      q?: string;
      limit?: number;
      constrain_roles?: string[];
      exclude_roles?: string[];
      constrain_roles_not_allowed?: string[];
      workflow_participants?: boolean;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.q) q.set("q", params.q);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.constrain_roles?.length) q.set("constrain_roles", params.constrain_roles.join(","));
    if (params.exclude_roles?.length) q.set("exclude_roles", params.exclude_roles.join(","));
    if (params.constrain_roles_not_allowed?.length) {
      q.set("constrain_roles_not_allowed", params.constrain_roles_not_allowed.join(","));
    }
    if (params.workflow_participants) q.set("workflow_participants", "1");
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").SharingMemberOptionsModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/sharing-panel/member-options${suffix}`,
    );
  },

  addSharingGrant(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      role_name: string;
      member_kind: string;
      member_id: string;
    },
  ) {
    return vaultFetch<import("./types").SharingGrantAddedModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/sharing-panel/grants`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  removeSharingGrant(
    vaultId: string,
    objectName: string,
    recordId: string,
    grantId: string,
  ) {
    return vaultFetch<import("./types").SharingGrantRemovedModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/sharing-panel/grants/${encodeURIComponent(grantId)}`,
      {
        method: "DELETE",
      },
    );
  },

  recordAuditPanel(
    vaultId: string,
    objectName: string,
    recordId: string,
    params: {
      page_token?: string;
      page_size?: number;
      user?: string;
      action?: string;
      time_from?: string;
      time_to?: string;
      timezone?: string;
      date_format_profile?: string;
      locale?: string;
      include_related?: string[];
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.page_token) q.set("page_token", params.page_token);
    if (params.page_size) q.set("page_size", String(params.page_size));
    if (params.user) q.set("user", params.user);
    if (params.action) q.set("action", params.action);
    if (params.time_from) q.set("time_from", params.time_from);
    if (params.time_to) q.set("time_to", params.time_to);
    if (params.timezone) q.set("timezone", params.timezone);
    if (params.date_format_profile) q.set("date_format_profile", params.date_format_profile);
    if (params.locale) q.set("locale", params.locale);
    for (const name of params.include_related ?? []) {
      const trimmed = name.trim();
      if (trimmed) q.append("include_related", trimmed);
    }
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").AuditPanelModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/audit-panel${suffix}`,
    );
  },

  initiateWorkflowSignature(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      verdict_label?: string;
      comment?: string;
      fields?: Record<string, unknown>;
      content_verdicts?: Array<{ record_id: string; verdict_label: string; comment?: string }>;
      action_guard: import("./types").ActionGuard;
    },
  ) {
    return this.executeAction(vaultId, `workflow-signature.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      payload: {
        verdict_label: body.verdict_label,
        comment: body.comment,
        fields: body.fields,
        content_verdicts: body.content_verdicts,
      },
    }).then((res) => {
      if (!res.workflow_signature) {
        throw new Error("workflow signature initiation failed");
      }
      return res.workflow_signature;
    });
  },

  workflowComplete(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      verdict_label?: string;
      comment?: string;
      fields?: Record<string, unknown>;
      content_verdicts?: Array<{ record_id: string; verdict_label: string; comment?: string }>;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-complete.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: {
        verdict_label: body.verdict_label,
        comment: body.comment,
        fields: body.fields,
        content_verdicts: body.content_verdicts,
      },
    }).then((res) => {
      if (!res.workflow_complete?.page) {
        throw new Error("workflow complete failed");
      }
      return {
        page: res.workflow_complete.page,
        start_next: res.workflow_complete.start_next ?? null,
      };
    });
  },

  workflowClaim(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-claim.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
    }).then((res) => {
      if (!res.workflow_claim?.page) {
        throw new Error("workflow claim failed");
      }
      return { page: res.workflow_claim.page };
    });
  },

  workflowUnclaim(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-unclaim.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
    }).then((res) => {
      if (!res.workflow_unclaim?.page) {
        throw new Error("workflow unclaim failed");
      }
      return { page: res.workflow_unclaim.page };
    });
  },

  workflowCancel(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_instance_id: string;
      reason: string;
      comment?: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-cancel.${body.workflow_instance_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: {
        reason: body.reason,
        comment: body.comment,
      },
    }).then((res) => {
      if (!res.workflow_cancel?.page) {
        throw new Error("workflow cancel failed");
      }
      return { page: res.workflow_cancel.page };
    });
  },

  workflowCancelTask(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-cancel-task.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
    }).then((res) => {
      if (!res.workflow_task_admin?.page) {
        throw new Error("workflow task cancel failed");
      }
      return { page: res.workflow_task_admin.page };
    });
  },

  workflowReassignTask(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      assignee_user_id: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-reassign.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: { assignee_user_id: body.assignee_user_id },
    }).then((res) => {
      if (!res.workflow_task_admin?.page) {
        throw new Error("workflow reassign failed");
      }
      return { page: res.workflow_task_admin.page };
    });
  },

  workflowParticipants(
    vaultId: string,
    objectName: string,
    recordId: string,
    workflowInstanceId: string,
  ) {
    return vaultFetch<import("./types").WorkflowParticipantsModel>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/workflow-participants?workflow_instance_id=${encodeURIComponent(workflowInstanceId)}`,
    );
  },

  workflowReplaceOwner(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_instance_id: string;
      new_owner_user_id: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-replace-owner.${body.workflow_instance_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: { new_owner_user_id: body.new_owner_user_id },
    }).then((res) => {
      if (!res.workflow_instance_admin?.page) {
        throw new Error("workflow replace owner failed");
      }
      return { page: res.workflow_instance_admin.page };
    });
  },

  workflowAddParticipants(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_instance_id: string;
      participant_group: string;
      user_ids: string[];
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-add-participants.${body.workflow_instance_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: {
        participant_group: body.participant_group,
        user_ids: body.user_ids,
      },
    }).then((res) => {
      if (!res.workflow_instance_admin?.page) {
        throw new Error("workflow add participants failed");
      }
      return { page: res.workflow_instance_admin.page };
    });
  },

  workflowEmailParticipants(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_instance_id: string;
      audience?: string;
      participant_group?: string;
      message?: string;
      cc_self?: boolean;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-email-participants.${body.workflow_instance_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: {
        audience: body.audience ?? "available",
        participant_group: body.participant_group,
        message: body.message,
        cc_self: body.cc_self,
      },
    }).then((res) => {
      if (!res.workflow_instance_admin?.page) {
        throw new Error("workflow email participants failed");
      }
      return { page: res.workflow_instance_admin.page };
    });
  },

  workflowUpdateDueDate(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_instance_id: string;
      due_date: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-update-due-date.${body.workflow_instance_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: { due_date: body.due_date },
    }).then((res) => {
      if (!res.workflow_instance_admin?.page) {
        throw new Error("workflow update due date failed");
      }
      return { page: res.workflow_instance_admin.page };
    });
  },

  workflowUpdateTaskDueDate(
    vaultId: string,
    objectName: string,
    recordId: string,
    body: {
      workflow_task_id: string;
      due_date: string;
      action_guard: import("./types").ActionGuard;
      layout?: string;
    },
  ) {
    return this.executeAction(vaultId, `workflow-update-task-due-date.${body.workflow_task_id}`, {
      object_api_name: objectName,
      record_id: recordId,
      action_guard: body.action_guard,
      layout: body.layout,
      payload: { due_date: body.due_date },
    }).then((res) => {
      if (!res.workflow_task_admin?.page) {
        throw new Error("workflow task update due date failed");
      }
      return { page: res.workflow_task_admin.page };
    });
  },

  authStepUp(body: {
    password: string;
    scope: {
      kind: string;
      record_ref?: string;
      workflow_task_id?: string;
      signature_type?: string;
      vault_id?: string;
      read_and_understood?: boolean;
    };
  }) {
    return apiFetch<{ step_up_token: string; expires_at: string }>("/ui/auth/stepup", {
      method: "POST",
      body: JSON.stringify({ credential_kind: "password", ...body }),
    });
  },

  completeSignature(
    vaultId: string,
    body: { challenge_id: string; step_up_token: string; signature_meaning?: string },
  ) {
    return vaultFetch<{ signature_event_id: number; post_hook_failed?: boolean }>(
      vaultId,
      "/ui/sec/signature/complete",
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  configDiagnostics(
    vaultId: string,
    params: {
      severity?: string;
      component_type?: string;
      issue_code?: string;
      route?: string;
      page_token?: string;
      page_size?: number;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (params.severity) q.set("severity", params.severity);
    if (params.component_type) q.set("component_type", params.component_type);
    if (params.issue_code) q.set("issue_code", params.issue_code);
    if (params.route) q.set("route", params.route);
    if (params.page_token) q.set("page_token", params.page_token);
    if (params.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").ConfigDiagnosticsModel>(
      vaultId,
      `/ui/config-diagnostics${suffix}`,
    );
  },

  layoutProfiles(vaultId: string) {
    return vaultFetch<import("./types").LayoutProfileListModel>(
      vaultId,
      `/ui/layout-profiles`,
    );
  },

  metadataObjects(vaultId: string) {
    return vaultFetch<import("./types").MetadataObjectListModel>(
      vaultId,
      `/ui/admin/metadata/objects`,
    );
  },

  metadataObjectDetail(vaultId: string, objectName: string) {
    return vaultFetch<import("./types").MetadataObjectDetailModel>(
      vaultId,
      `/ui/admin/metadata/objects/${encodeURIComponent(objectName)}`,
    );
  },

  metadataFieldDetail(vaultId: string, objectName: string, fieldName: string) {
    return vaultFetch<import("./types").MetadataFieldDetailModel>(
      vaultId,
      `/ui/admin/metadata/objects/${encodeURIComponent(objectName)}/fields/${encodeURIComponent(fieldName)}`,
    );
  },

  metadataLayouts(vaultId: string) {
    return vaultFetch<import("./types").MetadataLayoutListModel>(
      vaultId,
      `/ui/admin/metadata/layouts`,
    );
  },

  metadataLayoutDetail(vaultId: string, layoutName: string) {
    return vaultFetch<import("./types").MetadataLayoutDetailModel>(
      vaultId,
      `/ui/admin/metadata/layouts/${encodeURIComponent(layoutName)}`,
    );
  },

  metadataObjectLayouts(vaultId: string, objectName: string) {
    return vaultFetch<import("./types").MetadataObjectLayoutsModel>(
      vaultId,
      `/ui/admin/metadata/objects/${encodeURIComponent(objectName)}/layouts`,
    );
  },

  metadataObjectActions(vaultId: string, objectName: string) {
    return vaultFetch<import("./types").MetadataObjectActionsModel>(
      vaultId,
      `/ui/admin/metadata/objects/${encodeURIComponent(objectName)}/actions`,
    );
  },

  metadataObjectRelationships(vaultId: string, objectName: string) {
    return vaultFetch<import("./types").MetadataObjectRelationshipsModel>(
      vaultId,
      `/ui/admin/metadata/objects/${encodeURIComponent(objectName)}/relationships`,
    );
  },

  metadataObjectSharingRules(vaultId: string, objectName: string) {
    return vaultFetch<import("./types").MetadataObjectSharingRulesModel>(
      vaultId,
      `/ui/admin/metadata/objects/${encodeURIComponent(objectName)}/sharing-rules`,
    );
  },

  metadataLifecycles(vaultId: string) {
    return vaultFetch<import("./types").MetadataLifecycleListModel>(
      vaultId,
      `/ui/admin/metadata/lifecycles`,
    );
  },

  metadataLifecycleDetail(vaultId: string, lifecycleName: string) {
    return vaultFetch<import("./types").MetadataLifecycleDetailModel>(
      vaultId,
      `/ui/admin/metadata/lifecycles/${encodeURIComponent(lifecycleName)}`,
    );
  },

  metadataWorkflows(vaultId: string) {
    return vaultFetch<import("./types").MetadataWorkflowListModel>(
      vaultId,
      `/ui/admin/metadata/workflows`,
    );
  },

  metadataWorkflowDetail(vaultId: string, workflowName: string) {
    return vaultFetch<import("./types").MetadataWorkflowDetailModel>(
      vaultId,
      `/ui/admin/metadata/workflows/${encodeURIComponent(workflowName)}`,
    );
  },

  activateMetadataWorkflow(vaultId: string, workflowName: string) {
    return vaultFetch<import("./types").MetadataWorkflowDetailModel>(
      vaultId,
      `/ui/admin/metadata/workflows/${encodeURIComponent(workflowName)}/activate`,
      { method: "POST", body: "{}" },
    );
  },

  metadataWorkflowVersions(vaultId: string, workflowName: string) {
    return vaultFetch<import("./types").MetadataWorkflowVersionListModel>(
      vaultId,
      `/ui/admin/metadata/workflows/${encodeURIComponent(workflowName)}/versions`,
    );
  },

  metadataWorkflowVersionDetail(vaultId: string, workflowName: string, version: number) {
    return vaultFetch<import("./types").MetadataWorkflowDetailModel>(
      vaultId,
      `/ui/admin/metadata/workflows/${encodeURIComponent(workflowName)}/versions/${version}`,
    );
  },

  metadataWorkflowStepDetail(vaultId: string, workflowName: string, stepName: string, version?: number) {
    const versionPath =
      version && version > 0 ? `/versions/${version}` : "";
    return vaultFetch<import("./types").MetadataWorkflowStepDetailModel>(
      vaultId,
      `/ui/admin/metadata/workflows/${encodeURIComponent(workflowName)}${versionPath}/steps/${encodeURIComponent(stepName)}`,
    );
  },

  metadataPicklists(vaultId: string) {
    return vaultFetch<import("./types").MetadataPicklistListModel>(
      vaultId,
      `/ui/admin/metadata/picklists`,
    );
  },

  metadataPicklistDetail(vaultId: string, picklistName: string) {
    return vaultFetch<import("./types").MetadataPicklistDetailModel>(
      vaultId,
      `/ui/admin/metadata/picklists/${encodeURIComponent(picklistName)}`,
    );
  },

  metadataPermissionSets(vaultId: string) {
    return vaultFetch<import("./types").MetadataPermissionSetListModel>(
      vaultId,
      `/ui/admin/metadata/permission-sets`,
    );
  },

  metadataPermissionSetDetail(vaultId: string, permissionSetName: string) {
    return vaultFetch<import("./types").MetadataPermissionSetDetailModel>(
      vaultId,
      `/ui/admin/metadata/permission-sets/${encodeURIComponent(permissionSetName)}`,
    );
  },

  metadataPermissionSetObjectDetail(vaultId: string, permissionSetName: string, objectName: string) {
    return vaultFetch<import("./types").MetadataPermissionSetObjectDetailModel>(
      vaultId,
      `/ui/admin/metadata/permission-sets/${encodeURIComponent(permissionSetName)}/objects/${encodeURIComponent(objectName)}`,
    );
  },

  metadataSecurityProfiles(vaultId: string) {
    return vaultFetch<import("./types").MetadataSecurityProfileListModel>(
      vaultId,
      `/ui/admin/metadata/security-profiles`,
    );
  },

  metadataSecurityProfileDetail(vaultId: string, securityProfileName: string) {
    return vaultFetch<import("./types").MetadataSecurityProfileDetailModel>(
      vaultId,
      `/ui/admin/metadata/security-profiles/${encodeURIComponent(securityProfileName)}`,
    );
  },

  layoutProfileAssignment(vaultId: string, userId?: string) {
    const q = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return vaultFetch<import("./types").LayoutProfileAssignmentModel>(
      vaultId,
      `/ui/layout-profile-assignment${q}`,
    );
  },

  assignLayoutProfile(
    vaultId: string,
    body: { profile_api_name: string; user_id?: string },
  ) {
    return vaultFetch<import("./types").LayoutProfileAssignmentModel>(
      vaultId,
      `/ui/layout-profile-assignment`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  userProfile(vaultId: string) {
    return vaultFetch<import("./types").UserProfileModel>(
      vaultId,
      `/ui/user-profile`,
    );
  },

  languageRegionSettings(vaultId: string) {
    return vaultFetch<import("./types").LanguageRegionSettingsModel>(
      vaultId,
      `/ui/settings/language-region`,
    );
  },

  patchLanguageRegionSettings(
    vaultId: string,
    body: import("./types").LanguageRegionPatch,
  ) {
    return vaultFetch<import("./types").LanguageRegionSettingsModel>(
      vaultId,
      `/ui/settings/language-region`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  searchSettings(vaultId: string) {
    return vaultFetch<import("./types").SearchSettingsModel>(
      vaultId,
      `/ui/settings/search`,
    );
  },

  patchSearchSettings(
    vaultId: string,
    body: import("./types").SearchSettingsPatch,
  ) {
    return vaultFetch<import("./types").SearchSettingsModel>(
      vaultId,
      `/ui/settings/search`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  applicationSettings(vaultId: string) {
    return vaultFetch<import("./types").ApplicationSettingsModel>(
      vaultId,
      `/ui/settings/application`,
    );
  },

  patchApplicationSettings(
    vaultId: string,
    body: import("./types").ApplicationSettingsPatch,
  ) {
    return vaultFetch<import("./types").ApplicationSettingsModel>(
      vaultId,
      `/ui/settings/application`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  vaultAISettings(vaultId: string) {
    return vaultFetch<import("./types").VaultAISettingsModel>(
      vaultId,
      `/ui/settings/vault-ai`,
    );
  },

  patchVaultAISettings(
    vaultId: string,
    body: import("./types").VaultAISettingsPatch,
  ) {
    return vaultFetch<import("./types").VaultAISettingsModel>(
      vaultId,
      `/ui/settings/vault-ai`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  securitySettings(vaultId: string) {
    return vaultFetch<import("./types").SecuritySettingsModel>(
      vaultId,
      `/ui/settings/security`,
    );
  },

  patchSecuritySettings(
    vaultId: string,
    body: import("./types").SecuritySettingsPatch,
  ) {
    return vaultFetch<import("./types").SecuritySettingsModel>(
      vaultId,
      `/ui/settings/security`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  async exportSearchThesaurus(vaultId: string, language: string): Promise<Blob> {
    const q = new URLSearchParams({ language });
    const res = await vaultFetchRaw(
      vaultId,
      `/ui/settings/search/thesaurus/export?${q}`,
    );
    return res.blob();
  },

  importSearchThesaurus(vaultId: string, language: string, file: File) {
    const form = new FormData();
    form.append("language", language);
    form.append("file", file);
    return vaultFetch<{ imported: number }>(
      vaultId,
      `/ui/settings/search/thesaurus/import`,
      { method: "POST", body: form },
    );
  },

  searchModifierSuggest(vaultId: string, tabApiName: string, draft: string) {
    const q = new URLSearchParams({ draft });
    return vaultFetch<import("./types").SearchModifierSuggestModel>(
      vaultId,
      `/ui/tabs/${encodeURIComponent(tabApiName)}/search-modifiers/suggest?${q}`,
    );
  },

  enqueueSearchMetadataReindex(vaultId: string) {
    return vaultFetch<import("./types").SearchSettingsModel>(
      vaultId,
      `/ui/settings/search/reindex`,
      { method: "POST" },
    );
  },

  searchReindexStatus(vaultId: string) {
    return vaultFetch<import("./types").SearchReindexStatus>(
      vaultId,
      `/ui/settings/search/reindex`,
    );
  },

  prepareLanguageDeactivation(vaultId: string, languageCode: string) {
    return vaultFetch<import("./types").LanguageRegionDeactivationPrep>(
      vaultId,
      `/ui/settings/language-region/languages/${encodeURIComponent(languageCode)}/prepare-deactivate`,
      { method: "POST" },
    );
  },

  async exportLanguageRegionTranslations(
    vaultId: string,
    body: { language: string; categories: string[]; include_diagnostics?: boolean },
  ): Promise<Blob> {
    const res = await vaultFetchRaw(
      vaultId,
      `/ui/settings/language-region/bulk/export`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return res.blob();
  },

  importLanguageRegionTranslations(vaultId: string, files: File[]) {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    return vaultFetch<import("./types").LanguageRegionImportResult>(
      vaultId,
      `/ui/settings/language-region/bulk/import`,
      { method: "POST", body: form },
    );
  },

  listLanguageRegionTranslations(
    vaultId: string,
    params: {
      language: string;
      category?: string;
      q?: string;
      stale?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const query = new URLSearchParams();
    query.set("language", params.language);
    if (params.category) query.set("category", params.category);
    if (params.q) query.set("q", params.q);
    if (params.stale) query.set("stale", "true");
    if (params.limit != null) query.set("limit", String(params.limit));
    if (params.offset != null) query.set("offset", String(params.offset));
    return vaultFetch<import("./types").LanguageRegionTranslationList>(
      vaultId,
      `/ui/settings/language-region/translations?${query.toString()}`,
    );
  },

  patchLanguageRegionTranslation(
    vaultId: string,
    body: { key: string; language: string; translated_text: string },
  ) {
    return vaultFetch<import("./types").LanguageRegionTranslationRow>(
      vaultId,
      `/ui/settings/language-region/translations`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  getBrandingSettings(vaultId: string) {
    return vaultFetch<import("./types").BrandingSettingsModel>(
      vaultId,
      `/ui/settings/branding`,
    );
  },

  getVaultInformation(vaultId: string) {
    return vaultFetch<import("./types").VaultInformationModel>(
      vaultId,
      `/ui/about/vault-information`,
    );
  },

  getSandboxVaults(vaultId: string) {
    return vaultFetch<import("./types").SandboxVaultsModel>(
      vaultId,
      `/ui/deployment/sandbox-vaults`,
    );
  },

  createSandboxVault(
    vaultId: string,
    body: {
      source?: "vault" | "snapshot";
      source_snapshot_id?: string;
      name: string;
      size: string;
      release?: string;
      domain_id: string;
      set_owner?: boolean;
    },
  ) {
    return vaultFetch<import("./types").SandboxVaultCreateResult>(
      vaultId,
      `/ui/deployment/sandbox-vaults`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  refreshSandboxVault(vaultId: string, sandboxId: string) {
    return vaultFetch<import("./types").SandboxVaultActionResult>(
      vaultId,
      `/ui/deployment/sandbox-vaults/${encodeURIComponent(sandboxId)}/refresh`,
      { method: "POST" },
    );
  },

  deleteSandboxVault(vaultId: string, sandboxId: string, opts?: { deleteSnapshots?: boolean }) {
    const qs =
      opts?.deleteSnapshots === true
        ? "?delete_snapshots=true"
        : opts?.deleteSnapshots === false
          ? "?delete_snapshots=false"
          : "";
    return vaultFetch<import("./types").SandboxVaultActionResult>(
      vaultId,
      `/ui/deployment/sandbox-vaults/${encodeURIComponent(sandboxId)}${qs}`,
      { method: "DELETE" },
    );
  },

  getSandboxSnapshots(vaultId: string) {
    return vaultFetch<import("./types").SandboxSnapshotsModel>(
      vaultId,
      `/ui/deployment/sandbox-snapshots`,
    );
  },

  createSandboxSnapshot(
    vaultId: string,
    body: {
      source_sandbox_id: string;
      name: string;
      description?: string;
      include_data?: boolean;
    },
  ) {
    return vaultFetch<import("./types").SandboxSnapshotCreateResult>(
      vaultId,
      `/ui/deployment/sandbox-snapshots`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  updateSandboxSnapshot(vaultId: string, snapshotId: string) {
    return vaultFetch<import("./types").SandboxSnapshotCreateResult>(
      vaultId,
      `/ui/deployment/sandbox-snapshots/${encodeURIComponent(snapshotId)}/update`,
      { method: "POST" },
    );
  },

  upgradeSandboxSnapshot(vaultId: string, snapshotId: string) {
    return vaultFetch<import("./types").SandboxSnapshotActionResult>(
      vaultId,
      `/ui/deployment/sandbox-snapshots/${encodeURIComponent(snapshotId)}/upgrade`,
      { method: "POST" },
    );
  },

  deleteSandboxSnapshot(vaultId: string, snapshotId: string) {
    return vaultFetch<import("./types").SandboxSnapshotActionResult>(
      vaultId,
      `/ui/deployment/sandbox-snapshots/${encodeURIComponent(snapshotId)}`,
      { method: "DELETE" },
    );
  },

  changeSandboxSnapshotSource(
    vaultId: string,
    snapshotId: string,
    body: { new_source_sandbox_id: string },
  ) {
    return vaultFetch<import("./types").SandboxSnapshotActionResult>(
      vaultId,
      `/ui/deployment/sandbox-snapshots/${encodeURIComponent(snapshotId)}/change-source`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  getDomainInformation(vaultId: string) {
    return vaultFetch<import("./types").DomainInformationModel>(
      vaultId,
      `/ui/about/domain-information`,
    );
  },

  getSiteHeaderLogo(vaultId: string) {
    return vaultFetch<{ site_header_logo: import("./types").BrandingAsset }>(
      vaultId,
      `/ui/shell/site-header-logo`,
    );
  },

  saveBrandingSettings(
    vaultId: string,
    body: import("./types").BrandingSettings,
  ) {
    return vaultFetch<import("./types").BrandingSettingsModel>(
      vaultId,
      `/ui/settings/branding`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  async uploadBrandingAsset(
    vaultId: string,
    slot: import("./types").BrandingAssetSlot,
    file: File,
  ) {
    const form = new FormData();
    form.append("file", file);
    return vaultFetch<import("./types").BrandingSettingsModel>(
      vaultId,
      `/ui/settings/branding/assets/${slot}`,
      { method: "POST", body: form },
    );
  },

  async fetchBrandingAssetBlob(vaultId: string, path: string): Promise<Blob> {
    const res = await vaultFetchRaw(vaultId, path);
    if (!res.ok) {
      throw new HttpError(res.status, res.statusText, null);
    }
    return res.blob();
  },

  domainSettings(
    vaultId: string,
    category?: string,
    detail?: { policyId?: string; profileId?: string; domainId?: string },
  ) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (detail?.policyId) params.set("policyId", detail.policyId);
    if (detail?.profileId) params.set("profileId", detail.profileId);
    if (detail?.domainId) params.set("domain_id", detail.domainId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return vaultFetch<import("./types").DomainSettingsModel>(
      vaultId,
      `/ui/settings/domain${qs}`,
    );
  },

  patchDomainSettings(
    vaultId: string,
    body: import("./types").DomainSettingsPatchRequest,
  ) {
    return vaultFetch<import("./types").DomainSettingsModel>(
      vaultId,
      `/ui/settings/domain`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  async uploadMedia(vaultId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return vaultFetch<import("./types").MediaUploadResult>(
      vaultId,
      `/ui/media/upload`,
      { method: "POST", body: form },
    );
  },

  async fetchMediaBlob(vaultId: string, path: string): Promise<Blob> {
    const res = await vaultFetchRaw(vaultId, path);
    if (!res.ok) {
      throw new HttpError(res.status, res.statusText, null);
    }
    return res.blob();
  },

  async uploadUserProfileAvatar(vaultId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return vaultFetch<import("./types").UserProfileModel>(
      vaultId,
      `/ui/user-profile/avatar`,
      { method: "POST", body: form },
    );
  },

  clearUserProfileAvatar(vaultId: string) {
    return vaultFetch<import("./types").UserProfileModel>(
      vaultId,
      `/ui/user-profile/avatar`,
      { method: "DELETE" },
    );
  },

  changeUserProfilePassword(
    vaultId: string,
    body: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    },
  ) {
    return vaultFetch<{ status: string }>(vaultId, `/ui/user-profile/password`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateUserProfile(vaultId: string, body: import("./types").UserProfilePatch) {
    return vaultFetch<import("./types").UserProfileModel>(
      vaultId,
      `/ui/user-profile`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  previewPage(
    vaultId: string,
    body: {
      object_api_name: string;
      layout_api_name: string;
      object_type_api_name?: string;
      record_snapshot?: Record<string, unknown>;
    },
  ) {
    return vaultFetch<import("./types").RecordPageModel>(
      vaultId,
      `/ui/preview/page`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  deleteRecord(vaultId: string, objectName: string, recordId: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}`,
      { method: "DELETE" },
    );
  },

  createAuditExport(
    vaultId: string,
    body: {
      audit_type: string;
      query?: Record<string, unknown>;
      domain_id?: string;
    },
  ) {
    return vaultFetch<import("./types").AuditExportJobModel>(
      vaultId,
      `/ui/audit-export`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  getAuditExport(vaultId: string, jobId: string) {
    return vaultFetch<import("./types").AuditExportJobModel>(
      vaultId,
      `/ui/audit-export/${encodeURIComponent(jobId)}`,
    );
  },

  async fetchAuditExportCSV(vaultId: string, jobId: string): Promise<string> {
    const headers = new Headers();
    headers.set(VAULT_HEADER, vaultId);
    const token = getSessionToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const path = `/ui/audit-export/${encodeURIComponent(jobId)}?download=true`;
    const res = await fetch(path, { headers });
    const text = await res.text();
    if (!res.ok) {
      let message = res.statusText;
      let payload: unknown = null;
      try {
        payload = JSON.parse(text);
        const body = payload as { error?: string };
        if (body.error) message = body.error;
      } catch {
        if (text) {
          message = text;
          payload = { error: text };
        }
      }
      maybeHandleUnauthorized({
        status: res.status,
        body: payload,
        requestPath: path,
        hadSessionToken: Boolean(token),
      });
      throw new HttpError(res.status, message, null);
    }
    return text;
  },

  notificationUnreadCount(vaultId: string) {
    return vaultFetch<import("./types").NotificationUnreadCountResponse>(
      vaultId,
      "/api/v1/notifications/unread-count",
    );
  },

  notifications(vaultId: string, view: "unread" | "all" = "unread", limit = 50) {
    const q = new URLSearchParams();
    if (view === "all") q.set("view", "all");
    if (limit) q.set("limit", String(limit));
    const suffix = q.toString() ? `?${q}` : "";
    return vaultFetch<import("./types").NotificationListResponse>(
      vaultId,
      `/api/v1/notifications${suffix}`,
    );
  },

  markNotificationRead(vaultId: string, notificationId: string) {
    return vaultFetch<{ ok: boolean }>(
      vaultId,
      `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "POST" },
    );
  },

  markAllNotificationsRead(vaultId: string) {
    return vaultFetch<{ ok: boolean }>(
      vaultId,
      "/api/v1/notifications/mark-all-read",
      { method: "POST" },
    );
  },

  dismissNotification(vaultId: string, notificationId: string) {
    return vaultFetch<{ ok: boolean }>(
      vaultId,
      `/api/v1/notifications/${encodeURIComponent(notificationId)}`,
      { method: "DELETE" },
    );
  },

  getDocumentViewerState(vaultId: string, objectApiName: string, recordId: string) {
    return vaultFetch<import("./types").DocumentViewerState>(
      vaultId,
      `/ui/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}/document-viewer`,
    );
  },

  downloadDocumentSource(vaultId: string, objectApiName: string, recordId: string) {
    return vaultFetchBlob(
      vaultId,
      `/api/v1/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}/source`,
    );
  },

  downloadDocumentRendition(vaultId: string, objectApiName: string, recordId: string) {
    return vaultFetchBlob(
      vaultId,
      `/api/v1/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}/rendition`,
    );
  },

  getDocumentPageImage(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      page: number;
      objectApiName: string;
      dpi?: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      n: String(params.page),
      s: params.dpi ?? "150dpi",
      f: "png",
      object: params.objectApiName,
    });
    return vaultFetchBlob(vaultId, `/ui/annotate/makepageimage?${q.toString()}`);
  },

  findDocumentPageText(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      page: number;
      objectApiName: string;
      query: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      n: String(params.page),
      q: params.query,
      object: params.objectApiName,
    });
    return vaultFetch<{
      page: number;
      page_width: number;
      page_height: number;
      boxes: Array<{
        left_pct: number;
        top_pct: number;
        width_pct: number;
        height_pct: number;
      }>;
    }>(vaultId, `/ui/annotate/findpagetext?${q.toString()}`);
  },

  loadDocumentPageWords(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      page: number;
      objectApiName: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      n: String(params.page),
      object: params.objectApiName,
    });
    return vaultFetch<{
      page: number;
      page_width: number;
      page_height: number;
      words: Array<{
        text: string;
        x_min: number;
        y_min: number;
        x_max: number;
        y_max: number;
      }>;
    }>(vaultId, `/ui/annotate/loadWords?${q.toString()}`);
  },

  getDocumentAnnotateMeta(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      object: params.objectApiName,
    });
    return vaultFetch<{
      page_count: number;
      page_width: number;
      page_height: number;
      viewer_type: string;
      image_format: string;
      status?: string;
      payload?: {
        viewerType: string;
        pageInfo: {
          meta: {
            width: number;
            height: number;
            pages: string;
            imageformat: string;
          };
        };
        annotationDataLimits?: {
          noteTextCharacterLimit: number;
          anchorTitleCharacterLimit: number;
        };
      };
    }>(vaultId, `/ui/annotate/getAnnotateMetaInfo?${q.toString()}`);
  },

  loadDocumentNotes(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      object: params.objectApiName,
    });
    return vaultFetch<{
      notes: Array<{
        id: string;
        kind: "note" | "anchor" | "line" | "document_link" | "permalink";
        page: number;
        x_min: number;
        y_min: number;
        x_max: number;
        y_max: number;
        page_width: number;
        page_height: number;
        title: string;
        body: string;
        color: string;
        created_at: string;
        resolved?: boolean;
        placement?: "placed" | "page_level";
        brought_forward?: boolean;
        source_major?: number;
        source_minor?: number;
        link_doc_number?: string;
        link_major?: number;
        link_minor?: number;
        link_record_id?: string;
        link_name?: string;
        link_page?: number;
        link_anchor_id?: string;
        link_anchor_title?: string;
        created_by?: string;
        created_by_name?: string;
        mentioned_user_ids?: string[];
        tags?: string[];
        replies?: Array<{
          id: string;
          annotation_id: string;
          body: string;
          mentioned_user_ids?: string[];
          created_at: string;
          created_by?: string;
          created_by_name?: string;
        }>;
      }>;
      rawnotes: Array<{
        id: string;
        type__sys: string;
        title__sys: string;
        comment__sys: string;
        color__sys: string;
        state__sys: string;
        placemark: {
          type__sys: string;
          page_number__sys: number;
          x_coordinate__sys: number;
          y_coordinate__sys: number;
          width__sys?: number;
          height__sys?: number;
          coordinates__sys?: number[];
          style__sys?: string;
        };
        created_date_time__sys?: string;
      }>;
      claimNames: string[];
      matchTextVariationNames: string[];
      tags: string[];
    }>(vaultId, `/ui/annotate/loadnotes?${q.toString()}`);
  },

  loadDocumentLinksAndAnchors(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName?: string;
    },
  ) {
    const q = new URLSearchParams();
    if (params.objectApiName) {
      q.set("object", params.objectApiName);
    }
    const qs = q.toString();
    return vaultFetch<{
      status: string;
      message: string | null;
      payload: {
        referenceLinks: unknown[];
        anchors: Array<{
          id: string;
          type__sys: string;
          title__sys: string;
          placemark: {
            type__sys: string;
            page_number__sys: number;
            x_coordinate__sys: number;
            y_coordinate__sys: number;
            width__sys?: number;
            height__sys?: number;
          };
        }>;
      };
    }>(
      vaultId,
      `/ui/annotateReferences/linksAndAnchorsInfo/${encodeURIComponent(params.docId)}/${params.major}/${params.minor}${qs ? `?${qs}` : ""}`,
    );
  },

  createDocumentNote(
    vaultId: string,
    body: {
      docId: string;
      major: number;
      minor: number;
      object: string;
      kind?: "note" | "anchor" | "line" | "document_link" | "permalink";
      page: number;
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
      page_width: number;
      page_height: number;
      title?: string;
      body?: string;
      color?: string;
      placement?: "placed" | "page_level";
      link_doc_number?: string;
      link_major?: number;
      link_minor?: number;
      link_record_id?: string;
      link_name?: string;
      link_page?: number;
      link_anchor_id?: string;
      link_anchor_title?: string;
    },
  ) {
    return vaultFetch<{
      id: string;
      kind: "note" | "anchor" | "line" | "document_link" | "permalink";
      page: number;
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
      page_width: number;
      page_height: number;
      title: string;
      body: string;
      color: string;
      created_at: string;
      resolved?: boolean;
      placement?: "placed" | "page_level";
      brought_forward?: boolean;
      source_major?: number;
      source_minor?: number;
      link_doc_number?: string;
      link_major?: number;
      link_minor?: number;
      link_record_id?: string;
      link_name?: string;
      link_page?: number;
      link_anchor_id?: string;
      link_anchor_title?: string;
      created_by?: string;
      created_by_name?: string;
    }>(vaultId, `/ui/annotate/notes`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  searchAnnotationLinkTargets(
    vaultId: string,
    params: { objectApiName?: string; q?: string },
  ) {
    const q = new URLSearchParams();
    if (params.objectApiName) {
      q.set("object", params.objectApiName);
    }
    if (params.q) {
      q.set("q", params.q);
    }
    const qs = q.toString();
    return vaultFetch<{
      candidates: Array<{
        record_id: string;
        document_number: string;
        name: string;
        major: number;
        minor: number;
      }>;
    }>(vaultId, `/ui/annotate/linkTargets${qs ? `?${qs}` : ""}`);
  },

  bringForwardDocumentNotes(
    vaultId: string,
    body: {
      docId: string;
      major: number;
      minor: number;
      object: string;
      include_resolved?: boolean;
    },
  ) {
    return vaultFetch<{
      notes: Array<{
        id: string;
        kind: "note" | "anchor" | "line";
        page: number;
        x_min: number;
        y_min: number;
        x_max: number;
        y_max: number;
        page_width: number;
        page_height: number;
        title: string;
        body: string;
        color: string;
        created_at: string;
        resolved?: boolean;
        placement?: "placed" | "page_level";
        brought_forward?: boolean;
        source_major?: number;
        source_minor?: number;
        created_by?: string;
        created_by_name?: string;
      }>;
      brought_count: number;
      source_major?: number;
      source_minor?: number;
    }>(vaultId, `/ui/annotate/bringForward`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteDocumentNote(
    vaultId: string,
    noteId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      object: params.objectApiName,
    });
    return vaultFetch<void>(vaultId, `/ui/annotate/notes/${encodeURIComponent(noteId)}?${q}`, {
      method: "DELETE",
    });
  },

  createDocumentNoteReply(
    vaultId: string,
    noteId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName: string;
      body: string;
      mentioned_user_ids?: string[];
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      object: params.objectApiName,
    });
    return vaultFetch<{
      id: string;
      annotation_id: string;
      body: string;
      mentioned_user_ids?: string[];
      created_at: string;
      created_by?: string;
      created_by_name?: string;
    }>(vaultId, `/ui/annotate/notes/${encodeURIComponent(noteId)}/replies?${q}`, {
      method: "POST",
      body: JSON.stringify({
        body: params.body,
        mentioned_user_ids: params.mentioned_user_ids ?? [],
      }),
    });
  },

  deleteDocumentNoteReply(
    vaultId: string,
    replyId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      object: params.objectApiName,
    });
    return vaultFetch<void>(vaultId, `/ui/annotate/replies/${encodeURIComponent(replyId)}?${q}`, {
      method: "DELETE",
    });
  },

  listDocumentAnchors(
    vaultId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName?: string;
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
    });
    if (params.objectApiName) {
      q.set("object", params.objectApiName);
    }
    return vaultFetch<{
      anchors: Array<{
        id: string;
        kind: "anchor";
        page: number;
        title: string;
        body: string;
      }>;
    }>(vaultId, `/ui/annotate/anchors?${q}`);
  },

  resolvePermalinkTarget(
    vaultId: string,
    params: { objectApiName?: string; docNumber: string },
  ) {
    const q = new URLSearchParams({ docNumber: params.docNumber });
    if (params.objectApiName) {
      q.set("object", params.objectApiName);
    }
    return vaultFetch<{
      record_id: string;
      document_number: string;
      name: string;
      major: number;
      minor: number;
    }>(vaultId, `/ui/annotate/permalinkTarget?${q}`);
  },

  listDocumentAnnotationTags(vaultId: string) {
    return vaultFetch<{ tags: Array<{ id: string; name: string; created_at: string }> }>(
      vaultId,
      `/ui/annotate/tags`,
    );
  },

  createDocumentAnnotationTag(vaultId: string, name: string) {
    return vaultFetch<{ id: string; name: string; created_at: string }>(vaultId, `/ui/annotate/tags`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  deleteDocumentAnnotationTag(vaultId: string, tagId: string) {
    return vaultFetch<void>(vaultId, `/ui/annotate/tags/${encodeURIComponent(tagId)}`, {
      method: "DELETE",
    });
  },

  updateDocumentNote(
    vaultId: string,
    noteId: string,
    params: {
      docId: string;
      major: number;
      minor: number;
      objectApiName: string;
      title: string;
      body: string;
      color?: string;
      resolved?: boolean;
      tags?: string[];
      mentioned_user_ids?: string[];
    },
  ) {
    const q = new URLSearchParams({
      docId: params.docId,
      major: String(params.major),
      minor: String(params.minor),
      object: params.objectApiName,
    });
    const body: {
      title: string;
      body: string;
      color: string;
      resolved?: boolean;
      tags?: string[];
      mentioned_user_ids?: string[];
    } = {
      title: params.title,
      body: params.body,
      color: params.color ?? "",
    };
    if (typeof params.resolved === "boolean") {
      body.resolved = params.resolved;
    }
    if (params.tags) {
      body.tags = params.tags;
    }
    if (params.mentioned_user_ids) {
      body.mentioned_user_ids = params.mentioned_user_ids;
    }
    return vaultFetch<{
      id: string;
      kind: "note" | "anchor" | "line" | "document_link" | "permalink";
      page: number;
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
      page_width: number;
      page_height: number;
      title: string;
      body: string;
      color: string;
      created_at: string;
      resolved?: boolean;
      placement?: "placed" | "page_level";
      tags?: string[];
      created_by?: string;
      created_by_name?: string;
    }>(vaultId, `/ui/annotate/notes/${encodeURIComponent(noteId)}?${q}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  uploadDocumentSource(
    vaultId: string,
    objectApiName: string,
    recordId: string,
    file: File,
    options?: { bumpVersion?: boolean; viaCheckin?: boolean },
  ) {
    const form = new FormData();
    form.append("file", file);
    if (options?.bumpVersion) {
      form.append("bump_version", "true");
    }
    if (options?.viaCheckin) {
      form.append("via_checkin", "true");
    }
    return vaultFetch<import("./types").DocumentSourceUploadResult>(
      vaultId,
      `/api/v1/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}/source`,
      { method: "POST", body: form },
    );
  },

  getFeishuImportAvailability(vaultId: string) {
    return vaultFetch<import("./types").FeishuImportAvailability>(
      vaultId,
      "/ui/integrations/feishu/import/availability",
    );
  },

  listFeishuImportFiles(
    vaultId: string,
    opts?: { profile_id?: string; folder_token?: string; page_token?: string },
  ) {
    const q = new URLSearchParams();
    if (opts?.profile_id?.trim()) {
      q.set("profile_id", opts.profile_id.trim());
    }
    if (opts?.folder_token?.trim()) {
      q.set("folder_token", opts.folder_token.trim());
    }
    if (opts?.page_token?.trim()) {
      q.set("page_token", opts.page_token.trim());
    }
    const qs = q.toString();
    return vaultFetch<{
      items: import("./types").FeishuBrowsableItem[];
      has_more?: boolean;
      next_page_token?: string;
    }>(vaultId, `/ui/integrations/feishu/import/files${qs ? `?${qs}` : ""}`);
  },

  searchFeishuImportFiles(vaultId: string, opts?: { profile_id?: string; q?: string }) {
    const q = new URLSearchParams();
    if (opts?.profile_id?.trim()) {
      q.set("profile_id", opts.profile_id.trim());
    }
    if (opts?.q?.trim()) {
      q.set("q", opts.q.trim());
    }
    const qs = q.toString();
    return vaultFetch<{ items: import("./types").FeishuBrowsableItem[] }>(
      vaultId,
      `/ui/integrations/feishu/import/search${qs ? `?${qs}` : ""}`,
    );
  },

  startFeishuImportOAuth(vaultId: string, body: { profile_id?: string; return_path: string }) {
    return vaultFetch<{ authorize_url: string }>(
      vaultId,
      "/ui/integrations/feishu/import/oauth/start",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
  },

  revokeFeishuImportAuth(vaultId: string, body?: { profile_id?: string }) {
    return vaultFetch<{ status: string }>(vaultId, "/ui/integrations/feishu/import/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  },

  getFeishuWebComponentSignature(
    vaultId: string,
    body: { profile_id?: string; url: string; nonce_str?: string; timestamp?: number },
  ) {
    return vaultFetch<{
      app_id: string;
      open_id: string;
      signature: string;
      nonce_str: string;
      timestamp: number;
      url: string;
    }>(vaultId, "/ui/integrations/feishu/import/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  importDocumentSourceFromFeishu(
    vaultId: string,
    objectApiName: string,
    recordId: string,
    body: {
      profile_id?: string;
      file_token: string;
      file_type: string;
      title?: string;
      url?: string;
      bump_version?: boolean;
      via_checkin?: boolean;
    },
  ) {
    return vaultFetch<import("./types").DocumentSourceUploadResult>(
      vaultId,
      `/api/v1/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}/source/from-feishu`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  },

  listJobDefinitions(vaultId: string) {
    return vaultFetch<{ items: import("./types").JobDefinitionListItem[] }>(
      vaultId,
      `/ui/operations/job-definitions`,
    );
  },

  getJobDefinition(vaultId: string, apiName: string) {
    return vaultFetch<import("./types").JobDefinitionDetail>(
      vaultId,
      `/ui/operations/job-definitions/${encodeURIComponent(apiName)}`,
    );
  },

  createJobDefinition(vaultId: string, body: import("./types").JobDefinitionWrite) {
    return vaultFetch<import("./types").JobDefinitionDetail>(
      vaultId,
      `/ui/operations/job-definitions`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  updateJobDefinition(vaultId: string, apiName: string, body: import("./types").JobDefinitionWrite) {
    return vaultFetch<import("./types").JobDefinitionDetail>(
      vaultId,
      `/ui/operations/job-definitions/${encodeURIComponent(apiName)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  beginEditJobDefinition(vaultId: string, apiName: string) {
    return vaultFetch<import("./types").JobDefinitionDetail>(
      vaultId,
      `/ui/operations/job-definitions/${encodeURIComponent(apiName)}/begin-edit`,
      { method: "POST", body: "{}" },
    );
  },

  setJobDefinitionStatus(vaultId: string, apiName: string, status: string) {
    return vaultFetch<import("./types").JobDefinitionDetail>(
      vaultId,
      `/ui/operations/job-definitions/${encodeURIComponent(apiName)}/status`,
      { method: "POST", body: JSON.stringify({ status }) },
    );
  },

  deleteJobDefinition(vaultId: string, apiName: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/operations/job-definitions/${encodeURIComponent(apiName)}`,
      { method: "DELETE" },
    );
  },

  jobStatusBoard(vaultId: string) {
    return vaultFetch<import("./types").JobStatusBoard>(
      vaultId,
      `/ui/operations/job-status`,
    );
  },

  startJobNow(vaultId: string, id: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/operations/job-status/${encodeURIComponent(id)}/start-now`,
      { method: "POST", body: "{}" },
    );
  },

  cancelJobInstance(vaultId: string, id: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/operations/job-status/${encodeURIComponent(id)}/cancel`,
      { method: "POST", body: "{}" },
    );
  },

  downloadJobLog(vaultId: string, id: string) {
    return vaultFetchBlob(
      vaultId,
      `/ui/operations/job-status/${encodeURIComponent(id)}/log`,
    );
  },

  makeJobInactive(vaultId: string, id: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/operations/job-status/${encodeURIComponent(id)}/make-inactive`,
      { method: "POST", body: "{}" },
    );
  },

  listJobQueues(vaultId: string) {
    return vaultFetch<{ items: import("./types").JobQueueListItem[] }>(
      vaultId,
      `/ui/operations/job-queues`,
    );
  },

  getJobQueue(vaultId: string, apiName: string) {
    return vaultFetch<import("./types").JobQueueDetail>(
      vaultId,
      `/ui/operations/job-queues/${encodeURIComponent(apiName)}`,
    );
  },

  updateJobQueue(vaultId: string, apiName: string, body: import("./types").JobQueueWrite) {
    return vaultFetch<import("./types").JobQueueDetail>(
      vaultId,
      `/ui/operations/job-queues/${encodeURIComponent(apiName)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  listJobMetadata(vaultId: string) {
    return vaultFetch<{ items: import("./types").JobMetadataListItem[] }>(
      vaultId,
      `/ui/operations/job-metadata`,
    );
  },

  getJobMetadata(vaultId: string, apiName: string) {
    return vaultFetch<import("./types").JobMetadataDetail>(
      vaultId,
      `/ui/operations/job-metadata/${encodeURIComponent(apiName)}`,
    );
  },

  createJobMetadata(vaultId: string, body: import("./types").JobMetadataWrite) {
    return vaultFetch<import("./types").JobMetadataDetail>(
      vaultId,
      `/ui/operations/job-metadata`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  updateJobMetadata(vaultId: string, apiName: string, body: import("./types").JobMetadataWrite) {
    return vaultFetch<import("./types").JobMetadataDetail>(
      vaultId,
      `/ui/operations/job-metadata/${encodeURIComponent(apiName)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  deleteJobMetadata(vaultId: string, apiName: string) {
    return vaultFetch<void>(
      vaultId,
      `/ui/operations/job-metadata/${encodeURIComponent(apiName)}`,
      { method: "DELETE" },
    );
  },

  listEmailNotificationStatus(
    vaultId: string,
    query: import("./types").EmailNotificationStatusQuery = {},
  ) {
    const q = new URLSearchParams();
    if (query.send_from) q.set("send_from", query.send_from);
    if (query.send_to) q.set("send_to", query.send_to);
    if (query.email) q.set("email", query.email);
    if (query.status) q.set("status", query.status);
    if (query.limit != null) q.set("limit", String(query.limit));
    if (query.offset != null) q.set("offset", String(query.offset));
    const qs = q.toString();
    return vaultFetch<import("./types").EmailNotificationStatusList>(
      vaultId,
      `/ui/operations/email-notification-status${qs ? `?${qs}` : ""}`,
    );
  },

  exportEmailNotificationStatus(
    vaultId: string,
    query: import("./types").EmailNotificationStatusQuery = {},
  ) {
    const q = new URLSearchParams();
    if (query.send_from) q.set("send_from", query.send_from);
    if (query.send_to) q.set("send_to", query.send_to);
    if (query.email) q.set("email", query.email);
    if (query.status) q.set("status", query.status);
    const qs = q.toString();
    return vaultFetchBlob(
      vaultId,
      `/ui/operations/email-notification-status/export${qs ? `?${qs}` : ""}`,
    );
  },

  listEmailSuppression(vaultId: string, query: import("./types").EmailSuppressionQuery = {}) {
    const q = new URLSearchParams();
    if (query.q) q.set("q", query.q);
    if (query.limit != null) q.set("limit", String(query.limit));
    if (query.offset != null) q.set("offset", String(query.offset));
    const qs = q.toString();
    return vaultFetch<import("./types").EmailSuppressionList>(
      vaultId,
      `/ui/operations/email-suppression-list${qs ? `?${qs}` : ""}`,
    );
  },

  deleteEmailSuppression(vaultId: string, ids: string[]) {
    return vaultFetch<import("./types").EmailSuppressionDeleteResult>(
      vaultId,
      `/ui/operations/email-suppression-list`,
      { method: "DELETE", body: JSON.stringify({ ids }) },
    );
  },

  vaultAIChatActions(vaultId: string, objectName: string, recordId: string) {
    const q = new URLSearchParams({
      object: objectName,
      record_id: recordId,
    });
    return vaultFetch<{
      availability: {
        enabled: boolean;
        reason?: string;
        auto_switch_conversation?: boolean;
      };
      actions: Array<{
        agent_name: string;
        agent_label: string;
        name: string;
        label: string;
        description?: string;
      }>;
    }>(vaultId, `/ui/vault-ai/chat/actions?${q.toString()}`);
  },

  vaultAIChatListConversations(vaultId: string, objectName?: string, recordId?: string) {
    const q = new URLSearchParams();
    if (objectName) q.set("object", objectName);
    if (recordId) q.set("record_id", recordId);
    const qs = q.toString();
    return vaultFetch<{
      items: Array<{
        id: string;
        title: string;
        object_name: string;
        record_id: string;
        last_message_at: string;
      }>;
    }>(vaultId, `/ui/vault-ai/chat/conversations${qs ? `?${qs}` : ""}`);
  },

  vaultAIChatCreateConversation(
    vaultId: string,
    body: { object: string; record_id: string },
  ) {
    return vaultFetch<{
      id: string;
      title: string;
      object_name: string;
      record_id: string;
    }>(vaultId, `/ui/vault-ai/chat/conversations`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  vaultAIChatGetConversation(vaultId: string, conversationId: string) {
    return vaultFetch<{
      conversation: {
        id: string;
        title: string;
        object_name: string;
        record_id: string;
        trace_status?: string;
        trace_action_count?: number;
      };
      messages: Array<{
        id: string;
        role: string;
        content: string;
        action_name?: string;
        agent_name?: string;
        status?: string;
        token_usage?: {
          ask_user?: {
            question: string;
            style: string;
            options?: string[];
            allow_other?: boolean;
          };
          [key: string]: unknown;
        };
      }>;
    }>(vaultId, `/ui/vault-ai/chat/conversations/${conversationId}`);
  },

  vaultAIChatCancel(vaultId: string, conversationId: string) {
    return vaultFetch<{ cancelled: boolean }>(
      vaultId,
      `/ui/vault-ai/chat/conversations/${conversationId}/cancel`,
      { method: "POST", body: "{}" },
    );
  },

  vaultAIChatSetTrace(vaultId: string, conversationId: string, enabled: boolean) {
    return vaultFetch<{
      id: string;
      title: string;
      object_name: string;
      record_id: string;
      trace_status?: string;
      trace_action_count?: number;
    }>(vaultId, `/ui/vault-ai/chat/conversations/${conversationId}/trace`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  },

  vaultAIChatGetTrace(vaultId: string, conversationId: string) {
    return vaultFetch<{
      conversation_id: string;
      status: string;
      max_actions: number;
      action_count: number;
      actions: unknown[];
    }>(vaultId, `/ui/vault-ai/chat/conversations/${conversationId}/trace`);
  },

  async vaultAIChatSendMessageStream(
    vaultId: string,
    conversationId: string,
    body: { message?: string; agent_name?: string; action_name?: string },
    handlers: {
      onDelta?: (content: string) => void;
      onProgress?: (stage: string) => void;
      onSelectAction?: (payload: {
        prompt?: string;
        actions?: Array<{
          agent_name: string;
          agent_label: string;
          name: string;
          label: string;
          description?: string;
        }>;
        user_message?: {
          id: string;
          role: string;
          content: string;
          status?: string;
        };
        assistant_message?: {
          id: string;
          role: string;
          content: string;
          status?: string;
        };
      }) => void;
      onAskUser?: (payload: {
        ask_user: {
          question: string;
          style: string;
          options?: string[];
          allow_other?: boolean;
        };
        user_message?: {
          id: string;
          role: string;
          content: string;
          action_name?: string;
          agent_name?: string;
          status?: string;
        };
        assistant_message?: {
          id: string;
          role: string;
          content: string;
          action_name?: string;
          agent_name?: string;
          status?: string;
        };
        agent_name?: string;
        action_name?: string;
      }) => void;
      onDone?: (payload: {
        user_message: {
          id: string;
          role: string;
          content: string;
          action_name?: string;
          agent_name?: string;
          status?: string;
        };
        assistant_message: {
          id: string;
          role: string;
          content: string;
          action_name?: string;
          agent_name?: string;
          status?: string;
        };
        select_actions?: Array<{
          agent_name: string;
          agent_label: string;
          name: string;
          label: string;
          description?: string;
        }>;
        ask_user?: {
          question: string;
          style: string;
          options?: string[];
          allow_other?: boolean;
        };
        agent_name?: string;
        action_name?: string;
      }) => void;
      onCancelled?: (payload: {
        user_message?: {
          id: string;
          role: string;
          content: string;
          status?: string;
        };
        assistant_message?: {
          id: string;
          role: string;
          content: string;
          status?: string;
        };
      }) => void;
      onError?: (message: string) => void;
    },
  ) {
    const res = await vaultFetchRaw(
      vaultId,
      `/ui/vault-ai/chat/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify(body) },
    );
    if (!res.body) {
      throw new HttpError(500, "empty stream body", null);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventName = "message";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          const raw = line.slice(5).trim();
          try {
            const data = JSON.parse(raw) as Record<string, unknown>;
            if (eventName === "delta" && typeof data.content === "string") {
              handlers.onDelta?.(data.content);
            } else if (eventName === "progress" && typeof data.stage === "string") {
              handlers.onProgress?.(data.stage);
            } else if (eventName === "select_action") {
              handlers.onSelectAction?.(data as Parameters<NonNullable<typeof handlers.onSelectAction>>[0]);
            } else if (eventName === "ask_user") {
              handlers.onAskUser?.(data as Parameters<NonNullable<typeof handlers.onAskUser>>[0]);
            } else if (eventName === "done") {
              handlers.onDone?.(data as Parameters<NonNullable<typeof handlers.onDone>>[0]);
            } else if (eventName === "cancelled") {
              handlers.onCancelled?.(data as Parameters<NonNullable<typeof handlers.onCancelled>>[0]);
            } else if (eventName === "error") {
              handlers.onError?.(String(data.error ?? "stream error"));
            }
          } catch {
            /* ignore malformed chunk */
          }
          eventName = "message";
        }
      }
    }
  },

  /** @deprecated Prefer conversation + stream APIs */
  vaultAIChatExecute(
    vaultId: string,
    body: {
      object: string;
      record_id: string;
      agent_name?: string;
      action_name: string;
      message?: string;
    },
  ) {
    return vaultFetch<{
      content: string;
      model?: string;
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      agent_name: string;
      action_name: string;
    }>(vaultId, `/ui/vault-ai/chat/execute`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  vaultAITabActions(vaultId: string) {
    return vaultFetch<{
      availability: {
        enabled: boolean;
        reason?: string;
        auto_switch_conversation?: boolean;
      };
      actions: Array<{
        agent_name: string;
        agent_label: string;
        name: string;
        label: string;
        description?: string;
      }>;
    }>(vaultId, `/ui/vault-ai/tab/actions`);
  },

  vaultAITabListConversations(vaultId: string, opts?: { pool?: "history" }) {
    const q = opts?.pool === "history" ? "?pool=history" : "";
    return vaultFetch<{
      items: Array<{
        id: string;
        title: string;
        object_name: string;
        record_id: string;
        surface?: string;
        last_message_at: string;
      }>;
    }>(vaultId, `/ui/vault-ai/tab/conversations${q}`);
  },

  vaultAITabCreateConversation(vaultId: string) {
    return vaultFetch<{
      id: string;
      title: string;
      object_name: string;
      record_id: string;
      surface?: string;
    }>(vaultId, `/ui/vault-ai/tab/conversations`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  vaultAITabGetConversation(vaultId: string, conversationId: string) {
    return vaultFetch<{
      conversation: {
        id: string;
        title: string;
        object_name: string;
        record_id: string;
        surface?: string;
        last_message_at: string;
      };
      messages: Array<{
        id: string;
        role: string;
        content: string;
        action_name?: string;
        agent_name?: string;
        status?: string;
      }>;
      canvases: Array<{
        id: string;
        vql: string;
        status: string;
        clarify_prompt?: string;
        result?: {
          object?: string;
          rows?: Array<Record<string, unknown>>;
          row_count?: number;
          total?: number;
          truncated?: boolean;
          vql?: string;
          error?: string;
        };
        feedback?: string;
        created_at: string;
      }>;
    }>(vaultId, `/ui/vault-ai/tab/conversations/${conversationId}`);
  },

  vaultAITabCancel(vaultId: string, conversationId: string) {
    return vaultFetch<{ status: string }>(
      vaultId,
      `/ui/vault-ai/tab/conversations/${conversationId}/cancel`,
      { method: "POST", body: "{}" },
    );
  },

  vaultAITabQueryApprove(vaultId: string, canvasId: string, approve: boolean) {
    return vaultFetch<{
      canvas: {
        id: string;
        vql: string;
        status: string;
        result?: Record<string, unknown>;
        feedback?: string;
      };
      assistant_message?: {
        id: string;
        role: string;
        content: string;
        action_name?: string;
        agent_name?: string;
        status?: string;
      };
    }>(vaultId, `/ui/vault-ai/tab/query/${canvasId}/approve`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    });
  },

  vaultAITabQueryFeedback(vaultId: string, canvasId: string, feedback: "up" | "down") {
    return vaultFetch<{
      id: string;
      feedback?: string;
      status: string;
    }>(vaultId, `/ui/vault-ai/tab/query/${canvasId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  },

  async vaultAITabSendMessageStream(
    vaultId: string,
    conversationId: string,
    body: { message?: string; agent_name?: string; action_name?: string },
    handlers: {
      onDelta?: (content: string) => void;
      onProgress?: (stage: string) => void;
      onSelectAction?: (payload: {
        prompt?: string;
        actions?: Array<{
          agent_name: string;
          agent_label: string;
          name: string;
          label: string;
          description?: string;
        }>;
      }) => void;
      onDone?: (payload: {
        user_message: { id: string; role: string; content: string; status?: string };
        assistant_message: { id: string; role: string; content: string; status?: string };
        agent_name?: string;
        action_name?: string;
        canvas?: {
          id: string;
          vql: string;
          status: string;
          message_id?: string;
          clarify_prompt?: string;
          result?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        select_actions?: Array<{
          agent_name: string;
          agent_label: string;
          name: string;
          label: string;
        }>;
      }) => void;
      onCancelled?: () => void;
      onError?: (message: string) => void;
    },
  ) {
    const res = await vaultFetchRaw(
      vaultId,
      `/ui/vault-ai/tab/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify(body) },
    );
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      handlers.onError?.(text || `HTTP ${res.status}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventName = "message";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const lines = part.split("\n");
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(data) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (eventName === "delta" && typeof payload.content === "string") {
          handlers.onDelta?.(payload.content);
        } else if (eventName === "progress" && typeof payload.stage === "string") {
          handlers.onProgress?.(payload.stage);
        } else if (eventName === "select_action") {
          handlers.onSelectAction?.(payload as never);
        } else if (eventName === "done") {
          handlers.onDone?.(payload as never);
        } else if (eventName === "cancelled") {
          handlers.onCancelled?.();
        } else if (eventName === "error") {
          handlers.onError?.(String(payload.error ?? "error"));
        }
        eventName = "message";
      }
    }
  },

  listOutboundPackages(vaultId: string) {
    return vaultFetch<{ items: import("./types").OutboundPackageListItem[] }>(
      vaultId,
      `/ui/deployment/outbound-packages`,
    );
  },

  exportOutboundPackage(
    vaultId: string,
    body: { name: string; summary?: string; components: string[] },
  ) {
    return vaultFetch<import("./types").OutboundPackageExportResult>(
      vaultId,
      `/ui/deployment/outbound-packages/export`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  exportOutboundPackageFromRecord(
    vaultId: string,
    recordId: string,
    body?: { name?: string; summary?: string },
  ) {
    return vaultFetch<import("./types").OutboundPackageExportJobResult>(
      vaultId,
      `/ui/deployment/outbound-packages/records/${encodeURIComponent(recordId)}/export`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    );
  },

  listOutboundPackageDependencies(vaultId: string, recordId: string) {
    return vaultFetch<import("./types").OutboundDependenciesResult>(
      vaultId,
      `/ui/deployment/outbound-packages/records/${encodeURIComponent(recordId)}/dependencies`,
    );
  },

  addOutboundPackageDependencies(
    vaultId: string,
    recordId: string,
    vaultComponentIds: string[],
  ) {
    return vaultFetch<{ added_count: number }>(
      vaultId,
      `/ui/deployment/outbound-packages/records/${encodeURIComponent(recordId)}/dependencies`,
      {
        method: "POST",
        body: JSON.stringify({ vault_component_ids: vaultComponentIds }),
      },
    );
  },

  downloadOutboundPackageArtifact(vaultId: string, id: string) {
    return vaultFetchBlob(
      vaultId,
      `/ui/deployment/outbound-packages/${encodeURIComponent(id)}/artifact`,
    );
  },

  listInboundPackages(vaultId: string) {
    return vaultFetch<{ items: import("./types").InboundPackageListItem[] }>(
      vaultId,
      `/ui/deployment/inbound-packages`,
    );
  },

  importInboundPackage(vaultId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return vaultFetch<{
      id: string;
      om_record_id?: string;
      name: string;
      package_type: string;
      step_count: number;
      payload_sha256: string;
    }>(vaultId, `/ui/deployment/inbound-packages/import`, {
      method: "POST",
      body: form,
    });
  },

  getInboundPackage(vaultId: string, id: string) {
    return vaultFetch<import("./types").InboundPackageDetail>(
      vaultId,
      `/ui/deployment/inbound-packages/${encodeURIComponent(id)}`,
    );
  },

  resolveInboundPackageCFGId(vaultId: string, recordId: string) {
    return vaultFetch<{ id: string }>(
      vaultId,
      `/ui/deployment/inbound-packages/records/${encodeURIComponent(recordId)}/cfg-id`,
    );
  },

  validateInboundPackage(vaultId: string, id: string) {
    return vaultFetch<import("./types").InboundPackageDetail>(
      vaultId,
      `/ui/deployment/inbound-packages/${encodeURIComponent(id)}/validate`,
      { method: "POST", body: "{}" },
    );
  },

  validateInboundPackageFromRecord(vaultId: string, recordId: string) {
    return vaultFetch<import("./types").InboundPackageDetail>(
      vaultId,
      `/ui/deployment/inbound-packages/records/${encodeURIComponent(recordId)}/validate`,
      { method: "POST", body: "{}" },
    );
  },

  excludeInboundPackageSteps(vaultId: string, id: string, stepIds: string[]) {
    return vaultFetch<import("./types").InboundPackageDetail>(
      vaultId,
      `/ui/deployment/inbound-packages/${encodeURIComponent(id)}/exclude-steps`,
      { method: "POST", body: JSON.stringify({ step_ids: stepIds }) },
    );
  },

  reorderInboundPackageSteps(
    vaultId: string,
    id: string,
    steps: { step_id: string; review_order: number }[],
  ) {
    return vaultFetch<import("./types").InboundPackageDetail>(
      vaultId,
      `/ui/deployment/inbound-packages/${encodeURIComponent(id)}/reorder-steps`,
      { method: "POST", body: JSON.stringify({ steps }) },
    );
  },

  getInboundPackageStepReview(vaultId: string, id: string, stepId: string) {
    return vaultFetch<import("./types").InboundStepReviewDetail>(
      vaultId,
      `/ui/deployment/inbound-packages/${encodeURIComponent(id)}/steps/${encodeURIComponent(stepId)}/review`,
    );
  },

  deployInboundPackage(vaultId: string, id: string, body: { resume?: boolean; reason?: string } = {}) {
    return vaultFetch<import("./types").InboundPackageDeployResult>(
      vaultId,
      `/ui/deployment/inbound-packages/${encodeURIComponent(id)}/deploy`,
      {
        method: "POST",
        body: JSON.stringify({ resume: body.resume ?? false, reason: body.reason ?? "" }),
      },
    );
  },
};

function serializeFacetFiltersParam(filters?: FacetFilters): string | undefined {
  return serializeFacetFilters(filters ?? {});
}
