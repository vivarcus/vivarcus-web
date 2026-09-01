import { Alert, Button, Table } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AgentTraceSession, AgentTracesChrome } from "../api/types";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

export function AdminAgentTracesListPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AgentTraceSession[]>([]);
  const [chrome, setChrome] = useState<AgentTracesChrome | null>(null);

  useEffect(() => {
    if (!vaultId) return;
    setLoading(true);
    void api
      .adminAgentTraces(vaultId)
      .then((data) => {
        setSessions(data.sessions ?? []);
        setChrome(data.chrome);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [vaultId]);

  if (!vaultId) return null;
  if (loading && !chrome) return <AdminPageLoading />;
  const title = chrome ? displayText(chrome.page_title) : "Agent Traces";

  return (
    <AdminPageShell
      title={title}
      variant="list"
      actions={
        <Button type="primary" onClick={() => navigate("/admin/audit-logs/agent_traces/new")}>
          {chrome ? displayText(chrome.create) : "Create"}
        </Button>
      }
    >
      <div className="admin-page__body">
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <Table
          rowKey="id"
          dataSource={sessions}
          pagination={false}
          locale={{ emptyText: chrome ? displayText(chrome.empty) : "No agent traces" }}
          onRow={(row) => ({
            onClick: () => navigate(`/admin/audit-logs/agent_traces/${row.id}`),
            style: { cursor: "pointer" },
          })}
          columns={[
            {
              title: chrome ? displayText(chrome.name) : "Name",
              dataIndex: "name",
              render: (name: string, row: AgentTraceSession) => (
                <Link to={`/admin/audit-logs/agent_traces/${row.id}`}>{name}</Link>
              ),
            },
            {
              title: chrome ? displayText(chrome.trace_for_user) : "Trace for User",
              dataIndex: "trace_for_user",
            },
            {
              title: chrome ? displayText(chrome.status) : "Status",
              dataIndex: "status",
            },
            {
              title: chrome ? displayText(chrome.days_to_expiration) : "Days to Expiration",
              dataIndex: "days_to_expiration",
            },
          ]}
        />
      </div>
    </AdminPageShell>
  );
}
