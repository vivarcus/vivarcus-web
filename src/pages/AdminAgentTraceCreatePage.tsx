import { Alert, Button, Form, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AgentTracesChrome } from "../api/types";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

export function AdminAgentTraceCreatePage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const [chrome, setChrome] = useState<AgentTracesChrome | null>(null);
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    if (!vaultId) return;
    void api.adminAgentTraces(vaultId).then((data) => {
      setChrome(data.chrome);
      setUsers(data.users ?? []);
    });
  }, [vaultId]);

  if (!vaultId) return null;
  if (!chrome) return <AdminPageLoading />;

  const save = async () => {
    if (!userId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.adminAgentTraceCreate(vaultId, {
        name: name.trim(),
        trace_for_user_id: userId,
      });
      navigate(`/admin/audit-logs/agent_traces/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      <div className="admin-page__body admin-settings-form__body">
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <Form layout="vertical" className="admin-settings-form">
          <Form.Item label={displayText(chrome.name)} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Item>
          <Form.Item label={displayText(chrome.trace_for_user)} required>
            <Select
              showSearch
              placeholder="Search name or username"
              optionFilterProp="label"
              filterOption={(input, option) => {
                const q = input.trim().toLowerCase();
                return String(option?.label ?? "")
                  .toLowerCase()
                  .includes(q);
              }}
              filterSort={(a, b, info) => {
                const q = (info?.searchValue ?? "").trim().toLowerCase();
                const score = (label: unknown) => {
                  const text = String(label ?? "").toLowerCase();
                  if (!q) return 1;
                  const wrapped = text.match(/\(([^)]+)\)\s*$/);
                  const username = wrapped?.[1] ?? text;
                  const local = username.split("@")[0] ?? "";
                  if (local === q) return 0;
                  if (username.startsWith(q)) return 1;
                  return 2;
                };
                const delta = score(a.label) - score(b.label);
                if (delta !== 0) return delta;
                return String(a.label).localeCompare(String(b.label));
              }}
              value={userId}
              onChange={setUserId}
              options={users.map((u) => ({ value: u.id, label: u.label }))}
            />
          </Form.Item>
          <Button type="primary" loading={saving} disabled={!name.trim() || !userId} onClick={() => void save()}>
            {displayText(chrome.save)}
          </Button>
        </Form>
      </div>
    </AdminPageShell>
  );
}
