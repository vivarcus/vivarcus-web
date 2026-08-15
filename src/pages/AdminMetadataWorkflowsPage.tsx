import { Alert, Button, Input, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataWorkflowSummary } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { filterAndRankByQuery } from "../lib/metadataSearchRank";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataWorkflowsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [workflows, setWorkflows] = useState<MetadataWorkflowSummary[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.metadataWorkflows(vaultId);
      setWorkflows(data.workflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const scoped = workflows.filter((wf) => {
      if (typeFilter === "Object" && wf.workflow_content_type !== "Object") return false;
      if (typeFilter === "Document" && wf.workflow_content_type !== "Document") return false;
      if (statusFilter === "active" && !wf.active) return false;
      if (statusFilter === "inactive" && wf.active) return false;
      return true;
    });
    return filterAndRankByQuery(scoped, query, (wf) => [
      wf.label,
      wf.api_name,
      wf.lifecycle_label,
      wf.lifecycle_api_name,
      wf.description,
      wf.workflow_content_type,
    ]);
  }, [workflows, query, typeFilter, statusFilter]);

  const openWorkflow = useCallback(
    (apiName: string) => navigate(`/admin/configuration/workflows/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const openLifecycle = useCallback(
    (apiName: string) =>
      navigate(`/admin/configuration/object-lifecycles/${encodeURIComponent(apiName)}`),
    [navigate],
  );

  const columns: TableColumnsType<MetadataWorkflowSummary> = [
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_label),
      sorter: (a, b) =>
        displayText(a.label || undefined, a.api_name).localeCompare(
          displayText(b.label || undefined, b.api_name),
        ),
      render: (_v, wf) => (
        <Button type="link" className="metadata-link" onClick={() => openWorkflow(wf.api_name)}>
          {displayText(wf.label || undefined, wf.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => openWorkflow(name)}>
          {name}
        </Button>
      ),
    },
    {
      key: "type",
      dataIndex: "workflow_content_type",
      title: displayText(shell.metadata_workflow_type),
      render: (v: string) =>
        v === "Document"
          ? displayText(shell.metadata_workflow_type_document)
          : displayText(shell.metadata_workflow_type_object),
    },
    {
      key: "lifecycle",
      title: displayText(shell.metadata_workflow_lifecycle),
      render: (_v, wf) => {
        if (!wf.lifecycle_api_name) return "—";
        return (
          <Button
            type="link"
            className="metadata-link"
            onClick={() => openLifecycle(wf.lifecycle_api_name!)}
          >
            {displayText(wf.lifecycle_label || undefined, wf.lifecycle_api_name)}
          </Button>
        );
      },
    },
    {
      key: "status",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
    {
      key: "description",
      dataIndex: "description",
      title: displayText(shell.description),
      render: (v: string) => v || "—",
    },
  ];

  if (!vaultId) return null;

  return (
    <AdminPageShell title={displayText(shell.metadata_workflows_title)}>

      {error && <Alert type="error" title={error} showIcon role="alert" />}

      <div className="filter-bar">
        <Select
          value={typeFilter}
          onChange={(v) => setTypeFilter(v ?? "")}
          options={[
            { value: "", label: displayText(shell.metadata_workflow_type_filter_all) },
            { value: "Object", label: displayText(shell.metadata_workflow_type_object) },
            { value: "Document", label: displayText(shell.metadata_workflow_type_document) },
          ]}
          className="filter-bar__min-150"
        />
        <Input.Search
          allowClear
          value={query}
          placeholder={displayText(shell.metadata_workflows_search_placeholder)}
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

      {loading && workflows.length === 0 ? (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      ) : (
        <AdminCompactTable<MetadataWorkflowSummary>
            wrapClassName="table-wrap--metadata"
            rowKey="api_name"
            pagination={false}
            columns={columns}
            dataSource={filtered}
            locale={{
              emptyText: adminTableEmptyText(displayText(shell.metadata_empty_workflows)),
            }}
          />
      )}
    </AdminPageShell>
  );
}
