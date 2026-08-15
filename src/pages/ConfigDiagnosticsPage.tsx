import { Alert, Button, Input, Select, Spin, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { api } from "../api/client";
import type { ConfigDiagnosticsModel } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

const SEVERITIES = ["", "info", "warning", "error", "fatal"];

function severityTagColor(severity: string): "default" | "warning" | "error" | "processing" {
  switch (severity) {
    case "warning":
      return "warning";
    case "error":
    case "fatal":
      return "error";
    case "info":
      return "processing";
    default:
      return "default";
  }
}

/** Configuration Diagnostics list — Vivarcus extension under Configuration hub. */
export function ConfigDiagnosticsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<ConfigDiagnosticsModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [componentType, setComponentType] = useState("");
  const [issueCode, setIssueCode] = useState("");
  const [route, setRoute] = useState("");

  const load = useCallback(
    async (pageToken?: string) => {
      if (!vaultId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.configDiagnostics(vaultId, {
          severity: severity || undefined,
          component_type: componentType || undefined,
          issue_code: issueCode || undefined,
          route: route || undefined,
          page_token: pageToken,
          page_size: 100,
        });
        setModel(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : displayText(shell.load_diagnostics_failed));
      } finally {
        setLoading(false);
      }
    },
    [vaultId, severity, componentType, issueCode, route, shell.load_diagnostics_failed],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) {
    return null;
  }

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration">{displayText(shell.admin_configuration)}</Link>
          {" › "}
          <span>{displayText(shell.admin_config_diagnostics)}</span>
        </p>
      }
      title={displayText(shell.admin_config_diagnostics)}
      meta={
        model ? (
          <p className="page-header__meta">
            {displayText(shell.projection_status_prefix)} {model.projection.status}
            {model.projection.last_error && ` · ${model.projection.last_error}`}
          </p>
        ) : undefined
      }
    >

      <div className="filter-bar">
        <Select
          value={severity || undefined}
          allowClear
          placeholder={displayText(shell.all_severities)}
          className="filter-bar__min-140"
          options={SEVERITIES.filter(Boolean).map((s) => ({ value: s, label: s }))}
          onChange={(value) => setSeverity(value ?? "")}
        />
        <Input
          allowClear
          value={componentType}
          placeholder={displayText(shell.component_type_example)}
          onChange={(e) => setComponentType(e.target.value)}
          className="filter-bar__max-180"
        />
        <Input
          allowClear
          value={issueCode}
          placeholder={displayText(shell.issue_code)}
          onChange={(e) => setIssueCode(e.target.value)}
          className="filter-bar__max-180"
        />
        <Input
          allowClear
          value={route}
          placeholder={displayText(shell.route_label)}
          onChange={(e) => setRoute(e.target.value)}
          className="filter-bar__max-180"
        />
        <Button disabled={loading} onClick={() => void load()}>
          {displayText(shell.filter)}
        </Button>
      </div>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading_diagnostics)} className="page-loading page__loading" />
      )}

      {model && (
        <>
          <AdminCompactTable
              rowKey="issue_id"
              locale={{
                emptyText: adminTableEmptyText(displayText(shell.no_config_issues)),
              }}
              columns={[
                {
                  key: "severity",
                  dataIndex: "severity",
                  title: displayText(shell.severity),
                  render: (value: string) => (
                    <Tag color={severityTagColor(value)}>{value}</Tag>
                  ),
                },
                {
                  key: "component_type",
                  dataIndex: "component_type",
                  title: displayText(shell.component),
                },
                {
                  key: "component_locator",
                  dataIndex: "component_locator",
                  title: displayText(shell.locator),
                  className: "mono",
                },
                {
                  key: "issue_code",
                  dataIndex: "issue_code",
                  title: displayText(shell.issue_code),
                  className: "mono",
                },
                {
                  key: "message",
                  dataIndex: "message",
                  title: displayText(shell.description),
                },
                {
                  key: "affected_route",
                  dataIndex: "affected_route",
                  title: displayText(shell.route_label),
                  className: "mono",
                  render: (value: string | undefined) =>
                    value ?? displayText(shell.empty_value),
                },
              ]}
              dataSource={model.issues}
            />
          {model.pagination.next_page_token && (
            <div className="pagination-bar">
              <Button
                disabled={loading}
                onClick={() => void load(model.pagination.next_page_token)}
              >
                {displayText(shell.next_page)}
              </Button>
            </div>
          )}
        </>
      )}
    </AdminPageShell>
  );
}
