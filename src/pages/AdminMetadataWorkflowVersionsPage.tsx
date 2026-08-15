import { Alert, Button, Spin, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataWorkflowVersionListItem, MetadataWorkflowVersionListModel } from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, formatFieldDisplayValue } from "../lib/i18n";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataWorkflowVersionsPage() {
  const { workflowName = "" } = useParams();
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell, displayContext } = useUi();
  const [model, setModel] = useState<MetadataWorkflowVersionListModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !workflowName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataWorkflowVersions(vaultId, workflowName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, workflowName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const title = model ? displayText(model.label || undefined, model.api_name) : workflowName;
  const workingCopyHref = `/admin/configuration/workflows/${encodeURIComponent(workflowName)}`;
  const openVersion = (version: number) =>
    navigate(`${workingCopyHref}/versions/${version}`);

  const columns: TableColumnsType<MetadataWorkflowVersionListItem> = [
    {
      key: "definition_version",
      dataIndex: "definition_version",
      title: displayText(shell.metadata_workflow_version),
      width: 120,
      render: (version: number, row) => (
        <Button type="link" className="metadata-link" onClick={() => openVersion(version)}>
          {version}
          {row.live ? (
            <>
              {" "}
              <Tag color="success">{displayText(shell.metadata_workflow_version_live)}</Tag>
            </>
          ) : null}
        </Button>
      ),
    },
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_label),
      render: (_v, row) => (
        <Button type="link" className="metadata-link" onClick={() => openVersion(row.definition_version)}>
          {row.label || title}
        </Button>
      ),
    },
    {
      key: "activated_at",
      dataIndex: "activated_at",
      title: displayText(shell.metadata_workflow_activated),
      render: (value: string) => formatFieldDisplayValue(value, "DateTime", displayContext) || value || "—",
    },
  ];

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/workflows">
            {displayText(shell.metadata_workflows_title)}
          </Link>
          {" › "}
          <Link to={workingCopyHref}>{title}</Link>
          {" › "}
          <span>{displayText(shell.metadata_workflow_versions_title)}</span>
        </p>
      }
      title={displayText(shell.metadata_workflow_versions_title)}
    >
      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}
      {model && (
        <AdminCompactTable<MetadataWorkflowVersionListItem>
          wrapClassName="table-wrap--metadata"
          rowKey="definition_version"
          pagination={false}
          columns={columns}
          dataSource={model.versions}
          locale={{
            emptyText: adminTableEmptyText(displayText(shell.metadata_empty_workflow_versions)),
          }}
        />
      )}
    </AdminPageShell>
  );
}
