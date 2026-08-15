import { Alert, Button, Checkbox, Spin } from "antd";
import type { TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  MetadataWorkflowDecisionRuleView,
  MetadataWorkflowStartControlView,
  MetadataWorkflowStartRuleView,
  MetadataWorkflowStepDetailModel,
  MetadataWorkflowStepRef,
  MetadataWorkflowTaskReminderView,
  MetadataWorkflowTaskVerdictView,
} from "../api/types";
import { workflowStepTypeDisplay } from "../components/metadata/WorkflowStepFlowchart";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { defaultPageActionLabels, type ShellChrome } from "../lib/i18n/chromeTypes";
import { AdminCompactTable } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";

type Shell = ShellChrome;

/** Veeva-style Workflow step detail: Details + type-specific options (view-only). */
export function AdminMetadataWorkflowStepPage() {
  const { workflowName = "", stepName = "", version: versionParam } = useParams();
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataWorkflowStepDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const historicalVersion = Number.parseInt(versionParam || "", 10);
  const isHistorical = Number.isFinite(historicalVersion) && historicalVersion > 0;

  const load = useCallback(async () => {
    if (!vaultId || !workflowName || !stepName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(
        await api.metadataWorkflowStepDetail(
          vaultId,
          workflowName,
          stepName,
          isHistorical ? historicalVersion : undefined,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, workflowName, stepName, isHistorical, historicalVersion, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const title = model ? displayText(model.label || undefined, model.api_name) : stepName;
  const workflowTitle = model
    ? displayText(model.workflow_label || undefined, model.workflow_api_name)
    : workflowName;
  const workflowHref = `/admin/configuration/workflows/${encodeURIComponent(workflowName)}`;
  const versionsHref = `${workflowHref}/versions`;
  const historicalDetailHref = isHistorical ? `${versionsHref}/${historicalVersion}` : workflowHref;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/workflows">
            {displayText(shell.metadata_workflows_title)}
          </Link>
          {" › "}
          <Link to={workflowHref}>{workflowTitle}</Link>
          {isHistorical && (
            <>
              {" › "}
              <Link to={versionsHref}>{displayText(shell.metadata_workflow_versions_title)}</Link>
              {" › "}
              <Link to={historicalDetailHref}>
                {displayText(shell.metadata_workflow_version)} {historicalVersion}
              </Link>
            </>
          )}
          {" › "}
          <span>{title}</span>
        </p>
      }
      title={title}
      actions={
        !isHistorical ? (
          <div className="page-header__actions">
            <Button type="primary" disabled title={displayText(shell.metadata_config_view_only)}>
              {displayText(defaultPageActionLabels.edit)}
            </Button>
          </div>
        ) : undefined
      }
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}
      {(model?.historical || isHistorical) && (
        <Alert
          type="info"
          showIcon
          title={displayText(shell.metadata_workflow_historical_banner)}
          className="admin-page__banner"
        />
      )}

      {model && (
        <StepDetailBody
          model={model}
          shell={shell}
          onOpenStep={(apiName) =>
            navigate(
              isHistorical
                ? `${historicalDetailHref}/steps/${encodeURIComponent(apiName)}`
                : `${workflowHref}/steps/${encodeURIComponent(apiName)}`,
            )
          }
        />
      )}
    </AdminPageShell>
  );
}

function StepDetailBody({
  model,
  shell,
  onOpenStep,
}: {
  model: MetadataWorkflowStepDetailModel;
  shell: Shell;
  onOpenStep: (apiName: string) => void;
}) {
  const idBase = `wf-step-${model.api_name}`;
  const sections = useMemo(() => {
    const list = [{ id: `${idBase}-details`, title: displayText(shell.metadata_details_tab) }];
    if (model.start) {
      list.push({ id: `${idBase}-start`, title: displayText(shell.metadata_workflow_start_options) });
      list.push({
        id: `${idBase}-start-rules`,
        title: displayText(shell.metadata_workflow_start_step_rules),
      });
    }
    if (model.task) {
      list.push({ id: `${idBase}-task`, title: displayText(shell.metadata_workflow_task_options) });
    }
    if (model.decision) {
      list.push({
        id: `${idBase}-decision`,
        title: displayText(shell.metadata_workflow_decision_rules),
      });
    }
    if (model.notification) {
      list.push({
        id: `${idBase}-notification`,
        title: displayText(shell.metadata_workflow_notification_options),
      });
    }
    if (model.state_change) {
      list.push({
        id: `${idBase}-state`,
        title: displayText(shell.metadata_workflow_state_change_options),
      });
    }
    return list;
  }, [idBase, model, shell]);

  return (
    <div className="lifecycle-detail">
      <div className="lifecycle-detail__sections">
        <section id={sections[0].id} className="lifecycle-detail__section">
          <h2 className="lifecycle-detail__section-title">{sections[0].title}</h2>
          <DetailsFields model={model} shell={shell} onOpenStep={onOpenStep} />
        </section>

        {model.start && (
          <>
            <section id={`${idBase}-start`} className="lifecycle-detail__section">
              <h2 className="lifecycle-detail__section-title">
                {displayText(shell.metadata_workflow_start_options)}
              </h2>
              <p className="metadata-view-only">{displayText(shell.metadata_config_view_only)}</p>
              <StartControls controls={model.start.controls} shell={shell} />
            </section>
            <section id={`${idBase}-start-rules`} className="lifecycle-detail__section">
              <h2 className="lifecycle-detail__section-title">
                {displayText(shell.metadata_workflow_start_step_rules)}
              </h2>
              <StartRules rules={model.start.rules} shell={shell} />
            </section>
          </>
        )}

        {model.task && (
          <section id={`${idBase}-task`} className="lifecycle-detail__section">
            <h2 className="lifecycle-detail__section-title">
              {displayText(shell.metadata_workflow_task_options)}
            </h2>
            <p className="metadata-view-only">{displayText(shell.metadata_config_view_only)}</p>
            <TaskOptions model={model} shell={shell} />
          </section>
        )}

        {model.decision && (
          <section id={`${idBase}-decision`} className="lifecycle-detail__section">
            <h2 className="lifecycle-detail__section-title">
              {displayText(shell.metadata_workflow_decision_rules)}
            </h2>
            <DecisionRules rules={model.decision.rules} shell={shell} onOpenStep={onOpenStep} />
          </section>
        )}

        {model.notification && (
          <section id={`${idBase}-notification`} className="lifecycle-detail__section">
            <h2 className="lifecycle-detail__section-title">
              {displayText(shell.metadata_workflow_notification_options)}
            </h2>
            <dl className="lifecycle-detail__fields">
              <Field
                label={displayText(shell.metadata_workflow_message_template)}
                value={model.notification.template_name || "—"}
              />
              <Field
                label={displayText(shell.metadata_workflow_recipients)}
                value={model.notification.recipients?.join(", ") || "—"}
              />
            </dl>
          </section>
        )}

        {model.state_change && (
          <section id={`${idBase}-state`} className="lifecycle-detail__section">
            <h2 className="lifecycle-detail__section-title">
              {displayText(shell.metadata_workflow_state_change_options)}
            </h2>
            <dl className="lifecycle-detail__fields">
              <Field
                label={displayText(shell.metadata_workflow_next_state)}
                value={<span className="mono">{model.state_change.next_state}</span>}
              />
            </dl>
          </section>
        )}
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
  onOpenStep,
}: {
  model: MetadataWorkflowStepDetailModel;
  shell: Shell;
  onOpenStep: (apiName: string) => void;
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
      label: displayText(shell.metadata_workflow_step_type),
      value: workflowStepTypeDisplay(
        model.type,
        shell,
        model.type_label,
        model.placeholder_error,
      ),
    },
    {
      label: displayText(shell.description),
      value: model.description || "—",
    },
    {
      label: displayText(shell.metadata_workflow_next_steps),
      value: <StepRefList refs={model.next_steps} onOpenStep={onOpenStep} />,
    },
    {
      label: displayText(shell.metadata_workflow_step_tags),
      value: model.tags?.length ? model.tags.join(", ") : "—",
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

function StepRefList({
  refs,
  onOpenStep,
}: {
  refs: MetadataWorkflowStepRef[];
  onOpenStep: (apiName: string) => void;
}) {
  if (!refs?.length) return <span>—</span>;
  return (
    <span className="metadata-chip-list">
      {refs.map((ref) => (
        <Button
          key={ref.api_name}
          type="link"
          className="metadata-link"
          onClick={() => onOpenStep(ref.api_name)}
        >
          {displayText(ref.label || undefined, ref.api_name)}
        </Button>
      ))}
    </span>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="lifecycle-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StartControls({
  controls,
  shell,
}: {
  controls: MetadataWorkflowStartControlView[];
  shell: Shell;
}) {
  if (!controls.length) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_start_controls)}</span>
    );
  }
  return (
    <div className="lifecycle-detail__rules">
      {controls.map((ctrl, idx) => (
        <div key={`${ctrl.type}-${ctrl.name || idx}`} className="lifecycle-detail__rules-block">
          <h3 className="lifecycle-detail__rules-title">
            {controlHeading(ctrl, shell, idx + 1)}
          </h3>
          <dl className="lifecycle-detail__fields lifecycle-detail__fields--compact">
            {ctrl.type === "instructions" && (
              <Field
                label={displayText(shell.metadata_lifecycle_label)}
                value={ctrl.instructions || ctrl.label || "—"}
              />
            )}
            {ctrl.type === "participant" && (
              <>
                <Field
                  label={displayText(shell.metadata_lifecycle_label)}
                  value={displayText(ctrl.label || undefined, ctrl.name || "—")}
                />
                <Field
                  label={displayText(shell.metadata_lifecycle_name)}
                  value={<span className="mono">{ctrl.name || "—"}</span>}
                />
                <Field
                  label={displayText(shell.metadata_workflow_participant_strategy)}
                  value={ctrl.participant_strategy_label || ctrl.participant_strategy || "—"}
                />
                <Field
                  label={displayText(shell.metadata_workflow_roles_allowed)}
                  value={ctrl.roles_allowed?.join(", ") || "—"}
                />
                <Field
                  label={displayText(shell.metadata_workflow_roles_not_allowed)}
                  value={ctrl.roles_not_allowed?.join(", ") || "—"}
                />
                {!!ctrl.user_reference_fields?.length && (
                  <Field
                    label={displayText(shell.metadata_workflow_participant_strategy)}
                    value={ctrl.user_reference_fields.join(", ")}
                  />
                )}
                {!!ctrl.vault_user_groups?.length && (
                  <Field label="Groups" value={ctrl.vault_user_groups.join(", ")} />
                )}
              </>
            )}
            {ctrl.type === "date" && (
              <>
                <Field
                  label={displayText(shell.metadata_lifecycle_label)}
                  value={ctrl.label || ctrl.name || "—"}
                />
                <Field
                  label="Set workflow due date"
                  value={<Checkbox checked={!!ctrl.set_workflow_due_date} disabled />}
                />
              </>
            )}
            {ctrl.type === "field" && (
              <Field
                label={displayText(shell.metadata_lifecycle_name)}
                value={
                  <span>
                    <span className="mono">{ctrl.field_api_name || "—"}</span>
                    {ctrl.required ? " (required)" : ""}
                  </span>
                }
              />
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}

function controlHeading(ctrl: MetadataWorkflowStartControlView, _shell: Shell, index: number): string {
  const typeLabel =
    ctrl.type === "participant"
      ? "Participant"
      : ctrl.type === "instructions"
        ? "Instructions"
        : ctrl.type === "date"
          ? "Date"
          : ctrl.type === "field"
            ? "Field"
            : ctrl.type;
  return `Control ${index}: ${typeLabel}`;
}

function StartRules({ rules, shell }: { rules: MetadataWorkflowStartRuleView[]; shell: Shell }) {
  if (!rules.length) {
    return <span className="data-table__empty">{displayText(shell.metadata_empty_start_rules)}</span>;
  }
  const columns: TableColumnsType<MetadataWorkflowStartRuleView> = [
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_label),
      render: (_v, row) => displayText(row.label || undefined, row.name || "—"),
    },
    {
      key: "type",
      dataIndex: "type",
      title: displayText(shell.metadata_workflow_step_type),
    },
    {
      key: "controls",
      title: displayText(shell.metadata_workflow_control_type),
      render: (_v, row) => row.controls?.join(", ") || "—",
    },
  ];
  return (
    <AdminCompactTable
      rowKey={(r) => r.name || r.label || JSON.stringify(r.controls)}
      columns={columns}
      dataSource={rules}
    />
  );
}

function TaskOptions({ model, shell }: { model: MetadataWorkflowStepDetailModel; shell: Shell }) {
  const task = model.task!;
  const assignmentLabel =
    task.assignment_mode === "available"
      ? "Make available to users in participant group"
      : task.assignment_mode === "runtimeChoice"
        ? "Allow workflow initiator to select assign to all or make available"
        : "Assign to all users in participant group";

  return (
    <div className="lifecycle-detail__rules">
      <dl className="lifecycle-detail__fields lifecycle-detail__fields--compact">
        <Field
          label={displayText(shell.metadata_workflow_step_label)}
          value={task.task_label || displayText(model.label || undefined, model.api_name)}
        />
        <Field
          label={displayText(shell.metadata_workflow_task_assignment)}
          value={
            <span>
              {task.participant ? <span className="mono">{task.participant}</span> : "—"}
              <div className="metadata-view-only">{assignmentLabel}</div>
            </span>
          }
        />
        <Field
          label={displayText(shell.metadata_workflow_task_requirement)}
          value={task.task_requirement || "—"}
        />
        <Field
          label={displayText(shell.description)}
          value={task.instructions || "—"}
        />
        <Field
          label={displayText(shell.metadata_workflow_exclude_owner)}
          value={<Checkbox checked={task.exclude_owner} disabled />}
        />
        <Field
          label={displayText(shell.metadata_workflow_hide_home_page_link)}
          value={<Checkbox checked={!!task.hide_home_page_link} disabled />}
        />
        <Field
          label={displayText(shell.metadata_workflow_complete_without_viewing)}
          value={<Checkbox checked={!!task.complete_without_viewing} disabled />}
        />
        {task.due_date && (
          <Field
            label="Due Date"
            value={
              <span className="mono">
                {[task.due_date.date_field_type, task.due_date.date_field_value]
                  .filter(Boolean)
                  .join(" / ") || "date"}
              </span>
            }
          />
        )}
        {!!task.comments?.length && (
          <Field
            label="Comment Prompt"
            value={task.comments
              .map((c) => `${c.label || c.name || "Comments"}${c.required ? " (required)" : ""}`)
              .join(", ")}
          />
        )}
        {!!task.fields?.length && (
          <Field
            label="Field Prompt"
            value={task.fields
              .map((f) => `${f.field_api_name}${f.required ? " (required)" : ""}`)
              .join(", ")}
          />
        )}
        {!!task.prompt_participants?.length && (
          <Field
            label="Prompt for Participants"
            value={task.prompt_participants.join(", ")}
          />
        )}
        {!!task.previous_tasks_to_display?.length && (
          <Field
            label={displayText(shell.metadata_workflow_previous_tasks_to_display)}
            value={<span className="mono">{task.previous_tasks_to_display.join(", ")}</span>}
          />
        )}
        {!!task.notification_templates?.length && (
          <Field
            label={displayText(shell.metadata_workflow_message_template)}
            value={<span className="mono">{task.notification_templates.join(", ")}</span>}
          />
        )}
        {!!task.notification_previous_tasks?.length && (
          <Field
            label={displayText(shell.metadata_workflow_notification_previous_tasks)}
            value={<span className="mono">{task.notification_previous_tasks.join(", ")}</span>}
          />
        )}
        {!!task.custom_action_references?.length && (
          <Field
            label={displayText(shell.metadata_workflow_custom_actions)}
            value={<span className="mono">{task.custom_action_references.join(", ")}</span>}
          />
        )}
      </dl>

      <h3 className="lifecycle-detail__rules-title">{displayText(shell.metadata_workflow_verdicts)}</h3>
      <VerdictsTable verdicts={task.verdicts || []} shell={shell} />

      {!!task.reminders?.length && (
        <>
          <h3 className="lifecycle-detail__rules-title">
            {displayText(shell.metadata_workflow_reminders)}
          </h3>
          <RemindersTable reminders={task.reminders} shell={shell} />
        </>
      )}
    </div>
  );
}

function VerdictsTable({
  verdicts,
  shell,
}: {
  verdicts: MetadataWorkflowTaskVerdictView[];
  shell: Shell;
}) {
  if (!verdicts.length) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_task_verdicts)}</span>
    );
  }
  const columns: TableColumnsType<MetadataWorkflowTaskVerdictView> = [
    {
      key: "label",
      title: displayText(shell.metadata_lifecycle_label),
      render: (_v, row) => displayText(row.label || undefined, row.name),
    },
    {
      key: "name",
      dataIndex: "name",
      title: displayText(shell.metadata_lifecycle_name),
      className: "mono",
    },
    {
      key: "esig",
      title: displayText(shell.metadata_workflow_esig_required),
      render: (_v, row) => (row.signature_required ? "Yes" : "—"),
    },
    {
      key: "comment",
      title: "Comment",
      render: (_v, row) =>
        row.comment_label
          ? `${row.comment_label}${row.comment_required ? " (required)" : ""}`
          : "—",
    },
  ];
  return (
    <AdminCompactTable
      rowKey="name"
      columns={columns}
      dataSource={verdicts}
    />
  );
}

function RemindersTable({
  reminders,
  shell,
}: {
  reminders: MetadataWorkflowTaskReminderView[];
  shell: Shell;
}) {
  const columns: TableColumnsType<MetadataWorkflowTaskReminderView> = [
    {
      key: "template",
      title: displayText(shell.metadata_workflow_message_template),
      render: (_v, row) => row.template_name,
    },
    {
      key: "when",
      title: "Send On",
      render: (_v, row) => `${row.send_on} ${row.operator} ${row.days}d`,
    },
    {
      key: "recipients",
      title: displayText(shell.metadata_workflow_recipients),
      render: (_v, row) => row.recipients?.join(", ") || "—",
    },
  ];
  return (
    <AdminCompactTable
      rowKey={(r) => r.name || r.template_name}
      columns={columns}
      dataSource={reminders}
    />
  );
}

function DecisionRules({
  rules,
  shell,
  onOpenStep,
}: {
  rules: MetadataWorkflowDecisionRuleView[];
  shell: Shell;
  onOpenStep: (apiName: string) => void;
}) {
  if (!rules.length) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_decision_rules)}</span>
    );
  }
  const columns: TableColumnsType<MetadataWorkflowDecisionRuleView> = [
    {
      key: "summary",
      title: displayText(shell.metadata_workflow_decision_summary),
      render: (_v, row) =>
        row.default_rule
          ? displayText(shell.metadata_workflow_decision_default)
          : row.summary || "—",
    },
    {
      key: "next",
      title: displayText(shell.metadata_workflow_next_steps),
      render: (_v, row) => <StepRefList refs={row.next_steps} onOpenStep={onOpenStep} />,
    },
  ];
  return (
    <AdminCompactTable
      rowKey={(r, i) => `${r.summary || "else"}-${i}`}
      columns={columns}
      dataSource={rules}
    />
  );
}
