import { Alert, Button, Upload, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { recordDetailHref } from "../lib/fields";
import { ObjectListPage } from "./ObjectListPage";

/** Admin > Deployment > Inbound Packages: object list shell + Import list action. */
export function AdminInboundPackagesPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const cfg = shell.cfg_packaging;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);

  const onUpload = async (file: File) => {
    if (!vaultId) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await api.importInboundPackage(vaultId, file);
      message.success(displayTextTemplate(cfg.imported_package, { name: res.name }));
      setListKey((k) => k + 1);
      const omId = res.om_record_id?.trim();
      if (omId) {
        navigate(recordDetailHref(vaultId, "vault_package__v", omId));
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
        objectApiName="vault_package__v"
        listChrome="admin"
        hideCreate
        toolbarLeading={
          <Upload accept=".vpk,application/zip" showUploadList={false} beforeUpload={onUpload} disabled={busy || !vaultId}>
            <Button type="primary" loading={busy}>
              {displayText(cfg.import_package)}
            </Button>
          </Upload>
        }
      />
    </AdminPageShell>
  );
}
