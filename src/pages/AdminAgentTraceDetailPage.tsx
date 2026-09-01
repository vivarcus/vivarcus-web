import { Alert, Button, Modal, Select, Table } from "antd";
import { CloudDownloadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AgentTraceDetailRow, AgentTraceSession, AgentTracesChrome } from "../api/types";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAgentTraceDetailPage() {
  const vaultId = useVaultId();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AgentTraceSession | null>(null);
  const [details, setDetails] = useState<AgentTraceDetailRow[]>([]);
  const [chrome, setChrome] = useState<AgentTracesChrome | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vaultId || !id) return;
    setLoading(true);
    try {
      const data = await api.adminAgentTraceGet(vaultId, id);
      setSession(data.session);
      setDetails(data.details ?? []);
      setChrome(data.chrome);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [vaultId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId || !id) return null;
  if (loading && !session) return <AdminPageLoading />;
  if (!chrome || !session) {
    return (
      <AdminPageShell title="Agent Traces">
        {error ? <Alert type="error" title={error} showIcon /> : null}
      </AdminPageShell>
    );
  }

  const statusValue = session.status.toLowerCase() === "inactive" ? "inactive" : "active";

  return (
    <AdminPageShell title={session.name}>
      <div className="admin-page__body admin-settings-form__body">
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <RecordSectionBlock
          title={displayText(chrome.details)}
          headerExtra={
            <Button onClick={() => setResetOpen(true)}>{displayText(chrome.reset_trace)}</Button>
          }
        >
          <dl className="admin-token-usage__dl">
            <div>
              <dt>{displayText(chrome.name)}</dt>
              <dd>{session.name}</dd>
            </div>
            <div>
              <dt>{displayText(chrome.trace_for_user)}</dt>
              <dd>{session.trace_for_user}</dd>
            </div>
            <div>
              <dt>{displayText(chrome.days_to_expiration)}</dt>
              <dd>{session.days_to_expiration}</dd>
            </div>
            <div>
              <dt>{displayText(chrome.status)}</dt>
              <dd>
                <Select
                  value={statusValue}
                  disabled={busy}
                  style={{ minWidth: 140 }}
                  options={[
                    { value: "active", label: displayText(chrome.status_active) },
                    { value: "inactive", label: displayText(chrome.status_inactive) },
                  ]}
                  onChange={(value) => {
                    setBusy(true);
                    void api
                      .adminAgentTracePatch(vaultId, id, { status: value })
                      .then((next) => setSession(next))
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Failed to update"),
                      )
                      .finally(() => setBusy(false));
                  }}
                />
              </dd>
            </div>
            <div>
              <dt>{displayText(chrome.created_date)}</dt>
              <dd>{new Date(session.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </RecordSectionBlock>
        <RecordSectionBlock
          title={displayText(chrome.trace_details)}
          headerExtra={
            <Button
              onClick={() => {
                void api.adminAgentTraceDownloadAll(vaultId, id).then((blob) => {
                  saveBlob(blob, `agent-trace-session-${id}.json`);
                });
              }}
            >
              {displayText(chrome.download_all)}
            </Button>
          }
        >
          <Table
            rowKey="id"
            dataSource={details}
            pagination={false}
            scroll={{ x: true }}
            locale={{ emptyText: displayText(chrome.empty_details) }}
            columns={[
              { title: displayText(chrome.date_time_utc), dataIndex: "date_time_utc" },
              { title: displayText(chrome.agent), dataIndex: "agent" },
              { title: displayText(chrome.action), dataIndex: "action" },
              { title: displayText(chrome.chat_id), dataIndex: "chat_id" },
              { title: displayText(chrome.trace_session_id), dataIndex: "trace_session_id", ellipsis: true },
              {
                title: displayText(chrome.download),
                dataIndex: "id",
                render: (detailId: string) => (
                  <Button
                    type="text"
                    icon={<CloudDownloadOutlined />}
                    aria-label={displayText(chrome.download)}
                    onClick={() => {
                      void api.adminAgentTraceDownloadDetail(vaultId, id, detailId).then((blob) => {
                        saveBlob(blob, `agent-trace-${detailId}.json`);
                      });
                    }}
                  />
                ),
              },
            ]}
          />
        </RecordSectionBlock>
        <Button type="link" onClick={() => navigate("/admin/audit-logs/agent_traces")}>
          {displayText(chrome.page_title)}
        </Button>
      </div>
      <Modal
        title={displayText(chrome.reset_title)}
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        footer={
          <>
            <Button onClick={() => setResetOpen(false)}>{displayText(chrome.cancel)}</Button>
            <Button
              type="primary"
              loading={busy}
              onClick={() => {
                setBusy(true);
                void api
                  .adminAgentTraceReset(vaultId, id)
                  .then(() => {
                    setResetOpen(false);
                    return load();
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to reset"))
                  .finally(() => setBusy(false));
              }}
            >
              {displayText(chrome.continue)}
            </Button>
          </>
        }
      >
        <p>{displayText(chrome.reset_body)}</p>
      </Modal>
    </AdminPageShell>
  );
}
