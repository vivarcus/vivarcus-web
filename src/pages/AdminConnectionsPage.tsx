import { Alert, Button, Upload, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";
import { recordDetailHref } from "../lib/fields";
import { ObjectListPage } from "./ObjectListPage";

/** Admin > Connections: object list plus Vault-to-Vault file upload. */
export function AdminConnectionsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const chrome = shell.connections;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);

  const onUpload = async (file: File) => {
    if (!vaultId) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await api.uploadConnectionFile(vaultId, file);
      message.success(displayText(chrome.uploaded));
      setListKey((k) => k + 1);
      if (res.record_id) {
        navigate(recordDetailHref(vaultId, "connection__sys", res.record_id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setBusy(false);
    }
    return false;
  };

  return (
    <AdminPageShell>
      {error ? <Alert type="error" message={error} className="admin-page__banner" showIcon /> : null}
      <ObjectListPage
        key={listKey}
        entry="business_admin"
        objectApiName="connection__sys"
        listChrome="admin"
        toolbarLeading={
          <Upload accept=".json,application/json" showUploadList={false} beforeUpload={onUpload} disabled={busy || !vaultId}>
            <Button type="primary" loading={busy}>
              {displayText(chrome.upload_file)}
            </Button>
          </Upload>
        }
      />
    </AdminPageShell>
  );
}
