import { Alert, Button, Input, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataSecurityProfileSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

/** Veeva-aligned Security Profiles list: Name / Status / Source / Description (+ PS count). */
export function AdminMetadataSecurityProfilesPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [profiles, setProfiles] = useState<MetadataSecurityProfileSummary[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataSecurityProfiles(vaultId);
      setProfiles(data.security_profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceOptions = useMemo(() => {
    const present = new Set(profiles.map((p) => p.source));
    return Array.from(present).sort();
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (q && !p.api_name.toLowerCase().includes(q) && !p.label.toLowerCase().includes(q)) {
        return false;
      }
      if (sourceFilter && p.source !== sourceFilter) return false;
      if (statusFilter === "active" && !p.active) return false;
      if (statusFilter === "inactive" && p.active) return false;
      return true;
    });
  }, [profiles, query, sourceFilter, statusFilter]);

  const openProfile = useCallback(
    (apiName: string) =>
      navigate(`/admin/users-groups/security_profiles/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const columns: TableColumnsType<MetadataSecurityProfileSummary> = [
    {
      key: "name",
      title: displayText(shell.metadata_lifecycle_name),
      defaultSortOrder: "ascend",
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, p) => (
        <Button type="link" className="metadata-link" onClick={() => openProfile(p.api_name)}>
          {displayText(p.label || undefined, p.api_name)}
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
      key: "permission_set_count",
      dataIndex: "permission_set_count",
      title: displayText(shell.metadata_security_profile_ps_count),
      align: "right",
      sorter: (a, b) => a.permission_set_count - b.permission_set_count,
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
          <span>{displayText(shell.metadata_security_profiles_title)}</span>
        </p>
      }
      title={displayText(shell.metadata_security_profiles_title)}
    >

      <div className="filter-bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_security_profiles_search_placeholder)}
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
        <Button disabled={loading} onClick={() => void load()}>
          {displayText(shell.refresh)}
        </Button>
      </div>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && profiles.length === 0 && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      <AdminCompactTable<MetadataSecurityProfileSummary>
          rowKey="api_name"
          pagination={false}
          locale={{
            emptyText: adminTableEmptyText(displayText(shell.metadata_empty_security_profiles)),
          }}
          columns={columns}
          dataSource={filtered}
          />
    </AdminPageShell>
  );
}
