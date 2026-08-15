import { Alert, Button, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataLifecycleBoundObject,
  MetadataLifecycleDetailModel,
  MetadataLifecycleEventSummary,
  MetadataLifecyclePermissionGrant,
  MetadataLifecycleRoleSummary,
  MetadataLifecycleStateRule,
  MetadataLifecycleStateSummary,
  MetadataLifecycleStateTypeBinding,
} from "../api/types";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { AdminCompactTable } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import type { ShellChrome } from "../lib/i18n";
import { sourceLabel } from "../lib/metadataFormat";

type Shell = ShellChrome;

/** Veeva-style Object Lifecycle detail: single-page sections + right-hand anchors. */
export function AdminMetadataLifecycleDetailPage() {
  const { lifecycleName = "" } = useParams();
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataLifecycleDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId || !lifecycleName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataLifecycleDetail(vaultId, lifecycleName));
      setSelectedState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, lifecycleName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const title = model
    ? displayText(model.label || undefined, model.api_name)
    : lifecycleName;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/object-lifecycles">
            {displayText(shell.metadata_lifecycles_title)}
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
        <LifecycleDetailBody
          model={model}
          shell={shell}
          selectedState={selectedState}
          onSelectState={setSelectedState}
          onOpenObject={(name) =>
            navigate(`/admin/configuration/objects/${encodeURIComponent(name)}`)
          }
        />
      )}
    </AdminPageShell>
  );
}

function LifecycleDetailBody({
  model,
  shell,
  selectedState,
  onSelectState,
  onOpenObject,
}: {
  model: MetadataLifecycleDetailModel;
  shell: Shell;
  selectedState: string | null;
  onSelectState: (apiName: string | null) => void;
  onOpenObject: (apiName: string) => void;
}) {
  const idBase = `lc-${model.api_name}`;
  const sections = [
    { id: `${idBase}-details`, title: displayText(shell.metadata_details_tab) },
    { id: `${idBase}-state-types`, title: displayText(shell.metadata_lifecycle_state_types_tab) },
    { id: `${idBase}-states`, title: displayText(shell.metadata_lifecycle_states_tab) },
    { id: `${idBase}-events`, title: displayText(shell.metadata_lifecycle_event_actions) },
    { id: `${idBase}-roles`, title: displayText(shell.metadata_lifecycle_roles_tab) },
    { id: `${idBase}-objects`, title: displayText(shell.metadata_objects_title) },
  ];

  const selected = useMemo(
    () => model.states.find((s) => s.api_name === selectedState) ?? null,
    [model.states, selectedState],
  );

  return (
    <div className="lifecycle-detail">
      <div className="lifecycle-detail__sections">
        <section id={sections[0].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[0].title}</h2>
          <DetailsFields model={model} shell={shell} objectsAnchor={sections[5].id} />
        </section>

        <section id={sections[1].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[1].title}</h2>
          <StateTypesTable stateTypes={model.state_types ?? []} shell={shell} />
        </section>

        <section id={sections[2].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[2].title}</h2>
          <StateOverview
            states={model.states}
            selected={selectedState}
            onSelect={(name) => onSelectState(name === selectedState ? null : name)}
            shell={shell}
          />
          <StatesTable
            states={model.states}
            shell={shell}
            selected={selectedState}
            onSelect={(name) => onSelectState(name === selectedState ? null : name)}
          />
          {selected && (
            <div className="lifecycle-detail__state-panel" id={`${idBase}-state-${selected.api_name}`}>
              <h3 className="lifecycle-detail__state-panel-title">
                {displayText(selected.label || undefined, selected.api_name)}
              </h3>
              <StateDetail state={selected} shell={shell} />
            </div>
          )}
        </section>

        <section id={sections[3].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[3].title}</h2>
          <EventActionsTable events={model.event_actions} shell={shell} />
        </section>

        <section id={sections[4].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[4].title}</h2>
          <RolesSection roles={model.roles} permissions={model.permissions} shell={shell} />
        </section>

        <section id={sections[5].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[5].title}</h2>
          <BoundObjectsTable objects={model.objects} shell={shell} onOpen={onOpenObject} />
        </section>
      </div>

      <nav className="lifecycle-detail__nav" aria-label={displayText(shell.metadata_details_tab)}>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
    </div>
  );
}

function DetailsFields({
  model,
  shell,
  objectsAnchor,
}: {
  model: MetadataLifecycleDetailModel;
  shell: Shell;
  objectsAnchor: string;
}) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_lifecycle_label),
      value: displayText(model.label || undefined, model.api_name),
    },
    {
      label: displayText(shell.metadata_lifecycle_name),
      value: <span className="mono">{model.api_name}</span>,
    },
    {
      label: displayText(shell.metadata_lifecycle_object),
      value: (
        <a href={`#${objectsAnchor}`}>{displayText(shell.metadata_lifecycle_view_objects)}</a>
      ),
    },
    {
      label: displayText(shell.metadata_status),
      value: model.active
        ? displayText(shell.metadata_status_active)
        : displayText(shell.metadata_status_inactive),
    },
    {
      label: displayText(shell.metadata_source),
      value: sourceLabel(model.source),
    },
    {
      label: displayText(shell.description),
      value: model.description || "—",
    },
  ];

  return (
    <dl className="lifecycle-detail__fields">
      {rows.map((row) => (
        <div key={row.label} className="lifecycle-detail__field">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StateTypesTable({
  stateTypes,
  shell,
}: {
  stateTypes: MetadataLifecycleStateTypeBinding[];
  shell: Shell;
}) {
  if (stateTypes.length === 0) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_lifecycle_state_types)}</span>
    );
  }
  const columns: TableColumnsType<MetadataLifecycleStateTypeBinding> = [
    {
      key: "state_type",
      title: displayText(shell.metadata_lifecycle_state_type),
      render: (_v, row) => displayText(row.state_type_label || undefined, row.state_type),
    },
    {
      key: "state",
      title: displayText(shell.metadata_lifecycle_state),
      render: (_v, row) => displayText(row.state_label || undefined, row.state_api_name),
    },
    {
      key: "description",
      dataIndex: "description",
      title: displayText(shell.description),
      render: (v?: string) => v || "",
    },
  ];
  return (
    <AdminCompactTable<MetadataLifecycleStateTypeBinding>
        rowKey="api_name"
        pagination={false}

        columns={columns}
        dataSource={stateTypes}
          />
  );
}

function StateOverview({
  states,
  selected,
  onSelect,
  shell,
}: {
  states: MetadataLifecycleStateSummary[];
  selected: string | null;
  onSelect: (apiName: string) => void;
  shell: Shell;
}) {
  if (states.length === 0) return null;
  return (
    <div
      className="metadata-state-overview"
      aria-label={displayText(shell.metadata_lifecycle_state_overview)}
    >
      {states.map((st, i) => {
        const label = displayText(st.label || undefined, st.api_name);
        const className = [
          "metadata-chip",
          "metadata-chip--clickable",
          st.is_starting ? "metadata-chip--start" : "",
          selected === st.api_name ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <span key={st.api_name} className="metadata-state-overview__item">
            {i > 0 ? <span className="metadata-flow-arrow" aria-hidden="true">→</span> : null}
            <button type="button" className={className} onClick={() => onSelect(st.api_name)}>
              {label}
              {st.is_starting ? ` · ${displayText(shell.metadata_lifecycle_starting_state)}` : ""}
            </button>
          </span>
        );
      })}
    </div>
  );
}

function StatesTable({
  states,
  shell,
  selected,
  onSelect,
}: {
  states: MetadataLifecycleStateSummary[];
  shell: Shell;
  selected: string | null;
  onSelect: (apiName: string) => void;
}) {
  if (states.length === 0) {
    return <span className="data-table__empty">{displayText(shell.metadata_empty_lifecycle_states)}</span>;
  }
  const columns: TableColumnsType<MetadataLifecycleStateSummary> = [
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_state_label),
      render: (_v, st) => (
        <Button
          type="link"
          className={`metadata-link${selected === st.api_name ? " is-active" : ""}`}
          onClick={() => onSelect(st.api_name)}
        >
          {displayText(st.label || undefined, st.api_name)}
          {st.is_starting ? ` (${displayText(shell.metadata_lifecycle_starting_state)})` : ""}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_state_name),
      className: "mono",
    },
    {
      key: "status",
      dataIndex: "active",
      title: displayText(shell.metadata_status),
      render: (v: boolean) =>
        v ? displayText(shell.metadata_status_active) : displayText(shell.metadata_status_inactive),
    },
    {
      key: "description",
      dataIndex: "description",
      title: displayText(shell.description),
      render: (v?: string) => v || "",
    },
  ];
  return (
    <AdminCompactTable<MetadataLifecycleStateSummary>
        rowKey="api_name"
        pagination={false}

        columns={columns}
        dataSource={states}
        rowClassName={(st) => (st.api_name === selected ? "lifecycle-detail__row--active" : "")}
          />
  );
}

function EventActionsTable({
  events,
  shell,
}: {
  events: MetadataLifecycleEventSummary[];
  shell: Shell;
}) {
  if (events.length === 0) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_lifecycle_event_actions)}</span>
    );
  }
  const columns: TableColumnsType<MetadataLifecycleEventSummary> = [
    {
      key: "event",
      title: displayText(shell.metadata_lifecycle_event),
      render: (_v, ev) =>
        displayText(ev.label || undefined, ev.event || ev.api_name) || ev.api_name,
    },
    {
      key: "action_summary",
      dataIndex: "action_summary",
      title: displayText(shell.description),
      render: (v?: string) => v || "",
    },
  ];
  return (
    <AdminCompactTable<MetadataLifecycleEventSummary>
        rowKey="api_name"
        pagination={false}

        columns={columns}
        dataSource={events}
          />
  );
}

type RoleRow = {
  key: string;
  name: string;
  application_role: string;
  active: boolean;
  permissions: string;
};

function RolesSection({
  roles,
  permissions,
  shell,
}: {
  roles: MetadataLifecycleRoleSummary[];
  permissions: MetadataLifecyclePermissionGrant[];
  shell: Shell;
}) {
  const rows = useMemo(() => {
    const permByRole = new Map<string, string[]>();
    for (const p of permissions) {
      const list = permByRole.get(p.role) ?? [];
      if (p.permission) list.push(p.permission);
      permByRole.set(p.role, list);
    }
    const out: RoleRow[] = roles.map((r) => ({
      key: r.api_name,
      name: r.api_name,
      application_role: r.application_role,
      active: r.active,
      permissions: (permByRole.get(r.api_name) ?? []).join(", "),
    }));
    for (const [role, perms] of permByRole) {
      if (roles.some((r) => r.api_name === role)) continue;
      out.push({
        key: `perm-${role}`,
        name: role,
        application_role: "",
        active: true,
        permissions: perms.join(", "),
      });
    }
    return out;
  }, [roles, permissions]);

  if (rows.length === 0) {
    return <span className="data-table__empty">{displayText(shell.metadata_empty_lifecycle_roles)}</span>;
  }

  const columns: TableColumnsType<RoleRow> = [
    {
      key: "name",
      dataIndex: "name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
    },
    {
      key: "application_role",
      dataIndex: "application_role",
      title: displayText(shell.metadata_lifecycle_application_role),
      className: "mono",
      render: (v: string) => v || "—",
    },
    {
      key: "permissions",
      dataIndex: "permissions",
      title: displayText(shell.metadata_lifecycle_permission),
      render: (v: string) => v || "—",
    },
    {
      key: "active",
      dataIndex: "active",
      title: displayText(shell.metadata_active),
      render: (v: boolean) => (v ? displayText(shell.metadata_yes) : displayText(shell.metadata_no)),
    },
  ];

  return (
    <AdminCompactTable<RoleRow>
        rowKey="key"
        pagination={false}

        columns={columns}
        dataSource={rows}
          />
  );
}

function StateDetail({ state, shell }: { state: MetadataLifecycleStateSummary; shell: Shell }) {
  return (
    <div className="lifecycle-detail__state">
      <dl className="lifecycle-detail__fields lifecycle-detail__fields--compact">
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_lifecycle_name)}</dt>
          <dd className="mono">{state.api_name}</dd>
        </div>
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_status)}</dt>
          <dd>
            {state.active
              ? displayText(shell.metadata_status_active)
              : displayText(shell.metadata_status_inactive)}
          </dd>
        </div>
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_lifecycle_record_status)}</dt>
          <dd className="mono">{state.record_status || "—"}</dd>
        </div>
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_lifecycle_record_inactive)}</dt>
          <dd>
            {state.record_inactive ? displayText(shell.metadata_yes) : displayText(shell.metadata_no)}
          </dd>
        </div>
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.description)}</dt>
          <dd>{state.description || "—"}</dd>
        </div>
      </dl>
      <RuleSection
        title={displayText(shell.metadata_lifecycle_user_actions)}
        empty={displayText(shell.metadata_empty_lifecycle_user_actions)}
        rules={state.user_actions}
        shell={shell}
      />
      <RuleSection
        title={displayText(shell.metadata_lifecycle_entry_criteria)}
        empty={displayText(shell.metadata_empty_lifecycle_entry_criteria)}
        rules={state.entry_criteria}
        shell={shell}
      />
      <RuleSection
        title={displayText(shell.metadata_lifecycle_entry_actions)}
        empty={displayText(shell.metadata_empty_lifecycle_entry_actions)}
        rules={state.entry_actions}
        shell={shell}
      />
    </div>
  );
}

function RuleSection({
  title,
  empty,
  rules,
  shell,
}: {
  title: string;
  empty: string;
  rules: MetadataLifecycleStateRule[];
  shell: Shell;
}) {
  const columns: TableColumnsType<MetadataLifecycleStateRule> = [
    {
      key: "label",
      title: displayText(shell.metadata_field_label),
      render: (_v, r) => displayText(r.label || undefined, r.api_name),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
    },
    {
      key: "action_summary",
      dataIndex: "action_summary",
      title: displayText(shell.metadata_lifecycle_action_summary),
    },
    {
      key: "target_state",
      dataIndex: "target_state",
      title: displayText(shell.metadata_lifecycle_target_state),
      className: "mono",
      render: (v?: string) => v || "",
    },
  ];
  return (
    <div className="lifecycle-detail__rules">
      <h4 className="lifecycle-detail__rules-title">{title}</h4>
      {rules.length === 0 ? (
        <span className="data-table__empty">{empty}</span>
      ) : (
        <AdminCompactTable<MetadataLifecycleStateRule>
            rowKey="api_name"
            pagination={false}

            columns={columns}
            dataSource={rules}
          />
      )}
    </div>
  );
}

function BoundObjectsTable({
  objects,
  shell,
  onOpen,
}: {
  objects: MetadataLifecycleBoundObject[];
  shell: Shell;
  onOpen: (apiName: string) => void;
}) {
  if (objects.length === 0) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_lifecycle_objects)}</span>
    );
  }
  const columns: TableColumnsType<MetadataLifecycleBoundObject> = [
    {
      key: "label",
      title: displayText(shell.metadata_object_label),
      render: (_v, obj) => (
        <Button type="link" className="metadata-link" onClick={() => onOpen(obj.api_name)}>
          {displayText(obj.label || undefined, obj.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_object_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => onOpen(name)}>
          {name}
        </Button>
      ),
    },
  ];
  return (
    <AdminCompactTable<MetadataLifecycleBoundObject>
        rowKey="api_name"
        pagination={false}

        columns={columns}
        dataSource={objects}
          />
  );
}
