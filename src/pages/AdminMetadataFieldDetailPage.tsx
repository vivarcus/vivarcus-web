import { Alert, Descriptions, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataFieldDetailModel,
  MetadataNameValuePair,
  MetadataPicklistEntrySummary,
} from "../api/types";
import { GroupedAttributeTable } from "../components/metadata/GroupedAttributeTable";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { Breadcrumb } from "../components/Breadcrumb";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { fieldTypeLabel } from "../lib/metadataFormat";
import { AdminPageShell } from "../components/admin/AdminPageShell";

function attrString(attributes: MetadataNameValuePair[], name: string): string | undefined {
  const hit = attributes.find((a) => a.name === name);
  return typeof hit?.value === "string" && hit.value.trim() ? hit.value.trim() : undefined;
}

function stripPrefix(raw: string, prefix: RegExp): string {
  return raw.replace(prefix, "");
}

/** Attributes already surfaced in the field summary Descriptions — omit from the dump below. */
const FIELD_SUMMARY_ATTR_NAMES = new Set([
  "label",
  "name",
  "type",
  "required",
  "unique",
  "active",
  "list_column",
  "editable",
  "picklist",
  "object",
  "help_content",
]);

export function AdminMetadataFieldDetailPage() {
  const { objectName = "", fieldName = "" } = useParams();
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataFieldDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !objectName || !fieldName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataFieldDetail(vaultId, objectName, fieldName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, objectName, fieldName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const referenceItems = useMemo(() => {
    if (!model) return [] as { key: string; label: string; children: ReactNode }[];
    const items: { key: string; label: string; children: ReactNode }[] = [];
    const picklistApi =
      model.picklist_api_name ||
      (() => {
        const raw = attrString(model.attributes, "picklist");
        return raw ? stripPrefix(raw, /^Picklist\./i) : undefined;
      })();
    if (picklistApi) {
      items.push({
        key: "picklist",
        label: displayText(shell.metadata_picklist_ref),
        children: (
          <Link
            className="metadata-link mono"
            to={`/admin/configuration/picklists/${encodeURIComponent(picklistApi)}`}
          >
            {picklistApi}
          </Link>
        ),
      });
    }
    const objectRaw = attrString(model.attributes, "object");
    if (objectRaw) {
      const apiName = stripPrefix(objectRaw, /^Object\./i).split(".")[0] || objectRaw;
      items.push({
        key: "object",
        label: displayText(shell.metadata_lifecycle_object),
        children: (
          <Link
            className="metadata-link mono"
            to={`/admin/configuration/objects/${encodeURIComponent(apiName)}`}
          >
            {objectRaw}
          </Link>
        ),
      });
    }
    return items;
  }, [model, shell.metadata_lifecycle_object, shell.metadata_picklist_ref]);

  const detailAttributes = useMemo(() => {
    if (!model) return [];
    return model.attributes.filter((a) => !FIELD_SUMMARY_ATTR_NAMES.has(a.name));
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

  const yesNo = (v: boolean | undefined) =>
    v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no);
  const objectLabel = model?.object_label || objectName;
  const picklistEntries = model?.picklist_entries ?? [];

  return (
    <AdminPageShell
      breadcrumb={
        <Breadcrumb
          items={[
            { label: displayText(shell.admin_configuration), to: "/admin/configuration" },
            {
              label: displayText(shell.metadata_objects_title),
              to: "/admin/configuration/objects",
            },
            {
              label: objectLabel,
              to: `/admin/configuration/objects/${encodeURIComponent(objectName)}`,
            },
            { label: model?.label || fieldName },
          ]}
        />
      }
      title={
        <>
          {displayText(shell.metadata_field_detail_title)}: {model?.label || fieldName}
        </>
      }
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
            labelStyle={{ width: 160 }}
            items={[
              { key: "label", label: displayText(shell.metadata_field_label), children: model.label },
              {
                key: "api_name",
                label: displayText(shell.metadata_field_name),
                children: <span className="mono">{model.api_name}</span>,
              },
              {
                key: "type",
                label: displayText(shell.metadata_type),
                children: fieldTypeLabel(model.type, shell),
              },
              { key: "required", label: displayText(shell.metadata_required), children: yesNo(model.required) },
              { key: "unique", label: displayText(shell.metadata_unique), children: yesNo(model.unique) },
              { key: "active", label: displayText(shell.metadata_active), children: yesNo(model.active) },
              {
                key: "list_column",
                label: displayText(shell.metadata_list_column),
                children: yesNo(model.list_column),
              },
              {
                key: "editable",
                label: displayText(shell.metadata_field_editable),
                children: yesNo(model.editable),
              },
              ...referenceItems,
              ...(model.help_content
                ? [
                    {
                      key: "help",
                      label: displayText(shell.metadata_field_help),
                      children: model.help_content,
                    },
                  ]
                : []),
            ]}
          />

          {picklistEntries.length > 0 || model.picklist_api_name ? (
            <section className="page-section">
              <h2>{displayText(shell.metadata_picklist_entries)}</h2>
              <AdminCompactTable
                rowKey="api_name"
                columns={entryColumns}
                dataSource={picklistEntries}
                pagination={picklistEntries.length > 50 ? { pageSize: 50 } : false}
                locale={{
                  emptyText: adminTableEmptyText(
                    displayText(shell.metadata_empty_picklist_entries),
                  ),
                }}
              />
            </section>
          ) : null}

          {detailAttributes.length > 0 ? (
            <section className="page-section">
              <h2>{displayText(shell.metadata_attributes)}</h2>
              <GroupedAttributeTable attributes={detailAttributes} mode="field" />
            </section>
          ) : null}
        </>
      )}
    </AdminPageShell>
  );
}
