import { Button } from "antd";
import { useState } from "react";
import {
  auditTypeForPanel,
  buildExportQuery,
  runAuditExport,
  type AuditExportQuery,
} from "../lib/auditExport";
import { defaultAuditChrome, displayText, type AuditChrome } from "../lib/i18n";

type AuditExportButtonProps = {
  vaultId: string;
  panelKind: string;
  domainId?: string;
  objectName?: string;
  recordId?: string;
  exportAllowed?: boolean;
  exportQuery?: AuditExportQuery;
  chrome?: AuditChrome;
  menuItem?: boolean;
};

export function AuditExportButton({
  vaultId,
  panelKind,
  domainId,
  objectName,
  recordId,
  exportAllowed,
  exportQuery,
  chrome = defaultAuditChrome,
  menuItem = false,
}: AuditExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!exportAllowed) {
    return null;
  }

  async function onExport() {
    setBusy(true);
    setError(null);
    try {
      const auditType = auditTypeForPanel(panelKind);
      const query = {
        ...buildExportQuery(panelKind, {
          objectName,
          recordId,
          domainId,
        }),
        ...exportQuery,
      };
      await runAuditExport(vaultId, auditType, query, domainId, chrome);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(chrome.export_failed));
    } finally {
      setBusy(false);
    }
  }

  if (menuItem) {
    return (
      <button type="button" className="audit-export__menu-item" disabled={busy} onClick={() => void onExport()}>
        {busy ? displayText(chrome.exporting) : displayText(chrome.export_csv)}
      </button>
    );
  }

  return (
    <div className="audit-export">
      <Button disabled={busy} loading={busy} onClick={() => void onExport()}>
        {displayText(chrome.export_csv)}
      </Button>
      {error && <span className="audit-export__error">{error}</span>}
    </div>
  );
}
