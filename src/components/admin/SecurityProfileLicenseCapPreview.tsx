import { Alert, Select, Spin, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import type { LicenseCapPreviewModel, PermissionEntryRef } from "../../api/types";
import { displayText } from "../../lib/i18n";
import type { ShellChrome } from "../../lib/i18n";

const LICENSE_TYPES = [
  { value: "full_user", label: "Full User" },
  { value: "read_only_user", label: "Read Only User" },
  { value: "external_user", label: "External User" },
  { value: "site_user", label: "Site User" },
] as const;

type Props = {
  vaultId: string;
  securityProfileApiName: string;
  shell: ShellChrome;
};

function formatEntry(entry: PermissionEntryRef): string {
  const actions = entry.actions?.length ? entry.actions.join(", ") : "—";
  return `${entry.resource_path} (${actions})`;
}

/** Shows license-type cap suppression for a Security Profile (SEC-21-UI). */
export function SecurityProfileLicenseCapPreview({ vaultId, securityProfileApiName, shell }: Props) {
  const [licenseType, setLicenseType] = useState<string>("read_only_user");
  const [preview, setPreview] = useState<LicenseCapPreviewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId || !securityProfileApiName || !licenseType) return;
    setLoading(true);
    setError(null);
    try {
      setPreview(
        await api.licenseCapPreview(vaultId, {
          licenseType,
          securityProfileApiName,
        }),
      );
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, securityProfileApiName, licenseType, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumnsType<PermissionEntryRef> = [
    {
      key: "resource_path",
      title: "Resource",
      dataIndex: "resource_path",
      render: (v: string) => <span className="mono">{v}</span>,
    },
    {
      key: "actions",
      title: "Actions",
      dataIndex: "actions",
      render: (actions: string[]) => (actions?.length ? actions.join(", ") : "—"),
    },
  ];

  return (
    <div className="security-profile-cap-preview" data-testid="license-cap-preview">
      <div className="security-profile-cap-preview__toolbar">
        <label htmlFor="license-cap-preview-type">
          License Type
          <Select
            id="license-cap-preview-type"
            className="security-profile-cap-preview__select"
            value={licenseType}
            options={LICENSE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            onChange={setLicenseType}
          />
        </label>
      </div>
      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !preview && <Spin />}
      {preview && (
        <>
          <p className="security-profile-cap-preview__summary">
            Suppressed by cap: <Tag color="warning">{preview.suppressed_by_cap.length}</Tag>
            Effective entries: <Tag>{preview.effective.length}</Tag>
          </p>
          <Table<PermissionEntryRef>
            size="small"
            rowKey={(row) => `${row.resource_path}:${row.actions?.join(",") ?? ""}`}
            columns={columns}
            dataSource={preview.suppressed_by_cap}
            pagination={false}
            locale={{ emptyText: "No permissions suppressed by license cap" }}
          />
          {preview.suppressed_by_cap.length > 0 && (
            <ul className="security-profile-cap-preview__list" aria-label="Suppressed permissions">
              {preview.suppressed_by_cap.map((entry) => (
                <li key={formatEntry(entry)}>{formatEntry(entry)}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
