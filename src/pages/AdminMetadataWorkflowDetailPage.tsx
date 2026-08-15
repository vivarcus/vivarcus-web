import { Alert, Button, Checkbox, Dropdown, Space, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataWorkflowCancelActionSummary,
  MetadataWorkflowDetailModel,
  MetadataWorkflowStartState,
  MetadataWorkflowStepSummary,
} from "../api/types";
import {
  WorkflowStepFlowchart,
  workflowStepTypeDisplay,
} from "../components/metadata/WorkflowStepFlowchart";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { defaultPageActionLabels, type ShellChrome } from "../lib/i18n/chromeTypes";
import { AdminCompactTable } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

type Shell = ShellChrome;

/** Veeva-style Workflow detail: single-page sections + right-hand anchors + flowchart. */
export function AdminMetadataWorkflowDetailPage() {
  const { workflowName = "", version: versionParam } = useParams();
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataWorkflowDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const historicalVersion = Number.parseInt(versionParam || "", 10);
  const isHistorical = Number.isFinite(historicalVersion) && historicalVersion > 0;

  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    if (!vaultId || !workflowName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(
        isHistorical
          ? await api.metadataWorkflowVersionDetail(vaultId, workflowName, historicalVersion)
          : await api.metadataWorkflowDetail(vaultId, workflowName),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, workflowName, isHistorical, historicalVersion, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const activate = useCallback(async () => {
    if (!vaultId || !workflowName || activating) return;
    setActivating(true);
    setError(null);
    try {
      setModel(await api.activateMetadataWorkflow(vaultId, workflowName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
    } finally {
      setActivating(false);
    }
  }, [vaultId, workflowName, activating, shell.metadata_load_failed]);

  if (!vaultId) return null;

  const title = model ? displayText(model.label || undefined, model.api_name) : workflowName;
  const versionsHref = `/admin/configuration/workflows/${encodeURIComponent(workflowName)}/versions`;
  const workingCopyHref = `/admin/configuration/workflows/${encodeURIComponent(workflowName)}`;
  const canActivate = Boolean(model && model.can_activate && !model.active && !isHistorical);

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/workflows">
            {displayText(shell.metadata_workflows_title)}
          </Link>
          {" › "}
          {isHistorical ? (
            <>
              <Link to={workingCopyHref}>{title}</Link>
              {" › "}
              <Link to={versionsHref}>{displayText(shell.metadata_workflow_versions_title)}</Link>
              {" › "}
              <span>
                {displayText(shell.metadata_workflow_version)} {historicalVersion}
              </span>
            </>
          ) : (
            <span>{title}</span>
          )}
        </p>
      }
      title={title}
      actions={
        <div className="page-header__actions">
          <Space>
            <Dropdown
              menu={{
                items: [
                  ...(canActivate
                    ? [
                        {
                          key: "activate",
                          label: displayText(shell.metadata_make_configuration_active),
                          disabled: activating,
                          onClick: () => void activate(),
                        },
                      ]
                    : []),
                  {
                    key: "versions",
                    label: displayText(shell.metadata_view_workflow_versions),
                    onClick: () => navigate(versionsHref),
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Button>{displayText(shell.metadata_actions_tab)}</Button>
            </Dropdown>
            {canActivate ? (
              <Button type="primary" loading={activating} onClick={() => void activate()}>
                {displayText(shell.metadata_make_configuration_active)}
              </Button>
            ) : (
              !isHistorical && (
                <Button type="primary" disabled title={displayText(shell.metadata_config_view_only)}>
                  {displayText(defaultPageActionLabels.edit)}
                </Button>
              )
            )}
          </Space>
        </div>
      }
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}
      {model?.historical && (
        <Alert
          type="info"
          showIcon
          title={displayText(shell.metadata_workflow_historical_banner)}
          className="admin-page__banner"
        />
      )}

      {model && (
        <WorkflowDetailBody
          model={model}
          shell={shell}
          onOpenLifecycle={(name) =>
            navigate(`/admin/configuration/object-lifecycles/${encodeURIComponent(name)}`)
          }
        />
      )}
    </AdminPageShell>
  );
}

function WorkflowDetailBody({
  model,
  shell,
  onOpenLifecycle,
}: {
  model: MetadataWorkflowDetailModel;
  shell: Shell;
  onOpenLifecycle: (apiName: string) => void;
}) {
  const navigate = useNavigate();
  const idBase = `wf-${model.api_name}`;
  const sections = [
    { id: `${idBase}-details`, title: displayText(shell.metadata_details_tab) },
    { id: `${idBase}-options`, title: displayText(shell.metadata_workflow_options) },
    { id: `${idBase}-steps`, title: displayText(shell.metadata_workflow_steps) },
    { id: `${idBase}-envelope`, title: displayText(shell.metadata_workflow_envelope) },
    { id: `${idBase}-variables`, title: displayText(shell.metadata_workflow_variables) },
    {
      id: `${idBase}-cancellation`,
      title: displayText(shell.metadata_workflow_cancellation_actions),
    },
  ];

  return (
    <div className="lifecycle-detail">
      <div className="lifecycle-detail__sections">
        <section id={sections[0].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[0].title}</h2>
          <DetailsFields model={model} shell={shell} onOpenLifecycle={onOpenLifecycle} />
        </section>

        <section id={sections[1].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[1].title}</h2>
          <p className="metadata-view-only">{displayText(shell.metadata_config_view_only)}</p>
          <OptionsFields model={model} shell={shell} />
        </section>

        <section id={sections[2].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[2].title}</h2>
          <StepsSection
            steps={model.steps}
            shell={shell}
            onOpenStep={(name) =>
              navigate(workflowStepHref(model.api_name, name, model.historical ? model.version : 0))
            }
          />
        </section>

        <section id={sections[3].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[3].title}</h2>
          <EnvelopeFields model={model} shell={shell} />
        </section>

        <section id={sections[4].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[4].title}</h2>
          {model.workflow_variables ? (
            <pre className="lifecycle-detail__rules mono">{model.workflow_variables}</pre>
          ) : (
            <span className="data-table__empty">{displayText(shell.metadata_empty_workflow_variables)}</span>
          )}
        </section>

        <section id={sections[5].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[5].title}</h2>
          <CancellationActionsTable actions={model.cancellation_actions} shell={shell} />
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
  onOpenLifecycle,
}: {
  model: MetadataWorkflowDetailModel;
  shell: Shell;
  onOpenLifecycle: (apiName: string) => void;
}) {
  const typeLabel =
    model.workflow_content_type === "Document"
      ? displayText(shell.metadata_workflow_type_document)
      : displayText(shell.metadata_workflow_type_object);

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
      label: displayText(shell.metadata_workflow_lifecycle),
      value: model.lifecycle_api_name ? (
        <Button type="link" className="metadata-link" onClick={() => onOpenLifecycle(model.lifecycle_api_name!)}>
          {displayText(model.lifecycle_label || undefined, model.lifecycle_api_name)}
        </Button>
      ) : (
        "—"
      ),
    },
    {
      label: displayText(shell.metadata_workflow_type),
      value: typeLabel,
    },
    {
      label: displayText(shell.metadata_workflow_version),
      value: model.version > 0 ? String(model.version) : "—",
    },
    {
      label: displayText(shell.metadata_status),
      value: workflowWorkingCopyStatus(model.active, shell),
    },
    {
      label: displayText(shell.metadata_workflow_start_states),
      value: <StartStatesValue states={model.start_states ?? []} />,
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

function StartStatesValue({ states }: { states: MetadataWorkflowStartState[] }) {
  if (!states.length) return <span>—</span>;
  return (
    <span className="metadata-chip-list">
      {states.map((st) => (
        <span key={st.api_name} className="metadata-chip metadata-chip--start" title={st.api_name}>
          {displayText(st.label || undefined, st.api_name)}
        </span>
      ))}
    </span>
  );
}

function OptionCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <Checkbox checked={checked} disabled className="object-detail__option">
      {label}
    </Checkbox>
  );
}

function OptionsFields({ model, shell }: { model: MetadataWorkflowDetailModel; shell: Shell }) {
  const actionLabel = (action: string) => {
    switch (action) {
      case "cancel_workflow":
        return displayText(shell.metadata_workflow_action_cancel_workflow);
      case "reassign_task":
        return displayText(shell.metadata_workflow_action_reassign_task);
      case "email_participants":
        return displayText(shell.metadata_workflow_action_email_participants);
      case "add_participants":
        return displayText(shell.metadata_workflow_action_add_participants);
      case "update_due_date":
        return displayText(shell.metadata_workflow_action_update_due_date);
      case "cancel_task":
        return displayText(shell.metadata_workflow_action_cancel_task);
      default:
        return action;
    }
  };
  const joinList = (items: string[] | null | undefined) =>
    items && items.length ? items.map(actionLabel).join(", ") : "—";

  return (
    <div className="lifecycle-detail__rules">
      <h3 className="lifecycle-detail__rules-title">{displayText(shell.metadata_workflow_options_general)}</h3>
      <div className="object-detail__options object-detail__options--flush">
        <OptionCheckbox
          checked={model.cardinality === "One"}
          label={displayText(shell.metadata_workflow_cardinality_one)}
        />
        <OptionCheckbox
          checked={model.cancellation_comment}
          label={displayText(shell.metadata_workflow_cancellation_comment)}
        />
        <OptionCheckbox
          checked={model.auto_start}
          label={displayText(shell.metadata_workflow_auto_start)}
        />
      </div>

      <h3 className="lifecycle-detail__rules-title">
        {displayText(shell.metadata_workflow_segregation)}
      </h3>
      <div className="object-detail__options object-detail__options--flush">
        <OptionCheckbox
          checked={model.users_can_only_complete_one_task}
          label={displayText(shell.metadata_workflow_one_task)}
        />
      </div>
      <dl className="lifecycle-detail__fields lifecycle-detail__fields--compact">
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_workflow_roles_cannot_complete)}</dt>
          <dd>{model.roles_cannot_complete_task || "—"}</dd>
        </div>
      </dl>

      <h3 className="lifecycle-detail__rules-title">
        {displayText(shell.metadata_workflow_action_security)}
      </h3>
      <dl className="lifecycle-detail__fields lifecycle-detail__fields--compact">
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_workflow_disallowed_owner)}</dt>
          <dd>{joinList(model.disallowed_workflow_owner_actions)}</dd>
        </div>
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_workflow_disallowed_non_task_owner)}</dt>
          <dd>{joinList(model.disallowed_non_task_owner_actions)}</dd>
        </div>
        <div className="lifecycle-detail__field">
          <dt>{displayText(shell.metadata_workflow_disallowed_all)}</dt>
          <dd>{joinList(model.disallowed_actions)}</dd>
        </div>
      </dl>
    </div>
  );
}

function EnvelopeFields({ model, shell }: { model: MetadataWorkflowDetailModel; shell: Shell }) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_workflow_envelope_name_format),
      value: model.envelope_name_format || "—",
    },
    {
      label: displayText(shell.metadata_workflow_document_content_lifecycle),
      value: model.document_content_lifecycle || "—",
    },
    {
      label: displayText(shell.metadata_workflow_record_content_lifecycle),
      value: model.record_content_lifecycle || "—",
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

function stepLabelMap(steps: MetadataWorkflowStepSummary[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const step of steps) {
    map.set(step.api_name, displayText(step.label || undefined, step.api_name));
  }
  return map;
}

function resolveNextStepLabels(next: string[] | undefined, labels: Map<string, string>): string {
  if (!next?.length) return "—";
  return next.map((api) => labels.get(api) ?? api).join(", ");
}

function StepsSection({
  steps,
  shell,
  onOpenStep,
}: {
  steps: MetadataWorkflowStepSummary[];
  shell: Shell;
  onOpenStep: (apiName: string) => void;
}) {
  const labels = useMemo(() => stepLabelMap(steps), [steps]);
  if (steps.length === 0) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_workflow_steps)}</span>
    );
  }
  return (
    <>
      <WorkflowStepFlowchart steps={steps} shell={shell} onOpenStep={onOpenStep} />
      <StepsTable steps={steps} labels={labels} shell={shell} onOpenStep={onOpenStep} />
    </>
  );
}

function StepsTable({
  steps,
  labels,
  shell,
  onOpenStep,
}: {
  steps: MetadataWorkflowStepSummary[];
  labels: Map<string, string>;
  shell: Shell;
  onOpenStep: (apiName: string) => void;
}) {
  const columns: TableColumnsType<MetadataWorkflowStepSummary> = [
    {
      key: "type",
      title: displayText(shell.metadata_workflow_step_type),
      render: (_v, row) =>
        workflowStepTypeDisplay(row.type, shell, row.type_label, row.placeholder_error),
    },
    {
      key: "label",
      title: displayText(shell.metadata_workflow_step_label),
      render: (_v, row) => (
        <Button type="link" className="metadata-link" onClick={() => onOpenStep(row.api_name)}>
          {displayText(row.label || undefined, row.api_name)}
        </Button>
      ),
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
      render: (name: string) => (
        <Button type="link" className="metadata-link mono" onClick={() => onOpenStep(name)}>
          {name}
        </Button>
      ),
    },
    {
      key: "next_steps",
      title: displayText(shell.metadata_workflow_next_steps),
      render: (_v, row) => resolveNextStepLabels(row.next_steps, labels),
    },
  ];
  return (
    <AdminCompactTable<MetadataWorkflowStepSummary>
      rowKey="api_name"
      columns={columns}
      dataSource={steps}
    />
  );
}

function workflowWorkingCopyStatus(active: boolean, shell: Shell): string {
  return active
    ? displayText(shell.metadata_status_active)
    : displayText(shell.metadata_status_editing);
}

function workflowStepHref(workflowName: string, stepName: string, version: number): string {
  const base = `/admin/configuration/workflows/${encodeURIComponent(workflowName)}`;
  if (version > 0) {
    return `${base}/versions/${version}/steps/${encodeURIComponent(stepName)}`;
  }
  return `${base}/steps/${encodeURIComponent(stepName)}`;
}

function CancellationActionsTable({
  actions,
  shell,
}: {
  actions: MetadataWorkflowCancelActionSummary[];
  shell: Shell;
}) {
  if (actions.length === 0) {
    return (
      <span className="data-table__empty">
        {displayText(shell.metadata_empty_workflow_cancellation_actions)}
      </span>
    );
  }
  const columns: TableColumnsType<MetadataWorkflowCancelActionSummary> = [
    {
      key: "order",
      dataIndex: "order",
      title: displayText(shell.metadata_workflow_cancel_order),
      width: 80,
    },
    {
      key: "api_name",
      dataIndex: "api_name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
    },
    {
      key: "action",
      title: displayText(shell.metadata_lifecycle_action_summary),
      render: (_v, row) => row.action_summary || "—",
    },
  ];
  return (
    <AdminCompactTable<MetadataWorkflowCancelActionSummary>
      rowKey={(r) => `${r.api_name}-${r.order}`}
      columns={columns}
      dataSource={actions}
    />
  );
}
