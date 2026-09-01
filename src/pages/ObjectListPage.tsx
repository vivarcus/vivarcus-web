import { Alert, Button, Modal, Spin, message } from "antd";
import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  StarOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type { LifecycleAction, ListGridPreferences, ObjectListFacetModel, RelatedRowActions, ViewOption } from "../api/types";
import { AdminObjectListToolbar } from "../components/AdminObjectListToolbar";
import { EditColumnsDialog } from "../components/EditColumnsDialog";
import { EditDisplayFiltersDialog } from "../components/EditDisplayFiltersDialog";
import { EditViewsDialog } from "../components/EditViewsDialog";
import {
  FacetFilterPanel,
  hasFacetFilters,
  parseFacetFilters,
  serializeFacetFilters,
} from "../components/FacetFilterPanel";
import { ListGridMenuItems } from "../components/ListGridMenuItems";
import { SaveViewNameDialog } from "../components/SaveViewNameDialog";
import { SavedViewActionsMenu, type SavedViewAction } from "../components/SavedViewActionsMenu";
import { useUi } from "../context/UiContext";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { useTabListActionsPublisher } from "../context/TabListActionsContext";
import { useObjectListState } from "../hooks/useObjectListState";
import { tabListActionsFromObjectList } from "../hooks/useTabListActions";
import { handleStaleError } from "../lib/staleGuard";
import { displayText, displayTextTemplate, defaultPageActionLabels, defaultRelatedChrome, defaultWorkflowChrome } from "../lib/i18n";
import {
  BUSINESS_ADMIN_OBJECTS_ENTRY_CONTEXT,
  rememberBusinessAdminObject,
} from "../lib/businessAdminObjects";
import { findTabInNav } from "../lib/navObjects";
import { primaryNavTab } from "../lib/navTabUtils";
import { formatActiveFacetSelections } from "../lib/facetActiveFilters";
import { facetFiltersToVQL, savedViewCriteria } from "../lib/facetFiltersToVQL";
import {
  getHiddenSidebarViewIds,
  hideSidebarView,
} from "../lib/sidebarViewPreferences";
import { DataTable } from "../components/DataTable";
import { ListActionsMenu } from "../components/ListActionsMenu";
import { ListCreateButton } from "../components/ListCreateButton";
import { ListPagination } from "../components/ListPagination";
import { PreExecutionDialogModal } from "../components/PreExecutionDialogModal";
import { LazyRecordRowActionMenu } from "../components/record/LazyRecordRowActionMenu";
import { rowHasRecordActions } from "../components/record/RecordRowActionMenu";
import { recordEditHref } from "../lib/recordEditHref";
import { DocumentViewerPanel } from "../components/record/DocumentViewerPanel";
import { WorkflowStartModal } from "../components/WorkflowStartModal";
import { StartWorkflowPickerModal } from "../components/StartWorkflowPickerModal";
import { useRecordLifecycleActions } from "../hooks/useRecordLifecycleActions";
import { saveLastTab, type ListRecordNavContext } from "../lib/vaultNav";
import {
  OBJECT_LIST_PAGE_SIZE_OPTIONS,
  type ObjectListQuery,
} from "../lib/objectListPage";
import { MAX_WORKFLOW_ENVELOPE_RECORDS } from "../lib/workflowTask";

export type ObjectListPageProps = {
  /** Defaults to Object Tab entry. Business Admin reuses the same list chrome. */
  entry?: "object_tab" | "business_admin";
  /** Required when entry is business_admin. */
  objectApiName?: string;
  /**
   * Admin console embedding (Users & Groups style): no Views/Filters sidebar;
   * view select + search live in the toolbar.
   */
  listChrome?: "default" | "admin";
  /** Rendered before Create in admin toolbar (e.g. Inbound Import). */
  toolbarLeading?: ReactNode;
  /** When true, omit the standard + Create control (e.g. Inbound Packages are Import-only). */
  hideCreate?: boolean;
};

function viewIcon(viewId: string): ReactNode {
  switch (viewId) {
    case "all":
      return <FileTextOutlined />;
    case "recent":
      return <ClockCircleOutlined />;
    case "favorites":
      return <StarOutlined />;
    default:
      return <UnorderedListOutlined />;
  }
}

function renderViewItems(
  views: ViewOption[],
  selectedView: string,
  total: number,
  onSelect: (viewId: string) => void,
  chrome: import("../lib/i18n/chromeTypes").ListChrome,
) {
  return views.map((v) => (
    <Button
      key={v.id}
      type="text"
      role="tab"
      aria-selected={selectedView === v.id}
      className={`view-tab${selectedView === v.id ? " view-tab--active" : ""}`}
      onClick={() => onSelect(v.id)}
    >
      <span className="view-tab__icon" aria-hidden>
        {viewIcon(v.id)}
      </span>
      <span className="view-tab__label">{displayText(v.label, v.id)}</span>
      <span className="view-tab__meta">
        {v.is_personal_default && (
          <span className="view-tab__badge" title={displayText(chrome.personal_default_badge)}>
            ★
          </span>
        )}
        {selectedView === v.id && total >= 0 && (
          <span className="view-tab__count">{total}</span>
        )}
      </span>
    </Button>
  ));
}

/**
 * Object list route entry. Remounts when the tab/object scope changes so facet
 * filters and other list state cannot leak across SPA tab navigations (same
 * route component is reused for `tabs/:tabApiName`).
 */
export function ObjectListPage(props: ObjectListPageProps = {}) {
  const { tabApiName: routeTabApiName } = useParams();
  const isBusinessAdmin = props.entry === "business_admin";
  const listKey = (isBusinessAdmin ? props.objectApiName : routeTabApiName) ?? "";
  return <ObjectListPageInner key={listKey} {...props} />;
}

function ObjectListPageInner({
  entry = "object_tab",
  objectApiName,
  listChrome = "default",
  toolbarLeading,
  hideCreate = false,
}: ObjectListPageProps = {}) {
  const vaultId = useVaultId();
  const { tabApiName: routeTabApiName } = useParams();
  const isBusinessAdmin = entry === "business_admin";
  const isAdminChrome = listChrome === "admin";
  const listKey = isBusinessAdmin ? objectApiName : routeTabApiName;
  /** Tab API name for Object Tab saved-view APIs; BA uses object name as preference scope key. */
  const tabApiName = isBusinessAdmin ? undefined : routeTabApiName;
  const preferenceScopeKey = listKey;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { shell } = useUi();
  // Prefer shell NavigationProvider — avoid a second GET /ui/navigation per list tab.
  const shellNav = useOptionalNavigationContext()?.nav ?? null;
  const nav = isBusinessAdmin ? null : shellNav;
  const [editColumnsOpen, setEditColumnsOpen] = useState(false);
  const [editFiltersOpen, setEditFiltersOpen] = useState(false);
  const [editViewsOpen, setEditViewsOpen] = useState(false);
  const [saveViewDialog, setSaveViewDialog] = useState<
    | null
    | {
        mode: "create" | "rename";
        viewId?: string;
        initialName?: string;
      }
  >(null);
  const [saveViewPending, setSaveViewPending] = useState(false);
  const [saveViewError, setSaveViewError] = useState<string | null>(null);
  const [hiddenSidebarViews, setHiddenSidebarViews] = useState<Set<string>>(() => new Set());
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [startablePicker, setStartablePicker] = useState<{
    actions: LifecycleAction[];
    recordIds: string[];
  } | null>(null);
  const [startablePending, setStartablePending] = useState(false);
  const [facetModel, setFacetModel] = useState<ObjectListFacetModel | null>(null);
  const [facetLoading, setFacetLoading] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthSaveTimerRef = useRef<number | null>(null);
  const { publish: publishTabListActions, clear: clearTabListActions } =
    useTabListActionsPublisher();

  const navigationContext = useMemo(() => {
    if (isBusinessAdmin) {
      return BUSINESS_ADMIN_OBJECTS_ENTRY_CONTEXT;
    }
    if (!nav || !tabApiName) return "all";
    return findTabInNav(nav, tabApiName)?.navigation_context?.trim() || "all";
  }, [isBusinessAdmin, nav, tabApiName]);

  useEffect(() => {
    if (isBusinessAdmin || !nav || !tabApiName) return;
    const tabMeta = findTabInNav(nav, tabApiName);
    if (!tabMeta || tabMeta.kind === "object") return;
    const target = primaryNavTab(tabMeta);
    if (target.api_name !== tabApiName) {
      const suffix = searchParams.toString();
      navigate(
        `/tabs/${encodeURIComponent(target.api_name)}${suffix ? `?${suffix}` : ""}`,
        { replace: true },
      );
    }
  }, [isBusinessAdmin, nav, tabApiName, navigate, searchParams]);

  const facetFiltersParam = searchParams.get("facet_filters") ?? "";
  const initialQueryParam = searchParams.get("q") ?? "";

  const initialFilter = useMemo(() => {
    const facetFilters = parseFacetFilters(facetFiltersParam || null);
    const filter = initialQueryParam.trim();
    return {
      filter: filter || undefined,
      facetFilters,
      facetFiltersKey: serializeFacetFilters(facetFilters) ?? "",
    };
  }, [facetFiltersParam, initialQueryParam]);

  const fetchList = useCallback(
    async (query: ObjectListQuery) => {
      if (!vaultId || !listKey) {
        throw new Error(isBusinessAdmin ? "Missing vault or object" : "Missing vault or tab");
      }
      if (isBusinessAdmin) {
        return api.businessAdminObjectList(vaultId, listKey, {
          view: query.view,
          navigationContext,
          pageSize: query.pageSize,
          pageToken: query.pageToken,
          sortBy: query.sortBy,
          sortDir: query.sortDir,
          filter: query.filter,
          facetFilters: query.facetFilters,
        });
      }
      return api.objectList(vaultId, listKey, {
        view: query.view,
        navigationContext,
        pageSize: query.pageSize,
        pageToken: query.pageToken,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        filter: query.filter,
        facetFilters: query.facetFilters,
      });
    },
    [vaultId, listKey, isBusinessAdmin, navigationContext],
  );

  const onFetchError = useCallback(
    async (
      err: unknown,
      retry: () => Promise<void>,
      setErrorMessage: (message: string | null) => void,
    ) => {
      await handleStaleError(
        err,
        retry,
        (message) => setErrorMessage(message),
        displayText(shell.load_failed),
        shell,
      );
    },
    [shell],
  );

  const persistView = useCallback(
    async (viewId: string) => {
      if (!vaultId || !listKey) return;
      if (isBusinessAdmin) {
        await api.saveBusinessAdminObjectListView(vaultId, listKey, {
          view_id: viewId,
          navigation_context: navigationContext,
        });
        return;
      }
      await api.saveObjectListView(vaultId, listKey, {
        view_id: viewId,
        navigation_context: navigationContext,
      });
    },
    [vaultId, listKey, isBusinessAdmin, navigationContext],
  );

  const {
    model,
    loading,
    error,
    setError,
    chrome,
    pageSize,
    setPageSize,
    sortBy,
    sortDir,
    facetFilters,
    setFacetFieldFilter,
    clearFacetField,
    pagination,
    canGoPrevious,
    selectView,
    clearFilter,
    clearKeywordFilter,
    filter,
    filterDraft,
    setFilterDraft,
    toggleSort,
    goPreviousPage,
    goNextPage,
    goToPage,
    reload,
  } = useObjectListState({
    scopeKey: listKey,
    vaultId,
    initialFilter,
    debounceKeywordMs: isAdminChrome ? 300 : undefined,
    fetchList,
    onFetchError,
    persistView,
  });

  const {
    lifecyclePending,
    workflowDialogAction,
    preExecutionDialog,
    preExecutionActionLabel,
    preExecutionActionName,
    preExecutionActionKind,
    dialogTarget,
    workflowFieldValues,
    workflowParticipantValues,
    workflowDateValues,
    workflowAssignmentTypeValues,
    preExecutionInputValues,
    setWorkflowFieldValues,
    setWorkflowParticipantValues,
    setWorkflowDateValues,
    setWorkflowAssignmentTypeValues,
    setPreExecutionInputValues,
    handleRowLifecycleAction,
    handleRowSdkAction,
    documentUploadRequest,
    clearDocumentUploadRequest,
    completeDocumentUpload,
    confirmWorkflowDialog,
    confirmPreExecutionDialog,
    cancelActionDialog,
    isRowLifecycleBusy,
  } = useRecordLifecycleActions({
    vaultId,
    actionFailedLabel: displayText(shell.action_failed),
    onReload: reload,
    setError,
    onAfterSuccess: async () => {
      await reload();
    },
  });

  const startSelectedWorkflow = useCallback(
    async (recordIds: string[]) => {
      if (!vaultId || !model || recordIds.length === 0 || startablePending) {
        return;
      }
      if (recordIds.length > MAX_WORKFLOW_ENVELOPE_RECORDS) {
        message.warning(displayText(defaultWorkflowChrome.start_workflow_limit));
        return;
      }
      setStartablePending(true);
      setError(null);
      try {
        const res = await api.listStartableWorkflows(vaultId, model.object_api_name, recordIds);
        const actions = res.actions ?? [];
        if (actions.length === 0) {
          message.warning(displayText(defaultWorkflowChrome.start_workflow_none));
          return;
        }
        if (actions.length === 1) {
          await handleRowLifecycleAction(model.object_api_name, recordIds[0], actions[0], {
            recordIds,
          });
          return;
        }
        setStartablePicker({ actions, recordIds });
      } catch (err) {
        setError(err instanceof Error ? err.message : displayText(shell.action_failed));
      } finally {
        setStartablePending(false);
      }
    },
    [vaultId, model, startablePending, setError, shell.action_failed, handleRowLifecycleAction],
  );

  useEffect(() => {
    if (isBusinessAdmin) {
      if (vaultId && objectApiName) {
        rememberBusinessAdminObject(vaultId, objectApiName);
      }
      return;
    }
    if (vaultId && tabApiName) {
      saveLastTab(vaultId, tabApiName);
    }
  }, [isBusinessAdmin, vaultId, tabApiName, objectApiName]);

  useEffect(() => {
    setFavoriteOverrides({});
  }, [model?.list_context_fingerprint]);

  useEffect(() => {
    setColumnWidths(model?.grid_preferences?.column_widths ?? {});
  }, [model?.list_context_fingerprint]);

  useEffect(
    () => () => {
      if (columnWidthSaveTimerRef.current != null) {
        window.clearTimeout(columnWidthSaveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!vaultId || !preferenceScopeKey) {
      setHiddenSidebarViews(new Set());
      return;
    }
    setHiddenSidebarViews(getHiddenSidebarViewIds(vaultId, preferenceScopeKey, navigationContext));
  }, [vaultId, preferenceScopeKey, navigationContext, model?.list_context_fingerprint]);

  useEffect(() => {
    if (!vaultId || !listKey || isAdminChrome) {
      setFacetModel(null);
      return;
    }
    // Wait for list to resolve selected_view so we do not fan out an unbound
    // facets call that is immediately superseded once model arrives.
    const selectedView = model?.selected_view;
    if (!selectedView) {
      return;
    }
    let cancelled = false;
    setFacetLoading(true);
    const facetsPromise = isBusinessAdmin
      ? api.businessAdminObjectListFacets(vaultId, listKey, {
          view: selectedView,
          navigationContext,
          filter: filter || undefined,
          facetFilters: hasFacetFilters(facetFilters) ? facetFilters : undefined,
        })
      : api.objectListFacets(vaultId, listKey, {
          view: selectedView,
          navigationContext,
          filter: filter || undefined,
          facetFilters: hasFacetFilters(facetFilters) ? facetFilters : undefined,
        });
    void facetsPromise
      .then((data) => {
        if (!cancelled) {
          setFacetModel(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFacetModel(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFacetLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    vaultId,
    listKey,
    isBusinessAdmin,
    isAdminChrome,
    navigationContext,
    model?.selected_view,
    model?.list_context_fingerprint,
    facetFilters,
    filter,
  ]);

  useEffect(() => {
    if (isBusinessAdmin || !tabApiName || !model) {
      return;
    }
    publishTabListActions(tabApiName, tabListActionsFromObjectList(model));
  }, [isBusinessAdmin, tabApiName, model, publishTabListActions]);

  useEffect(() => {
    if (isBusinessAdmin || !tabApiName) {
      return;
    }
    return () => {
      clearTabListActions(tabApiName);
    };
  }, [isBusinessAdmin, tabApiName, clearTabListActions]);

  const {
    selectedView,
    nextToken,
    showPagination,
    displayFilterColumns,
    records,
    pageStart,
    pageEnd,
    currentPage,
    totalPages,
  } = pagination;
  const displayRecords = useMemo(
    () =>
      records.map((row) => ({
        ...row,
        favorited: favoriteOverrides[row.record_id] ?? row.favorited,
      })),
    [records, favoriteOverrides],
  );
  const hasRowActions =
    model?.row_actions_allowed ??
    displayRecords.some((row) => rowHasRecordActions(row.actions));
  const showStartWorkflow = Boolean(model?.start_workflow_allowed);
  const renderStartWorkflowMenuItem = (close: () => void) => (
    <Button
      type="text"
      role="menuitem"
      className="list-actions-menu__item"
      disabled={loading || startablePending || displayRecords.length === 0}
      onClick={() => {
        close();
        void startSelectedWorkflow(displayRecords.map((row) => row.record_id));
      }}
    >
      {displayText(defaultWorkflowChrome.start_workflow)}
    </Button>
  );
  const facetSelections = useMemo(() => {
    if (!hasFacetFilters(facetFilters)) {
      return [];
    }
    const filterColumns =
      model?.filter_editor_columns ??
      model?.display_facet_filter_columns ??
      model?.facet_filter_columns ??
      [];
    return formatActiveFacetSelections({
      filters: facetFilters,
      columns: filterColumns,
      facetFields: facetModel?.fields,
      chrome,
    });
  }, [
    facetFilters,
    facetModel?.fields,
    model?.filter_editor_columns,
    model?.facet_filter_columns,
    model?.display_facet_filter_columns,
    chrome,
  ]);

  if (!vaultId || !listKey) {
    return null;
  }

  const selectedViewMeta = model?.views.find((v) => v.id === selectedView);
  const selectedViewLabel = displayText(
    selectedViewMeta?.label,
    selectedViewMeta?.id ?? selectedView,
  );
  const groupedViews = useMemo(() => {
    const views = model?.views ?? [];
    return {
      standard: views.filter((view) => view.kind === "standard"),
      custom: views.filter(
        (view) => view.kind === "savedview" && !hiddenSidebarViews.has(view.id),
      ),
    };
  }, [model?.views, hiddenSidebarViews]);
  const filterColumnsForView =
    model?.filter_editor_columns ??
    model?.display_facet_filter_columns ??
    model?.facet_filter_columns ??
    [];
  const isSavedView = selectedViewMeta?.kind === "savedview";
  const canManageViews = model?.saved_view_management?.allowed;
  const canCreateView = model?.saved_view_management?.can_create;
  const canEditCurrentView = Boolean(isSavedView && selectedViewMeta?.can_edit);
  const canDeleteCurrentView = Boolean(isSavedView && selectedViewMeta?.can_delete);
  const canRemoveCurrentViewFromSidebar = Boolean(
    isSavedView && !selectedViewMeta?.mandatory,
  );
  const canShareCurrentView = canEditCurrentView;
  const tabLabel = displayText(model?.tab_label, listKey);
  const activeSearchQuery = filter.trim();
  const activeSearchLabel = activeSearchQuery || "";
  const activeFilterCount = facetSelections.length + (activeSearchLabel ? 1 : 0);
  const recordNav = useMemo((): ListRecordNavContext | undefined => {
    if (!model || displayRecords.length === 0) {
      return undefined;
    }
    const total =
      model.pagination.total >= 0 ? model.pagination.total : displayRecords.length;
    if (total <= 0) {
      return undefined;
    }
    return {
      pageRecordIds: displayRecords.map((row) => row.record_id),
      pageStart: pageStart > 0 ? pageStart : 1,
      recordTotal: total,
      tabApiName: isBusinessAdmin ? undefined : listKey,
      tabLabel: tabLabel || undefined,
      objectLabel: displayText(model.actions.object_label, model.object_api_name) || undefined,
    };
  }, [model, displayRecords, pageStart, isBusinessAdmin, listKey, tabLabel]);

  const syncKeywordToUrl = useCallback(
    (nextKeyword: string) => {
      const next = new URLSearchParams(searchParams);
      const trimmed = nextKeyword.trim();
      if (trimmed) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const syncFacetFiltersToUrl = useCallback(
    (nextFilters: typeof facetFilters) => {
      const serialized = serializeFacetFilters(nextFilters) ?? "";
      const current = searchParams.get("facet_filters") ?? "";
      if (serialized === current) {
        return;
      }
      const next = new URLSearchParams(searchParams);
      if (serialized) {
        next.set("facet_filters", serialized);
      } else {
        next.delete("facet_filters");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    syncFacetFiltersToUrl(facetFilters);
  }, [facetFilters, syncFacetFiltersToUrl]);

  const handleClearKeywordFilter = useCallback(() => {
    clearKeywordFilter();
    syncKeywordToUrl("");
  }, [clearKeywordFilter, syncKeywordToUrl]);

  const handleClearFilter = useCallback(() => {
    clearFilter();
    syncKeywordToUrl("");
  }, [clearFilter, syncKeywordToUrl]);
  const cellTextMode = model?.grid_preferences?.cell_text_mode === "wrap" ? "wrap" : "truncate";

  async function toggleFavorite(recordId: string, favorited: boolean) {
    if (!vaultId || !model) return;
    setFavoritePendingId(recordId);
    try {
      await api.setRecordFavorite(vaultId, model.object_api_name, recordId, favorited);
      setFavoriteOverrides((prev) => ({ ...prev, [recordId]: favorited }));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setFavoritePendingId(null);
    }
  }

  function deleteListRecord(recordId: string, actions?: RelatedRowActions) {
    if (!vaultId || !model || !actions?.delete_record_allowed) return;
    const objectName = actions.target_object_api_name || model.object_api_name;
    const targetRecordId = actions.target_record_id?.trim() || recordId;
    Modal.confirm({
      title: displayText(defaultPageActionLabels.delete),
      content: displayText(defaultPageActionLabels.delete_confirm),
      okText: displayText(defaultPageActionLabels.delete),
      cancelText: displayText(shell.cancel),
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingRecordId(recordId);
        setError(null);
        try {
          await api.deleteRecord(vaultId, objectName, targetRecordId);
          await reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : displayText(shell.action_failed));
          throw err;
        } finally {
          setDeletingRecordId(null);
        }
      },
    });
  }

  async function saveGridPreferences(prefs: ListGridPreferences) {
    if (!vaultId || !listKey) return;
    try {
      if (isBusinessAdmin) {
        await api.saveBusinessAdminObjectListGridPreference(vaultId, listKey, {
          navigation_context: navigationContext,
          grid_preferences: prefs,
        });
      } else {
        await api.saveObjectListGridPreference(vaultId, listKey, {
          navigation_context: navigationContext,
          grid_preferences: prefs,
        });
      }
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
      throw err;
    }
  }

  async function persistColumnWidths(nextWidths: Record<string, number>) {
    if (!model || !vaultId || !listKey) return;
    const prefs = model.grid_preferences ?? {};
    const columnFields = model.columns.map((column) => column.field_api_name);
    const grid_preferences = {
      visible_columns: prefs.visible_columns ?? columnFields,
      column_order: prefs.column_order ?? columnFields,
      freeze_column: prefs.freeze_column,
      cell_text_mode: prefs.cell_text_mode ?? "truncate",
      display_filter_fields: prefs.display_filter_fields ?? model.default_display_filter_fields,
      column_widths: nextWidths,
    };
    try {
      if (isBusinessAdmin) {
        await api.saveBusinessAdminObjectListGridPreference(vaultId, listKey, {
          navigation_context: navigationContext,
          grid_preferences,
        });
      } else {
        await api.saveObjectListGridPreference(vaultId, listKey, {
          navigation_context: navigationContext,
          grid_preferences,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
    }
  }

  function handleColumnWidthChange(fieldApiName: string, width: number) {
    if (!model || !vaultId || !listKey) return;
    setColumnWidths((prev) => {
      const nextWidths = { ...prev, [fieldApiName]: width };
      if (columnWidthSaveTimerRef.current != null) {
        window.clearTimeout(columnWidthSaveTimerRef.current);
      }
      columnWidthSaveTimerRef.current = window.setTimeout(() => {
        columnWidthSaveTimerRef.current = null;
        void persistColumnWidths(nextWidths);
      }, 400);
      return nextWidths;
    });
  }

  function currentViewCriteria() {
    return facetFiltersToVQL(facetFilters, filterColumnsForView);
  }

  async function handleSaveCurrentView() {
    if (!vaultId || !tabApiName || !selectedViewMeta || !canEditCurrentView) return;
    setSaveViewPending(true);
    setSaveViewError(null);
    try {
      await api.updateSavedView(vaultId, tabApiName, selectedView, {
        label: displayText(selectedViewMeta.label, selectedView),
        vql_search_criteria: currentViewCriteria(),
      });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setSaveViewPending(false);
    }
  }

  async function handleSaveViewName(name: string) {
    if (!vaultId || !tabApiName || !saveViewDialog) return;
    setSaveViewPending(true);
    setSaveViewError(null);
    try {
      if (saveViewDialog.mode === "create") {
        await api.createSavedView(vaultId, tabApiName, {
          navigation_context: navigationContext,
          label: name,
          vql_search_criteria: currentViewCriteria(),
        });
      } else if (saveViewDialog.viewId) {
        const detail = await api.getSavedView(vaultId, tabApiName, saveViewDialog.viewId);
        await api.updateSavedView(vaultId, tabApiName, saveViewDialog.viewId, {
          label: name,
          vql_search_criteria: savedViewCriteria(detail),
        });
      }
      setSaveViewDialog(null);
      reload();
    } catch (err) {
      setSaveViewError(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setSaveViewPending(false);
    }
  }

  function handleDeleteCurrentView() {
    if (!vaultId || !tabApiName || !canDeleteCurrentView) return;
    Modal.confirm({
      title: displayText(chrome.delete_view),
      content: displayText(chrome.delete_view_confirm),
      okText: displayText(chrome.delete_view),
      cancelText: displayText(shell.cancel),
      onOk: async () => {
        await api.deleteSavedView(vaultId, tabApiName, selectedView);
        selectView("all");
        reload();
      },
    });
  }

  function handleSavedViewAction(action: SavedViewAction) {
    switch (action) {
      case "save":
        void handleSaveCurrentView();
        break;
      case "save_as":
        setSaveViewError(null);
        setSaveViewDialog({ mode: "create" });
        break;
      case "rename":
        if (!selectedViewMeta) return;
        setSaveViewError(null);
        setSaveViewDialog({
          mode: "rename",
          viewId: selectedView,
          initialName: displayText(selectedViewMeta.label, selectedView),
        });
        break;
      case "delete":
        handleDeleteCurrentView();
        break;
      case "remove_from_sidebar":
        if (!vaultId || !preferenceScopeKey || !isSavedView) return;
        hideSidebarView(vaultId, preferenceScopeKey, navigationContext, selectedView);
        setHiddenSidebarViews(getHiddenSidebarViewIds(vaultId, preferenceScopeKey, navigationContext));
        if (selectedView === selectedViewMeta?.id) {
          selectView("all");
        }
        break;
      default:
        break;
    }
  }

  return (
    <div className={isAdminChrome ? undefined : "list-page"}>
      {!isAdminChrome && (
      <aside className="list-page__sidebar">
        {model && model.views.length > 0 && (
          <section className="sidebar-section">
            <div className="sidebar-section__header">
              <h2 className="sidebar-section__title">{displayText(chrome.views_title)}</h2>
              {canManageViews && (
                <Button
                  type="text"
                  size="small"
                  className="sidebar-section__action"
                  aria-label={displayText(chrome.edit_views)}
                  title={displayText(chrome.edit_views)}
                  onClick={() => setEditViewsOpen(true)}
                >
                  <EditOutlined />
                </Button>
              )}
            </div>
            <div className="view-tabs" role="tablist" aria-label={displayText(chrome.list_view_aria)}>
              {renderViewItems(
                groupedViews.standard,
                selectedView,
                model.pagination.total,
                selectView,
                chrome,
              )}
              {renderViewItems(
                groupedViews.custom,
                selectedView,
                model.pagination.total,
                selectView,
                chrome,
              )}
            </div>
          </section>
        )}

        {model && displayFilterColumns.length > 0 && (
          <section className="sidebar-section sidebar-section--filters">
            <div className="sidebar-section__header">
              <h2 className="sidebar-section__title">{displayText(chrome.filters_title)}</h2>
              {model.edit_filters_allowed && (
                <Button
                  type="text"
                  size="small"
                  className="sidebar-section__action"
                  aria-label={displayText(chrome.edit_filters)}
                  title={displayText(chrome.edit_filters)}
                  onClick={() => setEditFiltersOpen(true)}
                >
                  <EditOutlined />
                </Button>
              )}
            </div>
            <FacetFilterPanel
              columns={displayFilterColumns}
              fields={facetModel?.fields ?? []}
              selected={facetFilters}
              loading={facetLoading}
              disabled={loading}
              chrome={chrome}
              onChange={setFacetFieldFilter}
              onClearField={clearFacetField}
            />
          </section>
        )}
      </aside>
      )}

      <div className={isAdminChrome ? undefined : "list-page__content"}>
        {isAdminChrome ? (
          <>
            <header className="page-header page-header--list">
              <div>
                {isBusinessAdmin && (
                  <p className="page-header__breadcrumb">
                    <Link to="/business-admin/objects">{displayText(chrome.all_objects)}</Link>
                    <span aria-hidden="true"> / </span>
                    <span>{tabLabel}</span>
                  </p>
                )}
                <h1>{tabLabel || displayText(model?.actions.object_label, listKey)}</h1>
              </div>
            </header>
            {model && (
              <AdminObjectListToolbar
                chrome={chrome}
                loading={loading}
                views={model.views}
                selectedView={selectedView}
                onSelectView={selectView}
                searchValue={filterDraft}
                onSearchChange={setFilterDraft}
                createButton={
                  <>
                    {toolbarLeading}
                    {!hideCreate && (
                      <ListCreateButton
                        vaultId={vaultId}
                        tabApiName={model.tab_api_name}
                        objectApiName={model.object_api_name}
                        objectLabel={model.actions.object_label}
                        allowed={model.actions.allowed}
                        requiresTypeSelection={model.actions.requires_type_selection}
                        objectTypes={model.actions.object_types}
                        defaultObjectType={model.actions.default_object_type}
                        className="list-toolbar__create"
                      />
                    )}
                  </>
                }
                pagination={
                  showPagination && (records.length > 0 || model.pagination.total > 0) ? (
                    <ListPagination
                      rangeLabel={
                        model.pagination.total >= 0
                          ? displayTextTemplate(chrome.pagination_range, {
                              start: pageStart,
                              end: pageEnd,
                              total: model.pagination.total,
                            })
                          : displayTextTemplate(chrome.record_count, { count: records.length })
                      }
                      currentPage={currentPage}
                      totalPages={totalPages}
                      hasPrevious={canGoPrevious}
                      hasNext={!!nextToken}
                      loading={loading}
                      previousAria={displayText(chrome.previous_page)}
                      nextAria={displayText(chrome.next_page)}
                      pageInputAria={displayText(chrome.page_input_label)}
                      onPrevious={goPreviousPage}
                      onNext={goNextPage}
                      onGoToPage={goToPage}
                    />
                  ) : undefined
                }
                actionsMenu={
                  <ListActionsMenu
                    ariaLabel={displayText(chrome.list_actions_aria)}
                    disabled={loading}
                  >
                    {(close) => (
                      <>
                        {showStartWorkflow ? renderStartWorkflowMenuItem(close) : null}
                        <ListGridMenuItems
                          chrome={chrome}
                          columns={model.columns}
                          recordLinkField={model.record_link_field}
                          current={model.grid_preferences ?? {}}
                          editColumnsAllowed={model.edit_columns_allowed}
                          disabled={loading}
                          pageSize={showPagination ? pageSize : undefined}
                          pageSizeOptions={showPagination ? OBJECT_LIST_PAGE_SIZE_OPTIONS : undefined}
                          onPageSizeChange={showPagination ? setPageSize : undefined}
                          onEditColumns={() => setEditColumnsOpen(true)}
                          onSave={saveGridPreferences}
                          close={close}
                        />
                      </>
                    )}
                  </ListActionsMenu>
                }
              />
            )}
          </>
        ) : (
          <>
        <header className="list-header">
          <div className="list-header__left">
            <h1 className="list-header__title">{selectedViewLabel}</h1>
            {canManageViews && (
              <SavedViewActionsMenu
                chrome={chrome}
                disabled={loading || saveViewPending}
                canSave={canEditCurrentView}
                canSaveAs={Boolean(canCreateView)}
                canRename={canEditCurrentView}
                canRemoveFromSidebar={canRemoveCurrentViewFromSidebar}
                canShare={canShareCurrentView}
                canDelete={canDeleteCurrentView}
                onAction={handleSavedViewAction}
              />
            )}
          </div>
          <div className="list-header__right">
            {isBusinessAdmin && model && !hideCreate && (
              <ListCreateButton
                vaultId={vaultId}
                tabApiName={model.tab_api_name}
                objectApiName={model.object_api_name}
                objectLabel={model.actions.object_label}
                allowed={model.actions.allowed}
                requiresTypeSelection={model.actions.requires_type_selection}
                objectTypes={model.actions.object_types}
                defaultObjectType={model.actions.default_object_type}
                className="list-toolbar__create"
              />
            )}
            {model && showPagination && records.length > 0 && (
              <ListPagination
                rangeLabel={
                  model.pagination.total >= 0
                    ? displayTextTemplate(chrome.pagination_range, {
                        start: pageStart,
                        end: pageEnd,
                        total: model.pagination.total,
                      })
                    : displayTextTemplate(chrome.record_count, { count: records.length })
                }
                currentPage={currentPage}
                totalPages={totalPages}
                hasPrevious={canGoPrevious}
                hasNext={!!nextToken}
                loading={loading}
                previousAria={displayText(chrome.previous_page)}
                nextAria={displayText(chrome.next_page)}
                pageInputAria={displayText(chrome.page_input_label)}
                onPrevious={goPreviousPage}
                onNext={goNextPage}
                onGoToPage={goToPage}
              />
            )}
            {model && (
              <ListActionsMenu
                ariaLabel={displayText(chrome.list_actions_aria)}
                disabled={loading}
              >
                {(close) => (
                  <>
                    {showStartWorkflow ? renderStartWorkflowMenuItem(close) : null}
                    <ListGridMenuItems
                      chrome={chrome}
                      columns={model.columns}
                      recordLinkField={model.record_link_field}
                      current={model.grid_preferences ?? {}}
                      editColumnsAllowed={model.edit_columns_allowed}
                      disabled={loading}
                      pageSize={showPagination ? pageSize : undefined}
                      pageSizeOptions={showPagination ? OBJECT_LIST_PAGE_SIZE_OPTIONS : undefined}
                      onPageSizeChange={showPagination ? setPageSize : undefined}
                      onEditColumns={() => setEditColumnsOpen(true)}
                      onSave={saveGridPreferences}
                      close={close}
                    />
                  </>
                )}
              </ListActionsMenu>
            )}
          </div>
        </header>
          </>
        )}

        {!isAdminChrome && model && activeFilterCount > 0 && (
          <div className="active-filters">
            <div className="active-filters__heading">
              <span>
                {displayTextTemplate(chrome.active_filters_heading, {
                  count: activeFilterCount,
                })}
              </span>
              <Button
                className="active-filters__clear"
                type="link"
                size="small"
                disabled={loading}
                onClick={handleClearFilter}
              >
                {displayText(chrome.clear_all_filters)}
              </Button>
            </div>
            <div className="active-filters__list">
              {activeSearchLabel && (
                <div key="search-query" className="active-filters__item">
                  <span className="active-filters__label">{displayText(chrome.keyword)}:</span>
                  <span className="active-filters__value">{activeSearchLabel}</span>
                  <Button
                    className="active-filters__remove"
                    type="text"
                    size="small"
                    icon={<CloseCircleOutlined />}
                    aria-label={displayText(shell.clear)}
                    disabled={loading}
                    onClick={handleClearKeywordFilter}
                  />
                </div>
              )}
              {facetSelections.map((selection) => (
                <div
                  key={`${selection.fieldApiName}:${selection.value}`}
                  className="active-filters__item"
                >
                  <span className="active-filters__label">{selection.fieldLabel}:</span>
                  <span className="active-filters__value">{selection.valueLabel}</span>
                  <Button
                    className="active-filters__remove"
                    type="text"
                    size="small"
                    icon={<CloseCircleOutlined />}
                    aria-label={displayText(shell.clear)}
                    disabled={loading}
                    onClick={() => clearFacetField(selection.fieldApiName)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {model?.list_controls?.sort_fallback_applied && (
          <div className="list-toolbar">
            <span className="list-pagination__notice">{displayText(chrome.sort_fallback_notice)}</span>
          </div>
        )}

        {error && <Alert type="error" title={error} showIcon role="alert" />}
        {model?.list_state?.kind === "config_error" && (
          <Alert type="info" title={displayText(chrome.config_error_list)} showIcon />
        )}
        {loading && !model && (
          <Spin description={displayText(chrome.loading_list)} className="page-loading list-page__loading" />
        )}
        {model && (
          <div className="list-page__body">
            <DataTable
                columns={model.columns}
                records={displayRecords}
                emptyText={chrome.empty_list}
                vaultId={vaultId}
                objectApiName={model.object_api_name}
                recordLinkField={model.record_link_field}
                displayContext={model.display_context}
                sortBy={sortBy}
                sortDir={sortDir}
                cellTextMode={cellTextMode}
                columnWidths={columnWidths}
                onColumnWidthChange={handleColumnWidthChange}
                loading={loading}
                showFavoriteColumn
                favoritePendingId={favoritePendingId}
                onToggleFavorite={toggleFavorite}
                addFavoriteAria={chrome.add_favorite_aria}
                removeFavoriteAria={chrome.remove_favorite_aria}
                linkToRecordLabel={chrome.link_to_record}
                facetFilters={isAdminChrome ? undefined : facetFilters}
                facetFields={isAdminChrome ? undefined : facetModel?.fields}
                facetFilterDisabled={isAdminChrome ? undefined : loading}
                facetChrome={isAdminChrome ? undefined : chrome}
                onFacetFilterChange={isAdminChrome ? undefined : setFacetFieldFilter}
                onSort={toggleSort}
                actionsPlacement="first"
                recordNav={recordNav}
                renderRowActions={
                  hasRowActions && vaultId
                    ? (recordId) => (
                        <LazyRecordRowActionMenu
                          vaultId={vaultId}
                          objectName={model.object_api_name}
                          recordId={recordId}
                          enabled={hasRowActions}
                          deletingRecord={deletingRecordId === recordId}
                          lifecyclePending={isRowLifecycleBusy(recordId)}
                          onDeleteRecord={(actions) => deleteListRecord(recordId, actions)}
                          onEditRecord={(actions) => {
                            const objectName = actions.target_object_api_name || model.object_api_name;
                            const targetRecordId = actions.target_record_id?.trim() || recordId;
                            navigate(
                              recordEditHref(objectName, targetRecordId, {
                                tabApiName: tabApiName ?? undefined,
                              }),
                            );
                          }}
                          onLifecycleAction={(action, actions) => {
                            const objectName = actions.target_object_api_name || model.object_api_name;
                            const targetRecordId = actions.target_record_id?.trim() || recordId;
                            void handleRowLifecycleAction(objectName, targetRecordId, action);
                          }}
                          onSdkAction={(action, actions) => {
                            const objectName = actions.target_object_api_name || model.object_api_name;
                            const targetRecordId = actions.target_record_id?.trim() || recordId;
                            handleRowSdkAction(objectName, targetRecordId, action);
                          }}
                          actionsAria={chrome.list_actions_aria}
                        />
                      )
                    : undefined
                }
              />
          </div>
        )}
      </div>

      {!isAdminChrome && model && (
        <EditDisplayFiltersDialog
          key={`filters-${editFiltersOpen}-${model.list_context_fingerprint ?? ""}`}
          open={editFiltersOpen}
          chrome={chrome}
          availableColumns={
            model.filter_editor_columns ??
            model.facet_filter_columns ??
            []
          }
          defaultFieldNames={
            model.default_display_filter_fields && model.default_display_filter_fields.length > 0
              ? model.default_display_filter_fields
              : (model.filter_editor_columns ?? model.facet_filter_columns ?? []).map(
                  (col) => col.field_api_name,
                )
          }
          current={model.grid_preferences ?? {}}
          onClose={() => setEditFiltersOpen(false)}
          onSave={saveGridPreferences}
        />
      )}

      {model && (
        <EditColumnsDialog
          key={`${editColumnsOpen}-${model.list_context_fingerprint ?? ""}`}
          open={editColumnsOpen}
          chrome={chrome}
          availableColumns={model.available_columns ?? []}
          defaultColumns={model.default_columns ?? model.columns}
          current={model.grid_preferences ?? {}}
          onClose={() => setEditColumnsOpen(false)}
          onSave={saveGridPreferences}
        />
      )}

      {!isAdminChrome && vaultId && tabApiName && (
        <EditViewsDialog
          open={editViewsOpen}
          vaultId={vaultId}
          tabApiName={tabApiName}
          tabLabel={tabLabel}
          navigationContext={navigationContext}
          chrome={chrome}
          onClose={() => setEditViewsOpen(false)}
          onChanged={() => reload()}
        />
      )}

      {!isAdminChrome && (
      <SaveViewNameDialog
        open={saveViewDialog !== null}
        chrome={chrome}
        title={
          saveViewDialog?.mode === "rename"
            ? displayText(chrome.rename_view)
            : displayText(chrome.save_view_as)
        }
        initialName={saveViewDialog?.initialName ?? ""}
        showInfo={saveViewDialog?.mode === "create"}
        saving={saveViewPending}
        error={saveViewError}
        onClose={() => {
          setSaveViewDialog(null);
          setSaveViewError(null);
        }}
        onSave={handleSaveViewName}
      />
      )}

      {startablePicker && (
        <StartWorkflowPickerModal
          open
          actions={startablePicker.actions}
          pending={lifecyclePending || startablePending}
          onCancel={() => setStartablePicker(null)}
          onSelect={(action) => {
            const recordIds = startablePicker.recordIds;
            setStartablePicker(null);
            if (!model || recordIds.length === 0) {
              return;
            }
            void handleRowLifecycleAction(model.object_api_name, recordIds[0], action, {
              recordIds,
            });
          }}
        />
      )}

      {dialogTarget && model && (
        <WorkflowStartModal
          open={workflowDialogAction != null}
          action={workflowDialogAction}
          page={dialogTarget.page}
          vaultId={vaultId}
          objectName={dialogTarget.objectName}
          recordId={dialogTarget.recordId}
          values={workflowFieldValues}
          participantValues={workflowParticipantValues}
          dateValues={workflowDateValues}
          assignmentTypeValues={workflowAssignmentTypeValues}
          pending={lifecyclePending}
          onValuesChange={setWorkflowFieldValues}
          onParticipantValuesChange={setWorkflowParticipantValues}
          onDateValuesChange={setWorkflowDateValues}
          onAssignmentTypeValuesChange={setWorkflowAssignmentTypeValues}
          onCancel={cancelActionDialog}
          onConfirm={() => void confirmWorkflowDialog()}
        />
      )}
      {dialogTarget && (
        <PreExecutionDialogModal
          open={preExecutionActionKind != null && preExecutionDialog != null}
          actionLabel={preExecutionActionLabel}
          actionName={preExecutionActionName}
          dialog={preExecutionDialog}
          values={preExecutionInputValues}
          pending={lifecyclePending}
          onValuesChange={setPreExecutionInputValues}
          onCancel={cancelActionDialog}
          onConfirm={() => void confirmPreExecutionDialog()}
        />
      )}

      {vaultId && model?.object_api_name === "document__v" ? (
        <DocumentViewerPanel
          vaultId={vaultId}
          objectApiName={model.object_api_name}
          recordId={documentUploadRequest?.target.recordId}
          modalHostOnly
          toolbarOnly
          documentUploadRequest={documentUploadRequest}
          onDocumentUploadComplete={completeDocumentUpload}
          onDocumentUploadHandled={clearDocumentUploadRequest}
          documentActions={documentUploadRequest?.target.page.sdk_actions}
          onRecordPageReload={reload}
        />
      ) : null}
    </div>
  );
}
