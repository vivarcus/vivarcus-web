import { Alert, Select, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataPermissionSetObjectDetailModel,
  MetadataPermissionSetObjectPermissionRow,
} from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import { humanizeApiName, OBJECT_CRUD_ACTIONS, rowVisibleForObjectType } from "./permissionSetView";
import { AdminCompactTable } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { ObjectCrudCheckbox, permissionActionLabel } from "./permissionActions";

type Shell = ShellChrome;

const FIELD_ACTIONS = ["read", "edit"] as const;
const CONTROL_ACTIONS = ["view"] as const;

// AdminMetadataPermissionSetObjectDetailPage is the dedicated per-object drill-down reached from
// the permission set's Objects tab, mirroring Veeva's navigation (Permission Sets > <set> >
// Objects > <object>). It renders the object's Object / Field / Control permission matrix with a
// right-hand anchor nav; the Field and Control sections carry an "All Object Types" selector that
// scopes the list to a chosen object type. It is read-only.
export function AdminMetadataPermissionSetObjectDetailPage() {
  const { permissionSetName = "", objectName = "" } = useParams();
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataPermissionSetObjectDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !permissionSetName || !objectName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataPermissionSetObjectDetail(vaultId, permissionSetName, objectName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, permissionSetName, objectName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const setHref = `/admin/users-groups/permission_sets/${encodeURIComponent(permissionSetName)}`;
  const title = model
    ? displayText(model.object_label || undefined, model.object_name)
    : humanizeApiName(objectName);
  const setLabel = model
    ? displayText(model.permission_set_label || undefined, model.permission_set_api_name)
    : humanizeApiName(permissionSetName);

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/users-groups/permission_sets">
            {displayText(shell.metadata_permission_sets_title)}
          </Link>
          {" / "}
          <Link to={setHref}>{setLabel}</Link>
          {" / "}
          <Link to={setHref}>{displayText(shell.metadata_permission_category_objects)}</Link>
        </p>
      }
      title={title}
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      {model && <ObjectPermissionSections model={model} shell={shell} />}
    </AdminPageShell>
  );
}

// ObjectPermissionSections renders the three Veeva permission sections (Object / Field / Control)
// with a right-hand anchor nav for quick jumps. The Field and Control sections carry an object
// type selector when the object defines types.
function ObjectPermissionSections({
  model,
  shell,
}: {
  model: MetadataPermissionSetObjectDetailModel;
  shell: Shell;
}) {
  const [fieldType, setFieldType] = useState("");
  const [controlType, setControlType] = useState("");

  const idBase = `perm-obj-${model.object_name}`;
  const sections = [
    { id: `${idBase}-object`, title: displayText(shell.metadata_permission_object_permissions) },
    { id: `${idBase}-fields`, title: displayText(shell.metadata_permission_field_permissions) },
    { id: `${idBase}-controls`, title: displayText(shell.metadata_permission_control_permissions) },
  ];
  const typeOptions = [
    { value: "", label: displayText(shell.metadata_permission_all_object_types) },
    ...model.object_types.map((t) => ({ value: t.api_name, label: t.label || t.api_name })),
  ];
  const hasTypes = model.object_types.length > 0;

  return (
    <div className="perm-object-detail">
      <div className="perm-object-sections">
        <PermissionSection
          id={sections[0].id}
          title={sections[0].title}
          rows={model.object_permissions}
          nameColumnTitle={displayText(shell.metadata_permission_kind_object_type)}
          actionColumns={[...OBJECT_CRUD_ACTIONS]}
          shell={shell}
        />
        <PermissionSection
          id={sections[1].id}
          title={sections[1].title}
          rows={model.field_permissions}
          nameColumnTitle={displayText(shell.metadata_permission_entry)}
          actionColumns={[...FIELD_ACTIONS]}
          defaultLabel={displayText(shell.metadata_permission_all_object_fields)}
          shell={shell}
          typeFilter={
            hasTypes ? { options: typeOptions, value: fieldType, onChange: setFieldType } : undefined
          }
        />
        <PermissionSection
          id={sections[2].id}
          title={sections[2].title}
          rows={model.control_permissions}
          nameColumnTitle={displayText(shell.metadata_permission_entry)}
          actionColumns={[...CONTROL_ACTIONS]}
          defaultLabel={displayText(shell.metadata_permission_all_object_controls)}
          shell={shell}
          typeFilter={
            hasTypes
              ? { options: typeOptions, value: controlType, onChange: setControlType }
              : undefined
          }
        />
      </div>
      <nav
        className="perm-object-nav"
        aria-label={displayText(shell.metadata_permission_object_permissions)}
      >
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
    </div>
  );
}

type ObjectTypeFilter = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

// PermissionSection renders one titled Veeva-style permission matrix (name column + one checkbox
// column per action). Inherited grants (from All / wildcard rules) show a "*" beside the checkbox.
function PermissionSection({
  id,
  title,
  rows,
  nameColumnTitle,
  actionColumns,
  defaultLabel,
  shell,
  typeFilter,
}: {
  id: string;
  title: string;
  rows: MetadataPermissionSetObjectPermissionRow[];
  nameColumnTitle: string;
  actionColumns: readonly string[];
  defaultLabel?: string;
  shell: Shell;
  typeFilter?: ObjectTypeFilter;
}) {
  const selectedType = typeFilter?.value ?? "";
  const visibleRows = useMemo(
    () => rows.filter((r) => rowVisibleForObjectType(r, selectedType)),
    [rows, selectedType],
  );

  return (
    <section id={id} className="perm-object-section">
      <div className="perm-object-section__head">
        <h3 className="perm-object-section__title">{title}</h3>
        {typeFilter && (
          <Select
            size="small"
            className="perm-object-section__type filter-bar__min-180"
            value={selectedType}
            options={typeFilter.options}
            onChange={typeFilter.onChange}
          />
        )}
      </div>
      <AdminCompactTable<MetadataPermissionSetObjectPermissionRow>
          rowKey={(r) => (r.is_default ? `${r.api_name}:default` : r.api_name)}
          pagination={false}

          columns={objectPermissionColumns(nameColumnTitle, actionColumns, defaultLabel, shell)}
          dataSource={visibleRows}
          />
    </section>
  );
}

function objectPermissionColumns(
  nameColumnTitle: string,
  actionColumns: readonly string[],
  defaultLabel: string | undefined,
  shell: Shell,
): TableColumnsType<MetadataPermissionSetObjectPermissionRow> {
  const crudColumns: TableColumnsType<MetadataPermissionSetObjectPermissionRow> = actionColumns.map(
    (action) => ({
      key: action,
      title: permissionActionLabel(shell, action),
      width: 88,
      align: "center" as const,
      render: (_v, row) => (
        <ObjectCrudCheckbox
          action={action}
          actions={row.actions}
          inheritedActions={row.inherited_actions}
          label={permissionActionLabel(shell, action)}
        />
      ),
    }),
  );

  return [
    {
      key: "permission",
      title: nameColumnTitle || displayText(shell.metadata_permission_entry),
      render: (_v, row) => {
        if (row.is_default) {
          return (
            <span className="perm-entry-target__label">
              {defaultLabel ?? humanizeApiName(row.api_name)}
            </span>
          );
        }
        // Veeva shows the human label only on object-detail rows (no mono api_name).
        return (
          <span className="perm-entry-target__label">
            {row.label || humanizeApiName(row.api_name)}
          </span>
        );
      },
    },
    ...crudColumns,
  ];
}
