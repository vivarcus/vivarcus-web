import { Alert, Button, Input, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataLifecycleBoundObject, MetadataLifecycleSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { DisplayText } from "../lib/i18n";
import { filterAndRankByQuery } from "../lib/metadataSearchRank";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataLifecyclesPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [lifecycles, setLifecycles] = useState<MetadataLifecycleSummary[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataLifecycles(vaultId);
      setLifecycles(data.lifecycles);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setLifecycles([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const scoped = lifecycles.filter((lc) => {
      if (statusFilter === "active" && !lc.active) return false;
      if (statusFilter === "inactive" && lc.active) return false;
      return true;
    });
    return filterAndRankByQuery(scoped, query, (lc) => [
      lc.label,
      lc.api_name,
      ...(lc.objects ?? []).flatMap((o) => [o.label, o.api_name]),
      ...(lc.state_labels ?? []),
    ]);
  }, [lifecycles, query, statusFilter]);

  const openLifecycle = useCallback(
    (apiName: string) =>
      navigate(`/admin/configuration/object-lifecycles/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const openObject = useCallback(
    (apiName: string) => navigate(`/admin/configuration/objects/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const columns: TableColumnsType<MetadataLifecycleSummary> = [
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_label),
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, lc) => (
        <Button type="link" className="metadata-link" onClick={() => openLifecycle(lc.api_name)}>
          {displayText(lc.label || undefined, lc.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => openLifecycle(name)}>
          {name}
        </Button>
      ),
    },
    {
      key: "objects",
      title: displayText(shell.metadata_lifecycle_object),
      render: (_v, lc) => <ObjectLinks objects={lc.objects ?? []} onOpen={openObject} />,
    },
    {
      key: "status",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
    {
      key: "states",
      title: displayText(shell.metadata_lifecycle_states_tab),
      render: (_v, lc) => (
        <StateChipList labels={lc.state_labels ?? []} moreLabel={shell.metadata_more_count} />
      ),
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell title={displayText(shell.metadata_lifecycles_title)}>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      <div className="filter-bar">
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_lifecycles_search_placeholder)}
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

      {loading && lifecycles.length === 0 ? (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      ) : (
        <AdminCompactTable<MetadataLifecycleSummary>
            wrapClassName="table-wrap--metadata"
            rowKey="api_name"
            pagination={false}
            columns={columns}
            dataSource={filtered}
            locale={{
              emptyText: adminTableEmptyText(displayText(shell.metadata_empty_lifecycles)),
            }}
          />
      )}
    </AdminPageShell>
  );
}

function ObjectLinks({
  objects,
  onOpen,
}: {
  objects: MetadataLifecycleBoundObject[];
  onOpen: (apiName: string) => void;
}) {
  if (objects.length === 0) return "—";
  return (
    <span className="lifecycle-list__objects">
      {objects.map((obj, i) => (
        <span key={obj.api_name}>
          {i > 0 ? ", " : null}
          <Button type="link" className="metadata-link" onClick={() => onOpen(obj.api_name)}>
            {displayText(obj.label || undefined, obj.api_name)}
          </Button>
        </span>
      ))}
    </span>
  );
}

const STATE_CHIP_LIMIT = 4;

function StateChipList({
  labels,
  moreLabel,
}: {
  labels: string[];
  moreLabel: DisplayText;
}) {
  if (labels.length === 0) return "—";
  const shown = labels.slice(0, STATE_CHIP_LIMIT);
  const rest = labels.length - shown.length;
  return (
    <span className="metadata-chip-list" title={labels.join(", ")}>
      {shown.map((label) => (
        <span key={label} className="metadata-chip">
          {label}
        </span>
      ))}
      {rest > 0 ? (
        <span className="metadata-chip metadata-chip--more">
          {displayTextTemplate(moreLabel, { count: rest })}
        </span>
      ) : null}
    </span>
  );
}
