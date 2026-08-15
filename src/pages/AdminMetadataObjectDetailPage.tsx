import { Alert, Button, Checkbox, Collapse, Descriptions, Input, Select, Spin, Tabs, Tag } from "antd";
import type { CollapseProps, TableColumnsType, TabsProps } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataFieldSummary,
  MetadataInboundRelationshipSummary,
  MetadataNameValuePair,
  MetadataObjectActionSummary,
  MetadataObjectDetailModel,
  MetadataObjectLayout,
  MetadataObjectListLayoutColumn,
  MetadataObjectRelationshipsModel,
  MetadataOutboundRelationshipSummary,
  MetadataSharingRuleRole,
  MetadataSharingRuleSummary,
} from "../api/types";
import { LayoutSectionsView } from "../components/metadata/LayoutSectionsView";
import { ObjectTypesMatrix } from "../components/metadata/ObjectTypesMatrix";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";
import { AdminCompactTable } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

export function AdminMetadataObjectDetailPage() {
  const { objectName = "" } = useParams();
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataObjectDetailModel | null>(null);
  const [layouts, setLayouts] = useState<MetadataObjectLayout[]>([]);
  const [actions, setActions] = useState<MetadataObjectActionSummary[]>([]);
  const [relationships, setRelationships] = useState<MetadataObjectRelationshipsModel | null>(null);
  const [sharingRules, setSharingRules] = useState<MetadataSharingRuleSummary[]>([]);
  const [fieldQuery, setFieldQuery] = useState("");
  const [fieldTypeFilter, setFieldTypeFilter] = useState("");
  const [fieldRequiredFilter, setFieldRequiredFilter] = useState("");
  const [fieldActiveFilter, setFieldActiveFilter] = useState("");
  const [fieldListColumnFilter, setFieldListColumnFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !objectName) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, layoutModel, actionModel, relModel, sharingRulesModel] = await Promise.all([
        api.metadataObjectDetail(vaultId, objectName),
        api.metadataObjectLayouts(vaultId, objectName),
        api.metadataObjectActions(vaultId, objectName),
        api.metadataObjectRelationships(vaultId, objectName),
        api.metadataObjectSharingRules(vaultId, objectName),
      ]);
      setModel(detail);
      setLayouts(layoutModel.layouts);
      setActions(actionModel.actions);
      setRelationships(relModel);
      setSharingRules(sharingRulesModel.sharing_rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
      setLayouts([]);
      setActions([]);
      setRelationships(null);
      setSharingRules([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, objectName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const fieldTypeOptions = useMemo(() => {
    if (!model) return [];
    const seen = new Set<string>();
    for (const f of model.fields) {
      if (f.type) seen.add(f.type);
    }
    return Array.from(seen)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [model]);

  const filteredFields = useMemo(() => {
    if (!model) return [];
    const q = fieldQuery.trim().toLowerCase();
    return model.fields.filter((f) => {
      if (fieldTypeFilter && f.type !== fieldTypeFilter) return false;
      if (fieldRequiredFilter === "yes" && !f.required) return false;
      if (fieldRequiredFilter === "no" && f.required) return false;
      if (fieldActiveFilter === "yes" && !f.active) return false;
      if (fieldActiveFilter === "no" && f.active) return false;
      if (fieldListColumnFilter === "yes" && !f.list_column) return false;
      if (fieldListColumnFilter === "no" && f.list_column) return false;
      if (!q) return true;
      return (
        f.api_name.toLowerCase().includes(q) ||
        (f.label ?? "").toLowerCase().includes(q) ||
        (f.type ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    model,
    fieldQuery,
    fieldTypeFilter,
    fieldRequiredFilter,
    fieldActiveFilter,
    fieldListColumnFilter,
  ]);

  if (!vaultId) return null;

  const openField = (name: string) =>
    navigate(
      `/admin/configuration/objects/${encodeURIComponent(objectName)}/fields/${encodeURIComponent(name)}`,
    );

  const yesNo = (v: boolean) =>
    v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no);

  const fieldColumns: TableColumnsType<MetadataFieldSummary> = [
    {
      key: "label",
      dataIndex: "label",
      title: displayText(shell.metadata_field_label),
      render: (label: string | undefined, field) => (
        <Button
          type="link"
          className="metadata-link"
          onClick={() => openField(field.api_name)}
        >
          {label?.trim() || "—"}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_field_name),
      className: "mono",
      render: (name: string) => <span className="mono metadata-secondary-name">{name}</span>,
    },
    { key: "type", dataIndex: "type", title: displayText(shell.metadata_type), className: "mono" },
    {
      key: "required",
      dataIndex: "required",
      title: displayText(shell.metadata_required),
      render: (v: boolean) => (v ? <Tag color="warning">{displayText(shell.metadata_yes)}</Tag> : ""),
    },
    {
      key: "list_column",
      dataIndex: "list_column",
      title: displayText(shell.metadata_list_column),
      render: (v?: boolean) => yesNo(!!v),
    },
    {
      key: "active",
      dataIndex: "active",
      title: displayText(shell.metadata_active),
      render: (v: boolean) => yesNo(v),
    },
  ];

  const listLayoutColumns: TableColumnsType<MetadataObjectListLayoutColumn> = [
    {
      key: "order",
      dataIndex: "order",
      title: displayText(shell.metadata_list_layout_order),
      width: 80,
    },
    {
      key: "label",
      dataIndex: "label",
      title: displayText(shell.metadata_field_label),
      render: (label: string | undefined, col) => (
        <Button type="link" className="metadata-link" onClick={() => openField(col.api_name)}>
          {label?.trim() || "—"}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_field_name),
      className: "mono",
      render: (name: string) => <span className="mono metadata-secondary-name">{name}</span>,
    },
    { key: "type", dataIndex: "type", title: displayText(shell.metadata_type), className: "mono" },
  ];

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/objects">
            {displayText(shell.metadata_objects_title)}
          </Link>
          {" › "}
          <span>
            {model ? displayText(model.label || undefined, model.api_name) : objectName}
          </span>
        </p>
      }
      title={model ? displayText(model.label || undefined, model.api_name) : objectName}
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      {model && (
        <ObjectDetailBody
          model={model}
          layouts={layouts}
          actions={actions}
          relationships={relationships}
          sharingRules={sharingRules}
          shell={shell}
          fieldQuery={fieldQuery}
          setFieldQuery={setFieldQuery}
          fieldTypeFilter={fieldTypeFilter}
          setFieldTypeFilter={setFieldTypeFilter}
          fieldTypeOptions={fieldTypeOptions}
          fieldRequiredFilter={fieldRequiredFilter}
          setFieldRequiredFilter={setFieldRequiredFilter}
          fieldActiveFilter={fieldActiveFilter}
          setFieldActiveFilter={setFieldActiveFilter}
          fieldListColumnFilter={fieldListColumnFilter}
          setFieldListColumnFilter={setFieldListColumnFilter}
          filteredFields={filteredFields}
          fieldColumns={fieldColumns}
          listLayoutColumns={listLayoutColumns}
        />
      )}
    </AdminPageShell>
  );
}

function ObjectDetailBody({
  model,
  layouts,
  actions,
  relationships,
  sharingRules,
  shell,
  fieldQuery,
  setFieldQuery,
  fieldTypeFilter,
  setFieldTypeFilter,
  fieldTypeOptions,
  fieldRequiredFilter,
  setFieldRequiredFilter,
  fieldActiveFilter,
  setFieldActiveFilter,
  fieldListColumnFilter,
  setFieldListColumnFilter,
  filteredFields,
  fieldColumns,
  listLayoutColumns,
}: {
  model: MetadataObjectDetailModel;
  layouts: MetadataObjectLayout[];
  actions: MetadataObjectActionSummary[];
  relationships: MetadataObjectRelationshipsModel | null;
  sharingRules: MetadataSharingRuleSummary[];
  shell: ShellChrome;
  fieldQuery: string;
  setFieldQuery: (v: string) => void;
  fieldTypeFilter: string;
  setFieldTypeFilter: (v: string) => void;
  fieldTypeOptions: { value: string; label: string }[];
  fieldRequiredFilter: string;
  setFieldRequiredFilter: (v: string) => void;
  fieldActiveFilter: string;
  setFieldActiveFilter: (v: string) => void;
  fieldListColumnFilter: string;
  setFieldListColumnFilter: (v: string) => void;
  filteredFields: MetadataFieldSummary[];
  fieldColumns: TableColumnsType<MetadataFieldSummary>;
  listLayoutColumns: TableColumnsType<MetadataObjectListLayoutColumn>;
}) {
  // Tab order mirrors Veeva Object configuration (Triggers / Validation Rules omitted until backed).
  const showObjectTypes = !!model.allow_types;
  const tabItems: TabsProps["items"] = [
    {
      key: "details",
      label: displayText(shell.metadata_details_tab),
      children: (
        <section className="object-detail__panel">
          <h2 className="object-detail__section-title">{displayText(shell.metadata_details_tab)}</h2>
          <ObjectDetailsFields model={model} shell={shell} />
        </section>
      ),
    },
    {
      key: "fields",
      label: displayText(shell.metadata_fields_tab),
      children: (
        <section className="object-detail__panel">
          <div className="filter-bar metadata-attr__bar">
            <Input.Search
              allowClear
              value={fieldQuery}
              placeholder={displayText(shell.metadata_fields_search_placeholder)}
              onChange={(e) => setFieldQuery(e.target.value)}
              className="filter-bar__max-260"
            />
            <Select
              allowClear
              placeholder={displayText(shell.metadata_type)}
              value={fieldTypeFilter || undefined}
              onChange={(v) => setFieldTypeFilter(v ?? "")}
              options={fieldTypeOptions}
              className="filter-bar__min-140"
            />
            <Select
              allowClear
              placeholder={displayText(shell.metadata_required)}
              value={fieldRequiredFilter || undefined}
              onChange={(v) => setFieldRequiredFilter(v ?? "")}
              options={[
                { value: "yes", label: displayText(shell.metadata_yes) },
                { value: "no", label: displayText(shell.metadata_no) },
              ]}
              className="filter-bar__min-120"
            />
            <Select
              allowClear
              placeholder={displayText(shell.metadata_active)}
              value={fieldActiveFilter || undefined}
              onChange={(v) => setFieldActiveFilter(v ?? "")}
              options={[
                { value: "yes", label: displayText(shell.metadata_yes) },
                { value: "no", label: displayText(shell.metadata_no) },
              ]}
              className="filter-bar__min-120"
            />
            <Select
              allowClear
              placeholder={displayText(shell.metadata_list_column)}
              value={fieldListColumnFilter || undefined}
              onChange={(v) => setFieldListColumnFilter(v ?? "")}
              options={[
                { value: "yes", label: displayText(shell.metadata_yes) },
                { value: "no", label: displayText(shell.metadata_no) },
              ]}
              className="filter-bar__min-140"
            />
            <span className="data-table__empty metadata-count">
              {displayTextTemplate(shell.metadata_result_count, { count: filteredFields.length })}
            </span>
          </div>
          <AdminCompactTable<MetadataFieldSummary>
              rowKey="api_name"
              pagination={
                filteredFields.length > 25
                  ? { pageSize: 25, showSizeChanger: true, pageSizeOptions: [25, 50, 100] }
                  : false
              }

              columns={fieldColumns}
              dataSource={filteredFields}
          />
        </section>
      ),
    },
    {
      key: "relationships",
      label: displayText(shell.metadata_relationships_tab),
      children: (
        <section className="object-detail__panel">
          {relationships ? (
            <div className="metadata-relationships">
              <div className="object-detail__subsection">
                <h3 className="object-detail__subsection-title">
                  {displayText(shell.metadata_outbound_relationships)}
                </h3>
                {relationships.outbound.length === 0 ? (
                  <span className="data-table__empty">{displayText(shell.metadata_empty_outbound)}</span>
                ) : (
                  <AdminCompactTable<MetadataOutboundRelationshipSummary>
                      rowKey="field_name"
                      pagination={false}

                      columns={outboundRelationshipColumns(shell)}
                      dataSource={relationships.outbound}
          />
                )}
              </div>
              <div className="object-detail__subsection">
                <h3 className="object-detail__subsection-title">
                  {displayText(shell.metadata_inbound_relationships)}
                  {relationships.inbound.length > 0
                    ? ` (${relationships.inbound.length})`
                    : ""}
                </h3>
                {relationships.inbound.length === 0 ? (
                  <span className="data-table__empty">{displayText(shell.metadata_empty_inbound)}</span>
                ) : (
                  <AdminCompactTable<MetadataInboundRelationshipSummary>
                      rowKey={(r) => `${r.source_object}.${r.source_field_name}`}
                      pagination={
                        relationships.inbound.length > 15
                          ? { pageSize: 15, showSizeChanger: true, pageSizeOptions: [15, 30, 50] }
                          : false
                      }

                      columns={inboundRelationshipColumns(shell)}
                      dataSource={relationships.inbound}
          />
                )}
              </div>
            </div>
          ) : (
            <span className="data-table__empty">{displayText(shell.metadata_empty_relationships)}</span>
          )}
        </section>
      ),
    },
    {
      key: "list-layout",
      label: displayText(shell.metadata_list_layout_tab),
      children: (
        <section className="object-detail__panel">
          <p className="data-table__empty metadata-count">
            {model.list_layout?.source === "listlayout"
              ? displayTextTemplate(shell.metadata_list_layout_from_component, {
                  name: model.list_layout.api_name || model.list_layout.label || "",
                })
              : displayText(shell.metadata_list_layout_from_fields)}
          </p>
          {(model.list_layout?.columns.length ?? 0) === 0 ? (
            <span className="data-table__empty">{displayText(shell.metadata_empty_list_layout)}</span>
          ) : (
            <AdminCompactTable<MetadataObjectListLayoutColumn>
                rowKey="api_name"
                pagination={false}

                columns={listLayoutColumns}
                dataSource={model.list_layout?.columns ?? []}
          />
          )}
        </section>
      ),
    },
    {
      key: "layouts",
      label: displayText(shell.metadata_layouts_tab),
      children: (
        <section className="object-detail__panel">
          {layouts.length === 0 ? (
            <span className="data-table__empty">{displayText(shell.metadata_empty_layouts)}</span>
          ) : (
            <Collapse items={layoutCollapseItems(layouts, model.api_name, shell)} />
          )}
        </section>
      ),
    },
    {
      key: "sharing-rules",
      label: displayText(shell.metadata_sharing_rules_tab),
      children: (
        <section className="object-detail__panel">
          {sharingRules.length === 0 ? (
            <span className="data-table__empty">{displayText(shell.metadata_empty_sharing_rules)}</span>
          ) : (
            <Collapse items={sharingRuleCollapseItems(sharingRules, shell)} />
          )}
        </section>
      ),
    },
    {
      key: "actions",
      label: displayText(shell.metadata_actions_tab),
      children: (
        <section className="object-detail__panel">
          {actions.length === 0 ? (
            <span className="data-table__empty">{displayText(shell.metadata_empty_actions)}</span>
          ) : (
            <AdminCompactTable<MetadataObjectActionSummary>
                rowKey="api_name"
                pagination={false}

                columns={actionColumns(shell)}
                dataSource={actions}
          />
          )}
        </section>
      ),
    },
    ...(showObjectTypes
      ? [
          {
            key: "object-types",
            label: displayText(shell.metadata_object_types_tab),
            children: (
              <section className="object-detail__panel">
                <ObjectTypesMatrix types={model.object_types ?? []} fields={model.fields} />
              </section>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="object-detail object-detail--tabs">
      <Tabs className="object-detail__tabs" defaultActiveKey="details" items={tabItems} />
    </div>
  );
}

function attrMap(attributes: MetadataNameValuePair[]): Map<string, unknown> {
  return new Map(attributes.map((a) => [a.name, a.value]));
}

function attrBool(attrs: Map<string, unknown>, name: string, fallback = false): boolean {
  const v = attrs.get(name);
  if (typeof v === "boolean") return v;
  if (v === undefined || v === null) return fallback;
  return Boolean(v);
}

function attrString(attrs: Map<string, unknown>, name: string): string {
  const v = attrs.get(name);
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function titleCaseWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function classifySourceFromApiName(apiName: string): string {
  const name = apiName.trim().toLowerCase();
  if (name.endsWith("__sys")) return "system";
  if (name.endsWith("__c")) return "custom";
  if (name.endsWith("__v")) return "standard";
  return "application";
}

function normalizeObjectRef(raw: string): string {
  return raw.trim().replace(/^Object\./i, "").split(".")[0] || raw.trim();
}

function normalizeLifecycleRef(raw: string): string {
  return raw.trim().replace(/^Objectlifecycle\./i, "");
}

function DetailFieldRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="object-detail__fields">
      {rows.map((row) => (
        <div key={row.label} className="object-detail__field">
          <dt>{row.label}</dt>
          <dd>{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function OptionCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <Checkbox checked={checked} disabled className="object-detail__option">
      {label}
    </Checkbox>
  );
}

/** Veeva-style Object Details: identity, Configuration, Options / DAC / Action Security. */
function ObjectDetailsFields({
  model,
  shell,
}: {
  model: MetadataObjectDetailModel;
  shell: ShellChrome;
}) {
  const attrs = attrMap(model.attributes);
  const active = attrBool(attrs, "active", true);
  const objectClass = attrString(attrs, "object_class");
  const dataStore = attrString(attrs, "data_store");
  const description = attrString(attrs, "description");
  const labelPlural = attrString(attrs, "label_plural");
  const userRoleSetup = attrString(attrs, "user_role_setup_object");
  const securityTree = attrString(attrs, "security_tree_object");
  const lifecycleRaw = attrString(attrs, "available_lifecycles");

  const uniqueKeys = model.fields
    .filter((f) => !!f.unique)
    .map((f) => `(${f.label?.trim() || f.api_name})`);

  const summaryFields =
    (model.summary_fields?.length ?? 0) > 0 ? (
      <span className="metadata-summary-fields">
        {model.summary_fields!.map((f, i) => (
          <span key={f.api_name}>
            {i > 0 ? ", " : ""}
            <Link
              className="metadata-link"
              to={`/admin/configuration/objects/${encodeURIComponent(model.api_name)}/fields/${encodeURIComponent(f.api_name)}`}
            >
              {f.label || f.api_name}
            </Link>
          </span>
        ))}
      </span>
    ) : (
      ""
    );

  const lifecycleValue = (() => {
    if (!lifecycleRaw) return "";
    const refs = lifecycleRaw
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (refs.length === 0) return "";
    return (
      <span>
        {refs.map((ref, i) => {
          const apiName = normalizeLifecycleRef(ref);
          return (
            <span key={`${apiName}-${i}`}>
              {i > 0 ? ", " : null}
              <Link
                className="metadata-link"
                to={`/admin/configuration/object-lifecycles/${encodeURIComponent(apiName)}`}
              >
                {apiName}
              </Link>
            </span>
          );
        })}
      </span>
    );
  })();

  const objectRefLink = (raw: string) => {
    if (!raw) return "";
    const apiName = normalizeObjectRef(raw);
    return (
      <Link
        className="metadata-link"
        to={`/admin/configuration/objects/${encodeURIComponent(apiName)}`}
      >
        {apiName}
      </Link>
    );
  };

  const identityRows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_object_label),
      value: displayText(model.label || undefined, model.api_name),
    },
    {
      label: displayText(shell.metadata_object_label_plural),
      value: labelPlural || "—",
    },
    {
      label: displayText(shell.metadata_object_name),
      value: <span className="mono">{model.api_name}</span>,
    },
    {
      label: displayText(shell.metadata_status),
      value: active
        ? displayText(shell.metadata_status_active)
        : displayText(shell.metadata_status_inactive),
    },
    {
      label: displayText(shell.metadata_source),
      value: sourceLabel(classifySourceFromApiName(model.api_name)),
    },
    {
      label: displayText(shell.metadata_object_class),
      value: objectClass ? titleCaseWord(objectClass) : "—",
    },
    {
      label: displayText(shell.metadata_data_store),
      value: dataStore ? titleCaseWord(dataStore) : "—",
    },
    {
      label: displayText(shell.description),
      value: description || "—",
    },
  ];

  const configurationRows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_type),
      value: displayText(shell.metadata_object_type_independent),
    },
    {
      label: displayText(shell.metadata_unique_keys),
      value: uniqueKeys.length > 0 ? uniqueKeys.join(", ") : "—",
    },
  ];

  const dacMetaRows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_user_role_setup_object),
      value: objectRefLink(userRoleSetup),
    },
    {
      label: displayText(shell.metadata_security_tree_object),
      value: objectRefLink(securityTree),
    },
  ];

  const footerRows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_record_summary_field),
      value: summaryFields,
    },
    {
      label: displayText(shell.metadata_object_lifecycle),
      value: lifecycleValue,
    },
  ];

  return (
    <div className="object-detail__details">
      <DetailFieldRows rows={identityRows} />

      <h3 className="object-detail__subsection-title">
        {displayText(shell.metadata_object_configuration)}
      </h3>
      <DetailFieldRows rows={configurationRows} />

      <h3 className="object-detail__subsection-title">
        {displayText(shell.metadata_object_options)}
      </h3>
      <div className="object-detail__options">
        <OptionCheckbox
          checked={attrBool(attrs, "in_menu")}
          label={displayText(shell.metadata_display_in_business_admin)}
        />
        <OptionCheckbox
          checked={attrBool(attrs, "allow_attachments")}
          label={displayText(shell.metadata_allow_attachments)}
        />
        <OptionCheckbox
          checked={attrBool(attrs, "enable_esignatures")}
          label={displayText(shell.metadata_enable_signatures)}
        />
        <OptionCheckbox
          checked={attrBool(attrs, "audit")}
          label={displayText(shell.metadata_audit_object)}
        />
        <OptionCheckbox
          checked={!!(model.allow_types ?? attrBool(attrs, "allow_types"))}
          label={displayText(shell.metadata_enable_object_types)}
        />
        <OptionCheckbox
          checked={attrBool(attrs, "enable_merges")}
          label={displayText(shell.metadata_enable_merges)}
        />
      </div>

      <h3 className="object-detail__subsection-title">
        {displayText(shell.metadata_dynamic_access_control)}
      </h3>
      <div className="object-detail__options">
        <OptionCheckbox
          checked={attrBool(attrs, "dynamic_security")}
          label={displayText(shell.metadata_enable_dynamic_security)}
        />
      </div>
      <DetailFieldRows rows={dacMetaRows} />

      <h3 className="object-detail__subsection-title">
        {displayText(shell.metadata_action_security)}
      </h3>
      <div className="object-detail__options">
        <OptionCheckbox
          checked={attrBool(attrs, "secure_audit_trail")}
          label={displayText(shell.metadata_secure_audit_trail)}
        />
        <OptionCheckbox
          checked={attrBool(attrs, "secure_sharing_settings")}
          label={displayText(shell.metadata_secure_sharing_settings)}
        />
        <OptionCheckbox
          checked={attrBool(attrs, "secure_copy_record")}
          label={displayText(shell.metadata_secure_copy_record)}
        />
      </div>

      <DetailFieldRows rows={footerRows} />
    </div>
  );
}

// actionColumns builds the compact column set for the Actions tab table.
function actionColumns(shell: import("../lib/i18n").ShellChrome): TableColumnsType<MetadataObjectActionSummary> {
  return [
    { key: "label", dataIndex: "label", title: displayText(shell.metadata_field_label) },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_field_name),
      className: "mono",
      render: (name: string) => <span className="mono metadata-secondary-name">{name}</span>,
    },
    {
      key: "action_ref",
      dataIndex: "action_ref",
      title: displayText(shell.metadata_action_ref),
      className: "mono",
    },
    {
      key: "available_all_states",
      dataIndex: "available_all_states",
      title: displayText(shell.metadata_available_all_states),
      render: (v: boolean) => (v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no)),
    },
    {
      key: "active",
      dataIndex: "active",
      title: displayText(shell.metadata_active),
      render: (v: boolean) => (v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no)),
    },
  ];
}

// outboundRelationshipColumns builds the compact column set for the Outbound
// Relationships table (this Object's reference fields pointing at other Objects),
// matching Veeva's Relationships admin screen.
function outboundRelationshipColumns(
  shell: import("../lib/i18n").ShellChrome,
): TableColumnsType<MetadataOutboundRelationshipSummary> {
  return [
    { key: "field_label", dataIndex: "field_label", title: displayText(shell.metadata_field_label) },
    {
      key: "outbound_name",
      dataIndex: "outbound_name",
      title: displayText(shell.metadata_outbound_name),
      className: "mono",
    },
    {
      key: "related_object",
      dataIndex: "related_object",
      title: displayText(shell.metadata_related_object),
      className: "mono",
      render: (name: string) => objectLink(name),
    },
    {
      key: "field_api_type",
      dataIndex: "field_api_type",
      title: displayText(shell.metadata_field_type),
    },
  ];
}

// inboundRelationshipColumns builds the compact column set for the Inbound
// Relationships table (other Objects' reference fields targeting this Object),
// matching Veeva's Relationships admin screen.
function inboundRelationshipColumns(
  shell: import("../lib/i18n").ShellChrome,
): TableColumnsType<MetadataInboundRelationshipSummary> {
  return [
    {
      key: "relationship_label",
      dataIndex: "relationship_label",
      title: displayText(shell.metadata_relationship_label),
    },
    {
      key: "secured",
      dataIndex: "secured",
      title: displayText(shell.metadata_secured),
      render: (v: boolean) => (v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no)),
    },
    {
      key: "inbound_name",
      dataIndex: "inbound_name",
      title: displayText(shell.metadata_inbound_name),
      className: "mono",
    },
    {
      key: "source_object",
      dataIndex: "source_object",
      title: displayText(shell.metadata_related_object),
      className: "mono",
      render: (name: string) => objectLink(name),
    },
    {
      key: "relationship_type",
      dataIndex: "relationship_type",
      title: displayText(shell.metadata_relationship_type),
    },
  ];
}

// objectLink renders an object api-name as a link to that object's detail page so
// relationships can be navigated in place. Empty names render as plain text.
function objectLink(name: string) {
  if (!name) return "";
  return (
    <Link
      className="metadata-link mono"
      to={`/admin/configuration/objects/${encodeURIComponent(name)}`}
    >
      {name}
    </Link>
  );
}

// layoutCollapseItems builds the per-layout collapse panels, each expanding to show
// its sections with field labels and a two-column detailform preview.
function layoutCollapseItems(
  layouts: MetadataObjectLayout[],
  objectApiName: string,
  shell: import("../lib/i18n").ShellChrome,
): CollapseProps["items"] {
  return layouts.map((layout, idx) => ({
    key: String(idx),
    label: (
      <span>
        <strong className="mono">{layout.api_name}</strong>
        {layout.label ? <span className="metadata-collapse__gap">{layout.label}</span> : null}
        {layout.default_layout ? (
          <Tag color="processing" className="metadata-collapse__gap">
            {displayText(shell.metadata_default)}
          </Tag>
        ) : null}
      </span>
    ),
    children:
      layout.sections.length === 0 ? (
        <span className="data-table__empty">{displayText(shell.metadata_empty_sections)}</span>
      ) : (
        <LayoutSectionsView sections={layout.sections} objectApiName={objectApiName} />
      ),
  }));
}

// sharingRuleCollapseItems builds the per-sharing-rule collapse panels. Each panel header
// shows the rule api_name + label + Active/Inactive tag; the body shows the criteria and a
// table of the rule's Sharingrole children (role name + granted members).
function sharingRuleCollapseItems(
  rules: MetadataSharingRuleSummary[],
  shell: import("../lib/i18n").ShellChrome,
): CollapseProps["items"] {
  const roleColumns: TableColumnsType<MetadataSharingRuleRole> = [
    {
      key: "name",
      dataIndex: "name",
      title: displayText(shell.metadata_sharing_rule_role),
      className: "mono",
    },
    {
      key: "members",
      dataIndex: "members",
      title: displayText(shell.metadata_sharing_rule_members),
      render: (members: string[]) =>
        members && members.length > 0 ? (
          <span>
            {members.map((m, i) => (
              <Tag key={m} className="mono" style={i === 0 ? undefined : { marginLeft: 4 }}>
                {m}
              </Tag>
            ))}
          </span>
        ) : (
          ""
        ),
    },
  ];
  return rules.map((rule, idx) => ({
    key: String(idx),
    label: (
      <span>
        <strong className="mono">{rule.api_name}</strong>
        {rule.label ? <span className="metadata-collapse__gap">{rule.label}</span> : null}
        <Tag color={rule.active ? "success" : "default"} className="metadata-collapse__gap">
          {rule.active ? displayText(shell.metadata_yes) : displayText(shell.metadata_no)}
        </Tag>
      </span>
    ),
    children: (
      <>
        <Descriptions
          bordered
          size="small"
          column={1}
          labelStyle={{ width: 180 }}
          className="admin-page__descriptions"
          items={[
            {
              key: "criteria",
              label: displayText(shell.metadata_sharing_rule_criteria),
              children: (
                <span className="mono">{rule.criteria || "—"}</span>
              ),
            },
          ]}
        />
        <AdminCompactTable<MetadataSharingRuleRole>
            rowKey="name"
            pagination={false}

            columns={roleColumns}
            dataSource={rule.roles}
          />
      </>
    ),
  }));
}
