import { Alert, Tooltip } from "antd";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import "../styles/pages/vault-information.css";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { api } from "../api/client";
import type { VaultInformationModel } from "../api/types";
import { displayText } from "../lib/i18n";

function displayOrEmpty(value: string | undefined, emptyLabel: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || emptyLabel;
}

export function VaultInformationPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<VaultInformationModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVaultInformation(vaultId);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!data.vault_url && origin) {
        data.vault_url = origin;
      }
      setModel(data);
    } catch (err) {
      setModel(null);
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return (
      <AdminPageShell title="Vault Information">
        <Alert type="error" showIcon message={error} />
      </AdminPageShell>
    );
  }

  if (!model) {
    return null;
  }

  const chrome = model.chrome;
  const empty = displayText(chrome.empty_value);

  const versionHoverParts: string[] = [];
  if (model.assembly_version?.trim()) {
    versionHoverParts.push(`${displayText(chrome.assembly_version_label)}: ${model.assembly_version}`);
  }
  if (model.platform_version?.trim()) {
    versionHoverParts.push(`${displayText(chrome.platform_version_label)}: ${model.platform_version}`);
  }
  const versionNode =
    versionHoverParts.length > 0 ? (
      <Tooltip title={<span className="vault-information__tooltip-preline">{versionHoverParts.join("\n")}</span>}>
        <span className="vault-information__version-value">
          {displayOrEmpty(model.vault_version, empty)}
        </span>
      </Tooltip>
    ) : (
      <span>{displayOrEmpty(model.vault_version, empty)}</span>
    );

  const rows: { label: string; value: ReactNode }[] = [
    { label: displayText(chrome.domain_name_label), value: displayOrEmpty(model.domain_name, empty) },
    { label: displayText(chrome.vault_id_label), value: displayOrEmpty(model.vault_id, empty) },
    { label: displayText(chrome.vault_name_label), value: displayOrEmpty(model.vault_name, empty) },
    { label: displayText(chrome.vault_version_label), value: versionNode },
    { label: displayText(chrome.vault_url_label), value: displayOrEmpty(model.vault_url, empty) },
    { label: displayText(chrome.pod_label), value: displayOrEmpty(model.pod, empty) },
    {
      label: displayText(chrome.geographic_region_label),
      value: displayOrEmpty(model.geographic_region, empty),
    },
    {
      label: displayText(chrome.residency_region_label),
      value: displayOrEmpty(model.residency_region, empty),
    },
  ];

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      <div className="admin-page__body vault-information__body">
        <RecordSectionBlock>
          <div className="vault-information__info-grid">
            {rows.map((row) => (
              <div key={row.label} className="vault-information__info-row">
                <div className="vault-information__field-label">{row.label}</div>
                <div className="vault-information__field-value">{row.value}</div>
              </div>
            ))}
          </div>
        </RecordSectionBlock>
      </div>
    </AdminPageShell>
  );
}
