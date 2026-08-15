import { Alert, Spin } from "antd";
import { useCallback, useState } from "react";
import { useListColumnWidths } from "../hooks/useListColumnWidths";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import { AdminObjectListToolbar } from "../components/AdminObjectListToolbar";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { EditColumnsDialog } from "../components/EditColumnsDialog";
import { ListActionsMenu } from "../components/ListActionsMenu";
import { ListGridMenuItems } from "../components/ListGridMenuItems";
import { ListPagination } from "../components/ListPagination";
import { ListCreateButton } from "../components/ListCreateButton";
import { DataTable } from "../components/DataTable";
import type { ListGridPreferences } from "../api/types";
import { useUi } from "../context/UiContext";
import { useObjectListState } from "../hooks/useObjectListState";
import { displayText, displayTextTemplate } from "../lib/i18n";
import {
  ADMIN_APPLICATION_ROLES_ENTRY_CONTEXT,
  ADMIN_APPLICATION_ROLES_OBJECT,
  ADMIN_APPLICATION_ROLES_TAB,
} from "../lib/adminApplicationRoles";
import { OBJECT_LIST_PAGE_SIZE_OPTIONS, type ObjectListQuery } from "../lib/objectListPage";

export function AdminApplicationRolesListPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [editColumnsOpen, setEditColumnsOpen] = useState(false);

  const fetchList = useCallback(
    async (query: ObjectListQuery) => {
      if (!vaultId) {
        throw new Error("Missing vault");
      }
      return api.adminApplicationRolesList(vaultId, {
        view: query.view,
        navigationContext: ADMIN_APPLICATION_ROLES_ENTRY_CONTEXT,
        pageSize: query.pageSize,
        pageToken: query.pageToken,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        filter: query.filter,
        filterField: query.filterField,
      });
    },
    [vaultId],
  );

  const persistView = useCallback(
    async (viewId: string) => {
      if (!vaultId) return;
      await api.saveAdminApplicationRolesListView(vaultId, {
        view_id: viewId,
        navigation_context: ADMIN_APPLICATION_ROLES_ENTRY_CONTEXT,
      });
    },
    [vaultId],
  );

  const {
    model,
    loading,
    error,
    chrome,
    pageSize,
    setPageSize,
    sortBy,
    sortDir,
    filterDraft,
    setFilterDraft,
    pagination,
    canGoPrevious,
    selectView,
    toggleSort,
    goPreviousPage,
    goNextPage,
    goToPage,
    reload,
    setError,
  } = useObjectListState({
    scopeKey: ADMIN_APPLICATION_ROLES_TAB,
    vaultId,
    debounceKeywordMs: 300,
    fetchList,
    persistView,
  });

  if (!vaultId) {
    return null;
  }

  const {
    selectedView,
    nextToken,
    showPagination,
    records,
    pageStart,
    pageEnd,
    currentPage,
    totalPages,
  } = pagination;
  const cellTextMode = model?.grid_preferences?.cell_text_mode === "wrap" ? "wrap" : "truncate";

  const persistColumnWidths = useCallback(
    async (nextWidths: Record<string, number>) => {
      if (!vaultId || !model) return;
      const prefs = model.grid_preferences ?? {};
      const columnFields = model.columns.map((column) => column.field_api_name);
      try {
        await api.saveAdminApplicationRolesListGridPreference(vaultId, {
          navigation_context: ADMIN_APPLICATION_ROLES_ENTRY_CONTEXT,
          grid_preferences: {
            visible_columns: prefs.visible_columns ?? columnFields,
            column_order: prefs.column_order ?? columnFields,
            freeze_column: prefs.freeze_column,
            cell_text_mode: prefs.cell_text_mode ?? "truncate",
            column_widths: nextWidths,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : displayText(shell.save_failed));
      }
    },
    [vaultId, model, setError, shell.save_failed],
  );

  const { columnWidths, onColumnWidthChange } = useListColumnWidths({
    fingerprint: model?.list_context_fingerprint,
    initialWidths: model?.grid_preferences?.column_widths,
    persist: persistColumnWidths,
  });

  async function saveGridPreferences(prefs: ListGridPreferences) {
    if (!vaultId) return;
    try {
      await api.saveAdminApplicationRolesListGridPreference(vaultId, {
        navigation_context: ADMIN_APPLICATION_ROLES_ENTRY_CONTEXT,
        grid_preferences: prefs,
      });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.save_failed));
      throw err;
    }
  }

  return (
    <AdminPageShell variant="list" title={displayText(model?.tab_label, "Application Roles")}>
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
              <ListCreateButton
                vaultId={vaultId}
                tabApiName={ADMIN_APPLICATION_ROLES_TAB}
                objectApiName={ADMIN_APPLICATION_ROLES_OBJECT}
                allowed={model.actions.allowed}
                className="list-toolbar__create"
              />
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
                )}
              </ListActionsMenu>
            }
          />
        )}

        {error ? <Alert type="error" title={error} showIcon role="alert" className="admin-page__banner" /> : null}
        {loading && !model && (
          <Spin description={displayText(chrome.loading_list)} className="page-loading list-page__loading" />
        )}
        {model && (
          <DataTable
            columns={model.columns}
            records={records}
            emptyText={chrome.empty_list}
            vaultId={vaultId}
            objectApiName={model.object_api_name}
            recordLinkField={model.record_link_field}
            displayContext={model.display_context}
            sortBy={sortBy}
            sortDir={sortDir}
            cellTextMode={cellTextMode}
            columnWidths={columnWidths}
            onColumnWidthChange={onColumnWidthChange}
            linkToRecordLabel={chrome.link_to_record}
            onSort={toggleSort}
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
    </AdminPageShell>
  );
}
