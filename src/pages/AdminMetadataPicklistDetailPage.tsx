import { Alert, Descriptions, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataPicklistDetailModel, MetadataPicklistEntrySummary } from "../api/types";
import { AttributeTable } from "../components/metadata/AttributeTable";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";

const SUMMARY_ATTR_NAMES = new Set([
  "label",
  "name",
  "active",
  "can_add_values",
  "can_reorder_values",
]);

export function AdminMetadataPicklistDetailPage() {
  const { picklistName = "" } = useParams();
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataPicklistDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !picklistName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataPicklistDetail(vaultId, picklistName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, picklistName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const detailAttributes = useMemo(() => {
    if (!model) return [];
    return model.attributes.filter((a) => !SUMMARY_ATTR_NAMES.has(a.name));
  }, [model]);

  const entryColumns: TableColumnsType<MetadataPicklistEntrySummary> = [
    {
      key: "order",
      dataIndex: "order",
      title: displayText(shell.metadata_picklist_entry_order),
      width: 80,
    },
    {
      key: "label",
      dataIndex: "label",
      title: displayText(shell.metadata_picklist_entry_label),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_picklist_entry_name),
      className: "mono",
    },
    {
      key: "active",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      width: 100,
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
  ];

  if (!vaultId) return null;

  const title = model ? displayText(model.label || undefined, model.api_name) : picklistName;
  const yesNo = (v: boolean) =>
    v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no);

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/picklists">
            {displayText(shell.metadata_picklists_title)}
          </Link>
          {" › "}
          <span>{title}</span>
        </p>
      }
      title={title}
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      {model && (
        <>
          <Descriptions
            className="page-section"
            bordered
            size="small"
            column={2}
            labelStyle={{ width: 180 }}
            items={[
              {
                key: "label",
                label: displayText(shell.metadata_lifecycle_label),
                children: model.label,
              },
              {
                key: "api_name",
                label: displayText(shell.metadata_lifecycle_name),
                children: <span className="mono">{model.api_name}</span>,
              },
              {
                key: "active",
                label: displayText(shell.metadata_status),
                children: model.active
                  ? displayText(shell.metadata_status_active)
                  : displayText(shell.metadata_status_inactive),
              },
              {
                key: "source",
                label: displayText(shell.metadata_source),
                children: sourceLabel(model.source, shell),
              },
              {
                key: "can_add",
                label: displayText(shell.metadata_picklist_can_add_values),
                children: yesNo(model.can_add_values),
              },
              {
                key: "can_reorder",
                label: displayText(shell.metadata_picklist_can_reorder_values),
                children: yesNo(model.can_reorder_values),
              },
            ]}
          />

          <section className="page-section">
            <h2>{displayText(shell.metadata_picklist_entries)}</h2>
            <AdminCompactTable
              rowKey="api_name"
              columns={entryColumns}
              dataSource={model.entries}
              pagination={model.entries.length > 50 ? { pageSize: 50 } : false}
              locale={{
                emptyText: adminTableEmptyText(
                  displayText(shell.metadata_empty_picklist_entries),
                ),
              }}
            />
          </section>

          {detailAttributes.length > 0 ? (
            <section className="page-section">
              <h2>{displayText(shell.metadata_attributes)}</h2>
              <AttributeTable attributes={detailAttributes} />
            </section>
          ) : null}
        </>
      )}
    </AdminPageShell>
  );
}
