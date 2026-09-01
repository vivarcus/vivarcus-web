import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { JobDefinitionListItem, JobDefinitionWrite } from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import type { OperationsChrome } from "../lib/i18n/chromeTypes";

function weekDays(operations: OperationsChrome) {
  return [
    { value: "Sun", label: displayText(operations.weekday_sun) },
    { value: "Mon", label: displayText(operations.weekday_mon) },
    { value: "Tue", label: displayText(operations.weekday_tue) },
    { value: "Wed", label: displayText(operations.weekday_wed) },
    { value: "Thu", label: displayText(operations.weekday_thu) },
    { value: "Fri", label: displayText(operations.weekday_fri) },
    { value: "Sat", label: displayText(operations.weekday_sat) },
  ];
}

function catalogWeekDay(value: string | undefined): string {
  const map: Record<string, string> = {
    sunday: "Sun",
    sun: "Sun",
    monday: "Mon",
    mon: "Mon",
    tuesday: "Tue",
    tue: "Tue",
    tues: "Tue",
    wednesday: "Wed",
    wed: "Wed",
    thursday: "Thu",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    friday: "Fri",
    fri: "Fri",
    saturday: "Sat",
    sat: "Sat",
  };
  const key = (value ?? "").trim();
  return map[key.toLowerCase()] ?? (key || "Mon");
}

const HOURLY_INTERVALS = [1, 2, 3, 4, 6, 12];

function conditionOps(operations: OperationsChrome) {
  return [
    { value: "=", label: "=" },
    { value: "≠", label: "≠" },
    { value: "!=", label: "!=" },
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
    { value: "contains", label: displayText(operations.op_contains) },
    { value: "starts with", label: displayText(operations.op_starts_with) },
    { value: "is blank", label: displayText(operations.op_is_blank) },
    { value: "is not blank", label: displayText(operations.op_is_not_blank) },
  ];
}

type ConditionRow = {
  key: string;
  lhs: string;
  operator: string;
  rhs: string;
};

type OptionalNotifRow = {
  key: string;
  template: string;
  recipients: string;
  send_date: number;
};

type FormValues = {
  label: string;
  owner: string;
  timezone: string;
  priority: string;
  schedule: string;
  time: string;
  hourly_interval?: number;
  week_day?: string;
  month_repeat_type?: string;
  day_of_month?: number;
  week_number?: number;
  action_type: string;
  object_name: string;
  destination_state?: string;
  terminate_existing_workflows?: boolean;
  template?: string;
  recipients?: string;
  trigger_date_field: string;
  date_boundary: string;
};

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitCSV(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseConditions(raw: unknown): ConditionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const m = item as Record<string, unknown>;
      if (String(m.expressionType ?? "").toUpperCase() === "TRIGGER_DATE_TYPE") return null;
      const rhs = Array.isArray(m.rhs) ? m.rhs.map(String).join(", ") : String(m.rhs ?? "");
      return {
        key: newKey(),
        lhs: String(m.lhs ?? ""),
        operator: String(m.operator ?? "="),
        rhs,
      };
    })
    .filter((r): r is ConditionRow => r != null && r.lhs.trim() !== "");
}

function parseOptionalNotifications(raw: unknown): OptionalNotifRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const m = item as Record<string, unknown>;
    const recipients = Array.isArray(m.recipients)
      ? m.recipients.map(String).join(", ")
      : String(m.recipients ?? "");
    return {
      key: newKey(),
      template: String(m.template ?? ""),
      recipients,
      send_date: Number(m.send_date ?? 0),
    };
  });
}

function jobDefinitionLabel(label: string, operations: OperationsChrome): string {
  switch (label) {
    case "User Account Activation":
      return displayText(operations.user_account_activation);
    case "Task Reminder Notification":
      return displayText(operations.task_reminder_notification);
    case "Match EDL Items to Documents":
      return displayText(operations.match_edl_items);
    default:
      return label;
  }
}

function jobDefinitionType(type: string, operations: OperationsChrome): string {
  switch (type) {
    case "Date Based Object Operation":
      return displayText(operations.date_based_object_operation);
    case "Task Reminder Notification":
      return displayText(operations.task_reminder_notification);
    case "Match EDL Items to Documents":
      return displayText(operations.match_edl_items);
    default:
      return type;
  }
}

function isVaultScopedJobType(type: string): boolean {
  return type === "Task Reminder Notification" || type === "Match EDL Items to Documents";
}

export function AdminJobDefinitionsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const operations = shell.operations;
  const [items, setItems] = useState<JobDefinitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listJobDefinitions(vaultId);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  return (
    <AdminPageShell
      title={displayText(operations.job_definitions_title)}
      actions={
        <Space>
          <Button type="primary" onClick={() => navigate(`/admin/operations/job_definitions/new`)}>
            {displayText(shell.list_create)}
          </Button>
          <Button onClick={() => void load()}>{displayText(shell.refresh)}</Button>
        </Space>
      }
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      <Spin spinning={loading}>
        <AdminCompactTable<JobDefinitionListItem>
          loadingOverlay={loading}
          rowKey="api_name"
          dataSource={items}
          pagination={{ pageSize: 25 }}
          locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
          columns={[
            {
              title: displayText(operations.job_title),
              dataIndex: "label",
              render: (label: string, row) => (
                <Link to={`/admin/operations/job_definitions/${encodeURIComponent(row.api_name)}`}>
                  {jobDefinitionLabel(label, operations)}
                </Link>
              ),
            },
            {
              title: displayText(operations.job_type),
              dataIndex: "type",
              render: (type: string) => jobDefinitionType(type, operations),
            },
            {
              title: displayText(shell.metadata_status),
              dataIndex: "status",
              width: 100,
              render: (status: string) => (
                <Tag color={status === "Active" ? "success" : "default"}>
                  {status === "Active"
                    ? displayText(operations.status_active)
                    : status === "Inactive"
                      ? displayText(operations.status_inactive)
                      : status}
                </Tag>
              ),
            },
            {
              title: displayText(operations.schedule),
              dataIndex: "schedule",
              render: (schedule: string) => {
                const labels: Record<string, string> = {
                  Hourly: displayText(operations.schedule_hourly),
                  Daily: displayText(operations.schedule_daily),
                  Weekly: displayText(operations.schedule_weekly),
                  Monthly: displayText(operations.schedule_monthly),
                };
                return labels[schedule] ?? schedule;
              },
            },
          ]}
        />
      </Spin>
    </AdminPageShell>
  );
}

export function AdminJobDefinitionDetailPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const operations = shell.operations;
  const apiName = decodeURIComponent(
    window.location.pathname.split("/admin/operations/job_definitions/")[1] ?? "",
  );
  const isNew = apiName === "new";
  const [form] = Form.useForm<FormValues>();
  const schedule = Form.useWatch("schedule", form) ?? "Daily";
  const actionType = Form.useWatch("action_type", form) ?? "state_change";
  const monthRepeatType = Form.useWatch("month_repeat_type", form) ?? "dayOfTheMonth";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Inactive");
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [canActivate, setCanActivate] = useState(false);
  const [detailType, setDetailType] = useState("Date Based Object Operation");
  const [labelPreview, setLabelPreview] = useState("");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [optionalNotifs, setOptionalNotifs] = useState<OptionalNotifRow[]>([]);

  const vaultScoped = !isNew && isVaultScopedJobType(detailType);

  const initialValues = useMemo<FormValues>(
    () => ({
      label: "",
      owner: "user:User.System",
      timezone: "",
      priority: "normal",
      schedule: "Daily",
      time: "02:00",
      hourly_interval: 1,
      week_day: "Mon",
      month_repeat_type: "dayOfTheMonth",
      day_of_month: 1,
      week_number: 1,
      action_type: "state_change",
      object_name: "",
      destination_state: "",
      terminate_existing_workflows: false,
      template: "",
      recipients: "",
      trigger_date_field: "",
      date_boundary: "only_before",
    }),
    [],
  );

  const load = useCallback(async () => {
    if (!vaultId || isNew) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.getJobDefinition(vaultId, apiName);
      setLabelPreview(d.label);
      setStatus(d.status);
      setDetailType(d.type);
      setCanEdit(d.can_edit);
      setCanDelete(d.can_delete);
      setCanActivate(d.can_activate);

      const action = (d.action ?? {}) as Record<string, unknown>;
      const sc = (d.schedule_config ?? {}) as Record<string, unknown>;
      const trigger = (d.trigger_date ?? {}) as Record<string, unknown>;

      form.setFieldsValue({
        label: d.label,
        owner: d.owner || (typeof sc.owner === "string" ? sc.owner : "user:User.System"),
        timezone: d.timezone || "",
        priority: (d.priority || "normal").toLowerCase(),
        schedule: d.schedule || "Daily",
        time: typeof sc.time === "string" ? sc.time : "02:00",
        hourly_interval: typeof sc.hourly_interval === "number" ? sc.hourly_interval : 1,
        week_day: catalogWeekDay(typeof sc.week_day === "string" ? sc.week_day : undefined),
        month_repeat_type:
          typeof sc.month_repeat_type === "string" ? sc.month_repeat_type : "dayOfTheMonth",
        day_of_month: typeof sc.day_of_month === "number" ? sc.day_of_month : 1,
        week_number: typeof sc.week_number === "number" ? sc.week_number : 1,
        action_type: String(action.action_type ?? "state_change"),
        object_name: String(action.object_name ?? ""),
        destination_state: String(action.destination_state ?? ""),
        terminate_existing_workflows: Boolean(action.terminate_existing_workflows),
        template: String(action.template ?? ""),
        recipients: Array.isArray(action.recipients)
          ? action.recipients.map(String).join(", ")
          : "",
        trigger_date_field: String(trigger.field_path ?? ""),
        date_boundary: String(trigger.date_boundary ?? "only_before"),
      });
      setConditions(parseConditions(d.conditions));
      setOptionalNotifs(parseOptionalNotifications(d.optional_notifications));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, apiName, isNew, shell.load_failed, form]);

  useEffect(() => {
    if (isNew) {
      form.setFieldsValue(initialValues);
      return;
    }
    void load();
  }, [isNew, load, form, initialValues]);

  const buildWriteBody = (values: FormValues): JobDefinitionWrite => {
    const body: JobDefinitionWrite = {
      label: values.label.trim(),
      schedule: values.schedule,
      timezone: values.timezone.trim() || undefined,
      priority: values.priority || "normal",
      owner: values.owner.trim() || "user:User.System",
      active: false,
      job_type: vaultScoped ? detailType : undefined,
      action_type: vaultScoped ? "vault" : values.action_type,
      object_name: vaultScoped ? undefined : values.object_name.trim(),
      terminate_existing_workflows: Boolean(values.terminate_existing_workflows),
      trigger_date_field: vaultScoped ? undefined : values.trigger_date_field.trim() || undefined,
      date_boundary: values.date_boundary || "only_before",
      conditions: vaultScoped
        ? undefined
        : conditions
            .filter((c) => c.lhs.trim())
            .map((c) => ({
              lhs: c.lhs.trim(),
              operator: c.operator,
              rhs:
                c.operator === "is blank" || c.operator === "is not blank"
                  ? []
                  : c.rhs
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
              type: "Expression",
              expressionType: null,
            })),
      optional_notifications: vaultScoped
        ? undefined
        : optionalNotifs
            .filter((n) => n.template.trim())
            .map((n) => ({
              template: n.template.trim(),
              recipients: splitCSV(n.recipients),
              send_date: Number.isFinite(n.send_date) ? n.send_date : 0,
            })),
    };

    if (values.schedule === "Hourly") {
      body.hourly_interval = values.hourly_interval ?? 1;
    } else {
      body.time = values.time || "02:00";
    }
    if (values.schedule === "Weekly") {
      body.week_day = values.week_day;
    }
    if (values.schedule === "Monthly") {
      body.month_repeat_type = values.month_repeat_type || "dayOfTheMonth";
      if (body.month_repeat_type === "dayOfTheMonth") {
        body.day_of_month = values.day_of_month ?? 1;
      } else {
        body.week_number = values.week_number ?? 1;
        body.week_day = values.week_day;
      }
    }
    if (values.action_type === "state_change") {
      body.destination_state = values.destination_state?.trim();
    }
    if (values.action_type === "send_notification") {
      body.template = values.template?.trim();
      body.recipients = splitCSV(values.recipients);
    }
    return body;
  };

  const save = async () => {
    if (!vaultId) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const body = buildWriteBody(values);
      if (isNew) {
        const created = await api.createJobDefinition(vaultId, body);
        message.success(displayText(operations.saved));
        navigate(`/admin/operations/job_definitions/${encodeURIComponent(created.api_name)}`);
      } else {
        await api.updateJobDefinition(vaultId, apiName, body);
        message.success(displayText(operations.saved));
        await load();
      }
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = async () => {
    if (!vaultId || isNew) return;
    try {
      await api.beginEditJobDefinition(vaultId, apiName);
      message.success(
        displayTextTemplate(operations.status_set, {
          status: displayText(operations.status_inactive),
        }),
      );
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    }
  };

  const toggleStatus = async () => {
    if (!vaultId || isNew) return;
    const next = status === "Active" ? "Inactive" : "Active";
    try {
      await api.setJobDefinitionStatus(vaultId, apiName, next);
      message.success(
        displayTextTemplate(operations.status_set, {
          status: displayText(
            next === "Active" ? operations.status_active : operations.status_inactive,
          ),
        }),
      );
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    }
  };

  const remove = async () => {
    if (!vaultId || isNew) return;
    try {
      await api.deleteJobDefinition(vaultId, apiName);
      message.success(displayText(operations.deleted));
      navigate("/admin/operations/job_definitions");
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    }
  };

  if (!vaultId) return null;

  const editingLocked = !isNew && status === "Active";

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/operations/job_definitions">
            {displayText(operations.job_definitions_title)}
          </Link>
        </p>
      }
      title={isNew ? displayText(operations.create_job) : labelPreview || apiName}
      meta={
        !isNew ? (
          <p className="page-header__meta">
            {jobDefinitionType(detailType, operations)} ·{" "}
            {displayText(
              status === "Active" ? operations.status_active : operations.status_inactive,
            )}
          </p>
        ) : undefined
      }
      actions={
        <Space wrap>
          {!isNew && canEdit && status === "Active" && (
            <Button onClick={() => void beginEdit()}>
              {displayText(shell.metadata_permission_action_edit)}
            </Button>
          )}
          {!isNew && canActivate && (
            <Button onClick={() => void toggleStatus()}>
              {status === "Active"
                ? displayText(operations.deactivate)
                : displayText(operations.activate)}
            </Button>
          )}
          {!isNew && canDelete && (
            <Button danger onClick={() => void remove()}>
              {displayText(operations.delete_action)}
            </Button>
          )}
          <Button
            type="primary"
            loading={saving}
            disabled={editingLocked}
            onClick={() => void save()}
          >
            {displayText(shell.save)}
          </Button>
        </Space>
      }
    >
      {error && <Alert type="error" showIcon title={error} className="admin-page__banner" />}
      {editingLocked && (
        <Alert
          type="info"
          showIcon className="admin-page__banner"
          title={displayText(operations.edit_before_change)}
        />
      )}
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          disabled={editingLocked}
          className="admin-form--wide"
        >
          <h3>{displayText(operations.details)}</h3>
          <Form.Item
            name="label"
            label={displayText(operations.job_title)}
            rules={[{ required: true }]}
          >
            <Input
              onChange={(e) => {
                if (isNew) setLabelPreview(e.target.value);
              }}
            />
          </Form.Item>
          {!isNew && (
            <Form.Item label={displayText(shell.metadata_lifecycle_name)}>
              <Input value={apiName} disabled />
            </Form.Item>
          )}
          <Form.Item label={displayText(operations.job_type)}>
            <Input
              value={
                isNew
                  ? displayText(operations.date_based_object_operation)
                  : jobDefinitionType(detailType, operations)
              }
              disabled
            />
          </Form.Item>
          <Form.Item
            name="owner"
            label={displayText(operations.job_owner)}
            rules={[{ required: true }]}
            extra={displayText(operations.job_owner_help)}
          >
            <Input placeholder="user:User.System" />
          </Form.Item>
          <Form.Item
            name="timezone"
            label={displayText(operations.timezone)}
            extra={displayText(operations.timezone_help)}
          >
            <Input placeholder="Asia/Shanghai" />
          </Form.Item>
          <Form.Item name="priority" label={displayText(operations.priority)}>
            <Select
              options={[
                { value: "normal", label: displayText(operations.priority_normal) },
                { value: "high", label: displayText(operations.priority_high) },
              ]}
            />
          </Form.Item>

          <h3>{displayText(operations.schedule)}</h3>
          <Form.Item name="schedule" label={displayText(operations.schedule)} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "Hourly", label: displayText(operations.schedule_hourly) },
                { value: "Daily", label: displayText(operations.schedule_daily) },
                { value: "Weekly", label: displayText(operations.schedule_weekly) },
                { value: "Monthly", label: displayText(operations.schedule_monthly) },
              ]}
            />
          </Form.Item>
          {schedule === "Hourly" && (
            <Form.Item
              name="hourly_interval"
              label={displayText(operations.hourly_interval)}
              rules={[{ required: true }]}
            >
              <Select
                options={HOURLY_INTERVALS.map((n) => ({
                  value: n,
                  label: displayTextTemplate(operations.every_n_hours, { n }),
                }))}
              />
            </Form.Item>
          )}
          {schedule !== "Hourly" && (
            <Form.Item
              name="time"
              label={displayText(operations.vault_time)}
              rules={[{ required: true }]}
              extra={displayText(operations.vault_time_help)}
            >
              <Input placeholder="02:00" />
            </Form.Item>
          )}
          {schedule === "Weekly" && (
            <Form.Item name="week_day" label={displayText(operations.week_day)} rules={[{ required: true }]}>
              <Select options={weekDays(operations)} />
            </Form.Item>
          )}
          {schedule === "Monthly" && (
            <>
              <Form.Item
                name="month_repeat_type"
                label={displayText(operations.month_repeat_type)}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "dayOfTheMonth", label: displayText(operations.day_of_the_month) },
                    { value: "dayOfTheWeek", label: displayText(operations.day_of_the_week) },
                  ]}
                />
              </Form.Item>
              {monthRepeatType === "dayOfTheMonth" ? (
                <Form.Item
                  name="day_of_month"
                  label={displayText(operations.day_of_month)}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={31} />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    name="week_number"
                    label={displayText(operations.week_number)}
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={[1, 2, 3, 4, 5].map((n) => ({
                        value: n,
                        label:
                          n === 5
                            ? displayText(operations.last_week_of_month)
                            : displayTextTemplate(operations.week_n, { n }),
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="week_day" label={displayText(operations.week_day)} rules={[{ required: true }]}>
                    <Select options={weekDays(operations)} />
                  </Form.Item>
                </>
              )}
            </>
          )}

          {!vaultScoped && (
            <>
          <h3>{displayText(operations.action_configuration)}</h3>
          <Form.Item name="action_type" label={displayText(operations.action)} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "state_change", label: displayText(operations.action_state_change) },
                { value: "send_notification", label: displayText(operations.action_send_notification) },
                { value: "noop", label: displayText(operations.action_noop) },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="object_name"
            label={displayText(shell.object_label)}
            rules={[{ required: true }]}
          >
            <Input placeholder="milestone__v" />
          </Form.Item>
          {actionType === "state_change" && (
            <>
              <Form.Item
                name="destination_state"
                label={displayText(operations.change_state_to)}
                rules={[{ required: true }]}
                extra={displayText(operations.change_state_to_help)}
              >
                <Input />
              </Form.Item>
              <Form.Item name="terminate_existing_workflows" valuePropName="checked">
                <Checkbox>{displayText(operations.terminate_existing_workflows)}</Checkbox>
              </Form.Item>
            </>
          )}
          {actionType === "send_notification" && (
            <>
              <Form.Item
                name="template"
                label={displayText(operations.notification_template)}
                rules={[{ required: true }]}
              >
                <Input placeholder="template_api_name__c" />
              </Form.Item>
              <Form.Item
                name="recipients"
                label={displayText(operations.recipients)}
                extra={displayText(operations.recipients_help)}
              >
                <Input placeholder="owner__v" />
              </Form.Item>
            </>
          )}

          <Form.Item label={displayText(operations.additional_conditions)}>
            <Space orientation="vertical" className="admin-form__stack" size="small">
              {conditions.map((row, idx) => (
                <Space key={row.key} wrap align="start">
                  <Input
                    placeholder="field__v"
                    value={row.lhs}
                    className="admin-form__condition-lhs"
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...row, lhs: e.target.value };
                      setConditions(next);
                    }}
                  />
                  <Select
                    value={row.operator}
                    className="admin-form__condition-op"
                    options={conditionOps(operations)}
                    onChange={(op) => {
                      const next = [...conditions];
                      next[idx] = { ...row, operator: op };
                      setConditions(next);
                    }}
                  />
                  <Input
                    placeholder={displayText(operations.condition_value)}
                    value={row.rhs}
                    className="admin-form__condition-rhs"
                    disabled={row.operator === "is blank" || row.operator === "is not blank"}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...row, rhs: e.target.value };
                      setConditions(next);
                    }}
                  />
                  <Button
                    danger
                    onClick={() => setConditions(conditions.filter((c) => c.key !== row.key))}
                  >
                    {displayText(operations.delete_action)}
                  </Button>
                </Space>
              ))}
              <Button
                onClick={() =>
                  setConditions([
                    ...conditions,
                    { key: newKey(), lhs: "", operator: "=", rhs: "" },
                  ])
                }
              >
                {displayText(operations.add_condition)}
              </Button>
            </Space>
          </Form.Item>

          <Form.Item
            name="trigger_date_field"
            label={displayText(operations.trigger_date_field)}
            rules={[{ required: true }]}
            extra={displayText(operations.trigger_date_field_help)}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="date_boundary"
            label={displayText(operations.trigger_date_boundary)}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "only_before", label: displayText(operations.boundary_only_before) },
                { value: "before_and_on", label: displayText(operations.boundary_before_and_on) },
              ]}
            />
          </Form.Item>

          <h3>{displayText(operations.optional_notifications)}</h3>
          <Space orientation="vertical" className="admin-form__stack admin-form__stack--spaced" size="medium">
            {optionalNotifs.map((row, idx) => (
              <div key={row.key} className="admin-form__panel">
                <Space orientation="vertical" className="admin-form__stack">
                  <Input
                    placeholder={displayText(operations.notification_template)}
                    value={row.template}
                    onChange={(e) => {
                      const next = [...optionalNotifs];
                      next[idx] = { ...row, template: e.target.value };
                      setOptionalNotifs(next);
                    }}
                  />
                  <Input
                    placeholder={displayText(operations.recipients_help)}
                    value={row.recipients}
                    onChange={(e) => {
                      const next = [...optionalNotifs];
                      next[idx] = { ...row, recipients: e.target.value };
                      setOptionalNotifs(next);
                    }}
                  />
                  <Space>
                    <span>{displayText(operations.send_date_days_before)}</span>
                    <InputNumber
                      min={0}
                      value={row.send_date}
                      onChange={(v) => {
                        const next = [...optionalNotifs];
                        next[idx] = { ...row, send_date: Number(v ?? 0) };
                        setOptionalNotifs(next);
                      }}
                    />
                    <Button
                      danger
                      onClick={() =>
                        setOptionalNotifs(optionalNotifs.filter((n) => n.key !== row.key))
                      }
                    >
                      {displayText(operations.delete_action)}
                    </Button>
                  </Space>
                  {row.send_date === 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      title={displayText(operations.send_date_zero_warning)}
                    />
                  )}
                </Space>
              </div>
            ))}
            <Button
              onClick={() =>
                setOptionalNotifs([
                  ...optionalNotifs,
                  { key: newKey(), template: "", recipients: "", send_date: 1 },
                ])
              }
            >
              {displayText(operations.add_optional_notification)}
            </Button>
          </Space>
            </>
          )}
        </Form>
      </Spin>
    </AdminPageShell>
  );
}
