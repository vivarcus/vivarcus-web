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
import { displayText } from "../lib/i18n";
import type { OperationsChrome } from "../lib/i18n/chromeTypes";

const WEEK_DAYS = [
  { value: "Sun", label: "Sunday" },
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
];

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

const CONDITION_OPS = [
  "=",
  "≠",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "contains",
  "starts with",
  "is blank",
  "is not blank",
];

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
        message.success("Created");
        navigate(`/admin/operations/job_definitions/${encodeURIComponent(created.api_name)}`);
      } else {
        await api.updateJobDefinition(vaultId, apiName, body);
        message.success("Saved (status remains Inactive)");
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
      message.success("Status set to Inactive");
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
      message.success(`Status: ${next}`);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    }
  };

  const remove = async () => {
    if (!vaultId || isNew) return;
    try {
      await api.deleteJobDefinition(vaultId, apiName);
      message.success("Deleted");
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
          <Link to="/admin/operations/job_definitions">Job Definitions</Link>
        </p>
      }
      title={isNew ? "Create Job" : labelPreview || apiName}
      meta={
        !isNew ? (
          <p className="page-header__meta">
            {detailType} · {status}
          </p>
        ) : undefined
      }
      actions={
        <Space wrap>
          {!isNew && canEdit && status === "Active" && (
            <Button onClick={() => void beginEdit()}>Edit</Button>
          )}
          {!isNew && canActivate && (
            <Button onClick={() => void toggleStatus()}>
              {status === "Active" ? "Deactivate" : "Activate"}
            </Button>
          )}
          {!isNew && canDelete && (
            <Button danger onClick={() => void remove()}>
              Delete
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
          title="Click Edit to set Status to Inactive before changing this job definition."
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
          <h3>Details</h3>
          <Form.Item
            name="label"
            label="Title"
            rules={[{ required: true, message: "Title is required" }]}
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
          <Form.Item label="Type">
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
            label="Job Owner"
            rules={[{ required: true, message: "Owner is required" }]}
            extra="MDL ref, e.g. user:User.System or group:Group.clinical_app_system_administrators__c"
          >
            <Input placeholder="user:User.System" />
          </Form.Item>
          <Form.Item name="timezone" label="Timezone" extra="Empty = Vault Time Zone">
            <Input placeholder="Asia/Shanghai" />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select
              options={[
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
              ]}
            />
          </Form.Item>

          <h3>Schedule</h3>
          <Form.Item name="schedule" label="Schedule" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "Hourly", label: "Hourly" },
                { value: "Daily", label: "Daily" },
                { value: "Weekly", label: "Weekly" },
                { value: "Monthly", label: "Monthly" },
              ]}
            />
          </Form.Item>
          {schedule === "Hourly" && (
            <Form.Item name="hourly_interval" label="Hourly Interval" rules={[{ required: true }]}>
              <Select options={HOURLY_INTERVALS.map((n) => ({ value: n, label: `Every ${n} hour(s)` }))} />
            </Form.Item>
          )}
          {schedule !== "Hourly" && (
            <Form.Item
              name="time"
              label="Vault Time"
              rules={[{ required: true, message: "Time is required" }]}
              extra="24h local Vault time, e.g. 02:00 or 14:30"
            >
              <Input placeholder="02:00" />
            </Form.Item>
          )}
          {schedule === "Weekly" && (
            <Form.Item name="week_day" label="Week Day" rules={[{ required: true }]}>
              <Select options={WEEK_DAYS} />
            </Form.Item>
          )}
          {schedule === "Monthly" && (
            <>
              <Form.Item name="month_repeat_type" label="Month Repeat Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "dayOfTheMonth", label: "Day of the month" },
                    { value: "dayOfTheWeek", label: "Day of the week" },
                  ]}
                />
              </Form.Item>
              {monthRepeatType === "dayOfTheMonth" ? (
                <Form.Item name="day_of_month" label="Day of Month" rules={[{ required: true }]}>
                  <InputNumber min={1} max={31} />
                </Form.Item>
              ) : (
                <>
                  <Form.Item name="week_number" label="Week Number" rules={[{ required: true }]}>
                    <Select
                      options={[1, 2, 3, 4, 5].map((n) => ({
                        value: n,
                        label: n === 5 ? "Last week of month" : `Week ${n}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="week_day" label="Week Day" rules={[{ required: true }]}>
                    <Select options={WEEK_DAYS} />
                  </Form.Item>
                </>
              )}
            </>
          )}

          {!vaultScoped && (
            <>
          <h3>Action Configuration</h3>
          <Form.Item name="action_type" label="Action" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "state_change", label: "State Change" },
                { value: "send_notification", label: "Send a Notification" },
                { value: "noop", label: "No Operation" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="object_name"
            label="Object"
            rules={[{ required: true, message: "Object is required" }]}
          >
            <Input placeholder="milestone__v" />
          </Form.Item>
          {actionType === "state_change" && (
            <>
              <Form.Item
                name="destination_state"
                label="Change State To"
                rules={[{ required: true, message: "Destination state is required" }]}
                extra="Lifecycle state API name, e.g. milestone__v.milestone_lifecycle__v.complete_state__v"
              >
                <Input />
              </Form.Item>
              <Form.Item name="terminate_existing_workflows" valuePropName="checked">
                <Checkbox>Terminate existing workflows to perform action</Checkbox>
              </Form.Item>
            </>
          )}
          {actionType === "send_notification" && (
            <>
              <Form.Item
                name="template"
                label="Notification Template"
                rules={[{ required: true, message: "Template is required" }]}
              >
                <Input placeholder="template_api_name__c" />
              </Form.Item>
              <Form.Item
                name="recipients"
                label="Recipients"
                extra="Comma-separated role/user refs, e.g. owner__v"
              >
                <Input placeholder="owner__v" />
              </Form.Item>
            </>
          )}

          <Form.Item label="Additional Conditions">
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
                    options={CONDITION_OPS.map((op) => ({ value: op, label: op }))}
                    onChange={(op) => {
                      const next = [...conditions];
                      next[idx] = { ...row, operator: op };
                      setConditions(next);
                    }}
                  />
                  <Input
                    placeholder="value"
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
                    Remove
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
                Add Condition
              </Button>
            </Space>
          </Form.Item>

          <Form.Item
            name="trigger_date_field"
            label="Trigger Date Field"
            rules={[{ required: true, message: "Trigger date field is required" }]}
            extra="Object date/datetime field path, e.g. milestone__v.actual_finish_date__v"
          >
            <Input />
          </Form.Item>
          <Form.Item name="date_boundary" label="Trigger Date Boundary" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "only_before", label: "Only before the job date" },
                { value: "before_and_on", label: "Before and on the job date" },
              ]}
            />
          </Form.Item>

          <h3>Optional Notifications</h3>
          <Space orientation="vertical" className="admin-form__stack admin-form__stack--spaced" size="medium">
            {optionalNotifs.map((row, idx) => (
              <div key={row.key} className="admin-form__panel">
                <Space orientation="vertical" className="admin-form__stack">
                  <Input
                    placeholder="Notification template"
                    value={row.template}
                    onChange={(e) => {
                      const next = [...optionalNotifs];
                      next[idx] = { ...row, template: e.target.value };
                      setOptionalNotifs(next);
                    }}
                  />
                  <Input
                    placeholder="Recipients (comma-separated)"
                    value={row.recipients}
                    onChange={(e) => {
                      const next = [...optionalNotifs];
                      next[idx] = { ...row, recipients: e.target.value };
                      setOptionalNotifs(next);
                    }}
                  />
                  <Space>
                    <span>Send Date (days before trigger)</span>
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
                      Remove
                    </Button>
                  </Space>
                  {row.send_date === 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      title="Send Date = 0 requires Trigger Date Boundary = Before and on the job date"
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
              Add Optional Notification
            </Button>
          </Space>
            </>
          )}
        </Form>
      </Spin>
    </AdminPageShell>
  );
}
