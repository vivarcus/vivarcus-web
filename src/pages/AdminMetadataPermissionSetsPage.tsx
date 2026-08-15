import { Alert, Button, Input, Select, Spin, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataPermissionSetSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataPermissionSetsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [permissionSets, setPermissionSets] = useState<MetadataPermissionSetSummary[]>([]);
  const [query, setQuery] = useState("");
  // sourceFilter is a source key ("standard" / "custom" / …) or "" for all; statusFilter is
  // "active" / "inactive" or "" for all. With hundreds of sets, filtering by custom-only or
  // active-only is a common triage need beyond free-text search.
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // referenceFilter is "referenced" / "unreferenced" or "" for all; "unreferenced" surfaces
  // orphaned sets (no Security Profile / Application Role references) for cleanup triage.
  const [referenceFilter, setReferenceFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataPermissionSets(vaultId);
      setPermissionSets(data.permission_sets);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setPermissionSets([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  // sourceOptions are the distinct source keys actually present, so the filter never offers an
  // empty bucket.
  const sourceOptions = useMemo(() => {
    const present = new Set(permissionSets.map((p) => p.source));
    return Array.from(present).sort();
  }, [permissionSets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return permissionSets.filter((p) => {
      if (q && !p.api_name.toLowerCase().includes(q) && !p.label.toLowerCase().includes(q)) {
        return false;
      }
      if (sourceFilter && p.source !== sourceFilter) return false;
      if (statusFilter === "active" && !p.active) return false;
      if (statusFilter === "inactive" && p.active) return false;
      if (referenceFilter === "referenced" && p.reference_count === 0) return false;
      if (referenceFilter === "unreferenced" && p.reference_count > 0) return false;
      return true;
    });
  }, [permissionSets, query, sourceFilter, statusFilter, referenceFilter]);

  const columns: TableColumnsType<MetadataPermissionSetSummary> = [
    {
      key: "name",
      title: displayText(shell.metadata_lifecycle_name),
      defaultSortOrder: "ascend",
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, ps) => (
        <Button
          type="link"
          className="metadata-link"
          onClick={() =>
            navigate(`/admin/users-groups/permission_sets/${encodeURIComponent(ps.api_name)}`)
          }
        >
          {displayText(ps.label || undefined, ps.api_name)}
        </Button>
      ),
    },
    {
      key: "status",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      sorter: (a, b) => Number(a.active) - Number(b.active),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
    {
      key: "source",
      dataIndex: "source",
      title: displayText(shell.metadata_source),
      sorter: (a, b) => a.source.localeCompare(b.source),
      render: (s: string) => sourceLabel(s, shell),
    },
    {
      key: "reference_count",
      dataIndex: "reference_count",
      title: displayText(shell.metadata_permission_reference_count),
      align: "right",
      sorter: (a, b) => a.reference_count - b.reference_count,
      render: (n: number) =>
        n > 0 ? (
          n
        ) : (
          <Tag color="warning">{displayText(shell.metadata_permission_orphan)}</Tag>
        ),
    },
    {
      key: "description",
      dataIndex: "description",
      title: displayText(shell.metadata_permission_description),
      render: (d: string) => d || "—",
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/users-groups">{displayText(shell.admin_users_groups)}</Link>
          {" › "}
          <span>{displayText(shell.metadata_permission_sets_title)}</span>
        </p>
      }
      title={displayText(shell.metadata_permission_sets_title)}
    >

      <div className="filter-bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_permission_sets_search_placeholder)}
          onChange={(e) => setQuery(e.target.value)}
          className="filter-bar__max-320"
        />
        <Select
          value={sourceFilter}
          onChange={setSourceFilter}
          className="filter-bar__min-150"
          options={[
            { value: "", label: displayText(shell.metadata_filter_all_sources) },
            ...sourceOptions.map((s) => ({ value: s, label: sourceLabel(s, shell) })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          className="filter-bar__min-150"
          options={[
            { value: "", label: displayText(shell.metadata_filter_all_statuses) },
            { value: "active", label: displayText(shell.metadata_status_active) },
            { value: "inactive", label: displayText(shell.metadata_status_inactive) },
          ]}
        />
        <Select
          value={referenceFilter}
          onChange={setReferenceFilter}
          className="filter-bar__min-150"
          options={[
            { value: "", label: displayText(shell.metadata_reference_filter_all) },
            { value: "referenced", label: displayText(shell.metadata_reference_filter_referenced) },
            {
              value: "unreferenced",
              label: displayText(shell.metadata_reference_filter_unreferenced),
            },
          ]}
        />
        <Button disabled={loading} onClick={() => void load()}>
          {displayText(shell.refresh)}
        </Button>
      </div>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && permissionSets.length === 0 && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      <AdminCompactTable<MetadataPermissionSetSummary>
          rowKey="api_name"
          pagination={false}
          locale={{
            emptyText: adminTableEmptyText(displayText(shell.metadata_empty_permission_sets)),
          }}
          columns={columns}
          dataSource={filtered}
          />
    </AdminPageShell>
  );
}
