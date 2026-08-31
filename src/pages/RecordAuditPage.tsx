import { useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import { RecordAuditPanel } from "../components/RecordAuditPanel";
import { RecordPageHeader } from "../components/record/RecordPageHeader";
import { RecordPageBody, RecordPageShell } from "../components/record/RecordPageShell";
import { useUi } from "../context/UiContext";
import { defaultPageMessages, displayText } from "../lib/i18n";
import { defaultAuditChrome, type AuditChrome } from "../lib/i18n/chromeTypes";
import { formatAuditRecordCellLabel } from "../lib/recordAuditDisplay";
import { getLastTab, type RecordNavState } from "../lib/vaultNav";
import { useTabLabel } from "../lib/useTabLabel";

export function RecordAuditPage() {
  const vaultId = useVaultId();
  const { objectName, recordId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { shell } = useUi();
  const [auditChrome, setAuditChrome] = useState<AuditChrome>(defaultAuditChrome);

  const layout = searchParams.get("layout") ?? undefined;
  const navState = (location.state as RecordNavState | null) ?? {};
  const tabApiName =
    searchParams.get("tab") ?? navState.tabApiName ?? (vaultId ? getLastTab(vaultId) : undefined);
  const tabLabel = useTabLabel(tabApiName, navState.tabLabel);

  if (!vaultId || !objectName || !recordId) {
    return null;
  }

  const recordPath = `/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}`;
  const recordQuery = new URLSearchParams();
  if (layout) recordQuery.set("layout", layout);
  if (tabApiName) recordQuery.set("tab", tabApiName);
  const recordHref = recordQuery.toString() ? `${recordPath}?${recordQuery}` : recordPath;

  const listHref = tabApiName ? `/tabs/${encodeURIComponent(tabApiName)}` : "/";

  const hasNavLabels = Boolean(navState.objectLabel?.trim() && navState.recordDisplayName?.trim());
  const objectLabel = navState.objectLabel ?? objectName;
  const recordDisplayName = navState.recordDisplayName ?? recordId;
  const recordLabel = `${objectLabel}: ${recordDisplayName}`;
  const recordCell = hasNavLabels
    ? formatAuditRecordCellLabel(objectLabel, recordDisplayName)
    : undefined;
  const trailTitle = displayText(auditChrome.trail_title);

  return (
    <RecordPageShell
      header={
        <RecordPageHeader
          breadcrumb={[
            { label: tabLabel ?? displayText(defaultPageMessages.list_fallback), to: listHref },
            { label: displayText(shell.return_to_record), to: recordHref },
            { label: trailTitle },
          ]}
          title={trailTitle}
          meta={hasNavLabels ? <p className="page-header__meta">{recordLabel}</p> : undefined}
        />
      }
      body={
        <RecordPageBody>
          <RecordAuditPanel
            vaultId={vaultId}
            objectName={objectName}
            recordId={recordId}
            recordCell={recordCell}
            onChromeChange={setAuditChrome}
          />
        </RecordPageBody>
      }
    />
  );
}
