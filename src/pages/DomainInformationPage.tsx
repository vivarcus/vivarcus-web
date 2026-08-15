import { Alert, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/pages/domain-information.css";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { api } from "../api/client";
import type { DomainInformationModel, DomainInformationVaultRow } from "../api/types";
import { displayText } from "../lib/i18n";

function displayOrEmpty(value: string | undefined, emptyLabel: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || emptyLabel;
}

export function DomainInformationPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<DomainInformationModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDomainInformation(vaultId);
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

  const columns: ColumnsType<DomainInformationVaultRow> = useMemo(() => {
    if (!model) return [];
    const chrome = model.chrome;
    const empty = displayText(chrome.empty_value);
    return [
      {
        title: displayText(chrome.vault_column),
        dataIndex: "name",
        key: "name",
        render: (value: string) => displayOrEmpty(value, empty),
      },
      {
        title: displayText(chrome.vault_id_column),
        dataIndex: "id",
        key: "id",
        render: (value: string) => displayOrEmpty(value, empty),
      },
      {
        title: displayText(chrome.status_column),
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value: string) => {
          if (value === "Active") return displayText(chrome.status_active);
          if (value === "Inactive") return displayText(chrome.status_inactive);
          return displayOrEmpty(value, empty);
        },
      },
      {
        title: displayText(chrome.pod_column),
        dataIndex: "pod",
        key: "pod",
        width: 160,
        render: (value: string) => displayOrEmpty(value, empty),
      },
    ];
  }, [model]);

  if (loading && !model) {
    return <AdminPageLoading />;
  }

  if (error && !model) {
    return (
      <AdminPageShell title="Domain Information">
        <Alert type="error" showIcon message={error} />
      </AdminPageShell>
    );
  }

  if (!model) {
    return null;
  }

  const chrome = model.chrome;
  const empty = displayText(chrome.empty_value);

  return (
    <AdminPageShell title={displayText(chrome.page_title)}>
      <div className="admin-page__body domain-information__body">
        <RecordSectionBlock title={displayText(chrome.section_title)}>
          <div className="domain-information__info-grid">
            <div className="domain-information__info-row">
              <div className="domain-information__field-label">
                {displayText(chrome.domain_name_label)}
              </div>
              <div className="domain-information__field-value">
                {displayOrEmpty(model.domain_name, empty)}
              </div>
            </div>
            <div className="domain-information__info-row">
              <div className="domain-information__field-label">
                {displayText(chrome.domain_type_label)}
              </div>
              <div className="domain-information__field-value">
                {displayOrEmpty(model.domain_type, empty)}
              </div>
            </div>
          </div>
        </RecordSectionBlock>

        <RecordSectionBlock title={displayText(chrome.vaults_section_title)}>
          <Table<DomainInformationVaultRow>
            className="domain-information__vaults-table"
            rowKey="id"
            size="middle"
            pagination={false}
            columns={columns}
            dataSource={model.vaults}
            locale={{ emptyText: displayText(chrome.empty_vaults) }}
          />
        </RecordSectionBlock>
      </div>
    </AdminPageShell>
  );
}
