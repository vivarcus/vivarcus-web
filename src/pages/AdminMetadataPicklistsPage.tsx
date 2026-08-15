import { Alert, Button, Input, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataPicklistSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";
import { filterAndRankByQuery } from "../lib/metadataSearchRank";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataPicklistsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [picklists, setPicklists] = useState<MetadataPicklistSummary[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataPicklists(vaultId);
      setPicklists(data.picklists);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setPicklists([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const scoped = picklists.filter((pl) => {
      if (statusFilter === "active" && !pl.active) return false;
      if (statusFilter === "inactive" && pl.active) return false;
      return true;
    });
    return filterAndRankByQuery(scoped, query, (pl) => [pl.label, pl.api_name, pl.source, pl.namespace]);
  }, [picklists, query, statusFilter]);

  const openPicklist = useCallback(
    (apiName: string) => navigate(`/admin/configuration/picklists/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const columns: TableColumnsType<MetadataPicklistSummary> = [
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_label),
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, pl) => (
        <Button type="link" className="metadata-link" onClick={() => openPicklist(pl.api_name)}>
          {displayText(pl.label || undefined, pl.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => openPicklist(name)}>
          {name}
        </Button>
      ),
    },
    {
      key: "entries",
      dataIndex: "entry_count",
      title: displayText(shell.metadata_picklist_entries),
      width: 100,
      sorter: (a, b) => a.entry_count - b.entry_count,
    },
    {
      key: "status",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
    {
      key: "source",
      dataIndex: "source",
      title: displayText(shell.metadata_source),
      className: "mono",
      render: (source: string) => sourceLabel(source, shell),
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell title={displayText(shell.metadata_picklists_title)}>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      <div className="filter-bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_picklists_search_placeholder)}
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
        <span className="data-table__empty metadata-count">
          {displayTextTemplate(shell.metadata_result_count, { count: filtered.length })}
        </span>
      </div>

      {loading && picklists.length === 0 ? (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      ) : (
        <AdminCompactTable<MetadataPicklistSummary>
            wrapClassName="table-wrap--metadata"
            rowKey="api_name"
            pagination={false}
            columns={columns}
            dataSource={filtered}
            locale={{
              emptyText: adminTableEmptyText(displayText(shell.metadata_empty_picklists)),
            }}
          />
      )}
    </AdminPageShell>
  );
}
