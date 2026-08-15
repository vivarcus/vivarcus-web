import { Alert, Button, Input, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type { BusinessAdminObjectOption, BusinessAdminObjectsSelectorModel } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { BusinessAdminSidebar } from "../components/BusinessAdminSidebar";
import { ListPagination } from "../components/ListPagination";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate, defaultListChrome } from "../lib/i18n";
import {
  BUSINESS_ADMIN_OBJECTS_PAGE_SIZE,
  filterBusinessAdminObjects,
  localizedSourceLabel,
  paginateBusinessAdminObjects,
  readFavoriteBusinessAdminObjects,
  readRecentBusinessAdminObjects,
  rememberBusinessAdminObject,
  resolveBusinessAdminObjectLinks,
  toggleFavoriteBusinessAdminObject,
} from "../lib/businessAdminObjects";

export function BusinessAdminObjectsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<BusinessAdminObjectsSelectorModel | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.businessAdminObjectsSelector(vaultId);
      setModel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed, "Failed to load objects"));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!vaultId) return;
    setFavoriteNames(readFavoriteBusinessAdminObjects(vaultId));
  }, [vaultId]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const objects = useMemo(
    () => filterBusinessAdminObjects(model?.objects ?? [], query),
    [model?.objects, query],
  );

  const pageSize = BUSINESS_ADMIN_OBJECTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(objects.length / pageSize));
  const pageObjects = useMemo(
    () => paginateBusinessAdminObjects(objects, page, pageSize),
    [objects, page, pageSize],
  );

  const chrome = model?.chrome;
  const recentObjects = useMemo(
    () =>
      vaultId && model
        ? resolveBusinessAdminObjectLinks(model.objects, readRecentBusinessAdminObjects(vaultId))
        : [],
    [vaultId, model],
  );
  const favoriteObjects = useMemo(
    () => (model ? resolveBusinessAdminObjectLinks(model.objects, favoriteNames) : []),
    [model, favoriteNames],
  );

  const pageStart = objects.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, objects.length);

  function openObject(objectName: string) {
    if (!vaultId) return;
    rememberBusinessAdminObject(vaultId, objectName);
    navigate(`/business-admin/objects/${encodeURIComponent(objectName)}`);
  }

  function toggleFavorite(apiName: string) {
    if (!vaultId) return;
    setFavoriteNames(toggleFavoriteBusinessAdminObject(vaultId, apiName));
  }

  const columns: TableColumnsType<BusinessAdminObjectOption> = [
    {
      key: "favorite",
      width: 40,
      className: "business-admin-objects-table__favorite-col",
      render: (_value, obj) => {
        const favorite = favoriteNames.includes(obj.api_name);
        return (
          <Button
            type="text"
            className={`record-favorite-star${favorite ? " record-favorite-star--active" : ""}`}
            aria-label={
              favorite
                ? displayText(chrome?.remove_favorite_aria, "Remove favorite")
                : displayText(chrome?.add_favorite_aria, "Add favorite")
            }
            aria-pressed={favorite}
            onClick={() => toggleFavorite(obj.api_name)}
          >
            ★
          </Button>
        );
      },
    },
    {
      key: "label",
      title: displayText(chrome?.object_label_column, "Object Label"),
      render: (_value, obj) => (
        <Button type="link" className="metadata-link" onClick={() => openObject(obj.api_name)}>
          {displayText(obj.label, obj.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(chrome?.object_name_column, "Object Name"),
      className: "mono",
    },
    {
      key: "source",
      dataIndex: "source",
      title: displayText(chrome?.source_column, "Source"),
      render: (source: BusinessAdminObjectOption["source"]) => (
        <span className={`business-admin-objects-table__source business-admin-objects-table__source--${source}`}>
          <span className="business-admin-objects-table__source-icon" aria-hidden="true" />
          {localizedSourceLabel(source, chrome)}
        </span>
      ),
    },
  ];

  if (!vaultId) {
    return null;
  }

  return (
    <div className="list-page business-admin-objects-layout">
      <aside className="list-page__sidebar">
        {model && (
          <BusinessAdminSidebar
            chrome={chrome}
            recent={recentObjects}
            favorites={favoriteObjects}
            onSelect={rememberBusinessAdminObject.bind(null, vaultId)}
          />
        )}
      </aside>

      <div className="list-page__content">
        <AdminPageShell
          variant="list"
          title={displayText(chrome?.title, "All Objects")}
          meta={
            <p className="admin-page__hint">
              {displayText(chrome?.description, "Select an object to manage records.")}
            </p>
          }
        >
          <div className="filter-bar">
            <Input.Search
              allowClear
              value={query}
              placeholder={displayText(chrome?.search_label, "Search objects")}
              aria-label={displayText(chrome?.search_label, "Search objects")}
              disabled={loading && !model}
              onChange={(e) => setQuery(e.target.value)}
              onSearch={setQuery}
              className="filter-bar__max-280"
            />
            <div className="filter-bar__meta-end">
              <ListPagination
                rangeLabel={displayTextTemplate(defaultListChrome.pagination_range, {
                  start: pageStart,
                  end: pageEnd,
                  total: objects.length,
                })}
                currentPage={page}
                totalPages={totalPages}
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                loading={loading}
                previousAria={displayText(chrome?.previous_page_aria, displayText(defaultListChrome.previous_page))}
                nextAria={displayText(chrome?.next_page_aria, displayText(defaultListChrome.next_page))}
                pageInputAria={displayText(defaultListChrome.page_input_label)}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
                onGoToPage={setPage}
              />
            </div>
          </div>

          {error ? <Alert type="error" title={error} showIcon role="alert" className="admin-page__banner" /> : null}
          {loading && !model ? (
            <Spin description={displayText(shell.loading_nav)} className="page-loading page__loading" />
          ) : null}

          {model ? (
            <AdminCompactTable<BusinessAdminObjectOption>
              loadingOverlay={loading}
              rowKey="api_name"
              columns={columns}
              dataSource={pageObjects}
              locale={{
                emptyText: adminTableEmptyText(
                  displayText(chrome?.empty_state, "No objects are available."),
                ),
              }}
            />
          ) : null}
        </AdminPageShell>
      </div>
    </div>
  );
}
