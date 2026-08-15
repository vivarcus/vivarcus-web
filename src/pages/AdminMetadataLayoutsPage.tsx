import { Alert, Button, Input, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataLayoutSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { filterAndRankByQuery } from "../lib/metadataSearchRank";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataLayoutsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [layouts, setLayouts] = useState<MetadataLayoutSummary[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [defaultFilter, setDefaultFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataLayouts(vaultId);
      setLayouts(data.layouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setLayouts([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const scoped = layouts.filter((l) => {
      if (statusFilter === "active" && !l.active) return false;
      if (statusFilter === "inactive" && l.active) return false;
      if (defaultFilter === "yes" && !l.default_layout) return false;
      if (defaultFilter === "no" && l.default_layout) return false;
      return true;
    });
    return filterAndRankByQuery(scoped, query, (l) => [l.label, l.api_name, l.object_api_name]);
  }, [layouts, query, statusFilter, defaultFilter]);

  const openLayout = useCallback(
    (apiName: string) =>
      navigate(`/admin/configuration/layouts/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const openObject = useCallback(
    (apiName: string) =>
      navigate(`/admin/configuration/objects/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const columns: TableColumnsType<MetadataLayoutSummary> = [
    {
      key: "label",
      title: displayText(shell.metadata_layout_label),
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, layout) => (
        <Button type="link" className="metadata-link" onClick={() => openLayout(layout.api_name)}>
          {displayText(layout.label || undefined, layout.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_layout_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => openLayout(name)}>
          {name}
        </Button>
      ),
    },
    {
      key: "object",
      title: displayText(shell.metadata_lifecycle_object),
      className: "mono",
      render: (_v, layout) =>
        layout.object_api_name ? (
          <Button
            type="link"
            className="metadata-link mono"
            onClick={() => openObject(layout.object_api_name!)}
          >
            {layout.object_api_name}
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
    {
      key: "default",
      dataIndex: "default_layout",
      title: displayText(shell.metadata_default),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no),
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell title={displayText(shell.metadata_layouts_title)}>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      <div className="filter-bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_layouts_search_placeholder)}
          onChange={(e) => setQuery(e.target.value)}
          className="filter-bar__max-280"
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? "")}
          options={[
            { value: "", label: displayText(shell.metadata_filter_all_statuses) },
            { value: "active", label: displayText(shell.metadata_status_active) },
            { value: "inactive", label: displayText(shell.metadata_status_inactive) },
          ]}
          className="filter-bar__min-140"
        />
        <Select
          value={defaultFilter}
          onChange={(v) => setDefaultFilter(v ?? "")}
          options={[
            { value: "", label: displayText(shell.metadata_filter_all) },
            { value: "yes", label: displayText(shell.metadata_yes) },
            { value: "no", label: displayText(shell.metadata_no) },
          ]}
          className="filter-bar__min-120"
        />
        <span className="data-table__empty metadata-count">
          {displayTextTemplate(shell.metadata_result_count, { count: filtered.length })}
        </span>
      </div>

      {loading && layouts.length === 0 ? (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      ) : (
        <AdminCompactTable<MetadataLayoutSummary>
            wrapClassName="table-wrap--metadata"
            rowKey="api_name"
            pagination={false}
            columns={columns}
            dataSource={filtered}
            locale={{
              emptyText: adminTableEmptyText(displayText(shell.metadata_empty_layouts)),
            }}
          />
      )}
    </AdminPageShell>
  );
}
