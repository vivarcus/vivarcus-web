import { Alert, Form, Radio, Select, Space, Tag } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { SharingMemberOption, WorkflowStartDialogControl } from "../api/types";
import { defaultWorkflowChrome, displayText, type WorkflowChrome } from "../lib/i18n";
import { workflowParticipantSearchRoles } from "../lib/workflowParticipantSearch";

function assignmentModeLabel(mode: string | undefined, workflow: WorkflowChrome): string | null {
  switch (mode) {
    case "assigned":
      return displayText(workflow.assignment_assigned);
    case "available":
      return displayText(workflow.assignment_available);
    default:
      return mode ?? null;
  }
}

type Props = {
  control: WorkflowStartDialogControl;
  vaultId: string;
  objectName: string;
  recordId: string;
  value: string[];
  onChange: (next: string[]) => void;
  assignmentType?: string;
  onAssignmentTypeChange?: (next: string) => void;
  lockedUserIDs?: string[];
  disabled?: boolean;
  workflow?: WorkflowChrome;
};

export function WorkflowParticipantControl({
  control,
  vaultId,
  objectName,
  recordId,
  value,
  onChange,
  assignmentType,
  onAssignmentTypeChange,
  lockedUserIDs = [],
  disabled = false,
  workflow: workflowProp,
}: Props) {
  const workflow = useMemo(
    () => ({ ...defaultWorkflowChrome, ...(workflowProp ?? {}) }),
    [workflowProp],
  );
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SharingMemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelByUserID, setLabelByUserID] = useState<Record<string, string>>({});

  const locked = useMemo(
    () => lockedUserIDs.filter((id) => id.trim() !== ""),
    [lockedUserIDs],
  );

  const roleFilters = useMemo(() => workflowParticipantSearchRoles(control), [control]);

  const runSearch = useCallback(
    async (term: string) => {
      if (!vaultId || !objectName || !recordId) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await api.searchSharingMembers(vaultId, objectName, recordId, {
          q: term.trim() || undefined,
          limit: 25,
          workflow_participants: true,
          ...roleFilters,
        });
        const users = res.options.filter((opt) => opt.member_kind === "user");
        setOptions(users);
        setLabelByUserID((prev) => {
          const next = { ...prev };
          for (const opt of users) {
            next[opt.member_id] = opt.label;
          }
          return next;
        });
      } catch (err) {
        setOptions([]);
        setError(err instanceof Error ? err.message : displayText(workflow.load_users_failed));
      } finally {
        setLoading(false);
      }
    },
    [vaultId, objectName, recordId, roleFilters, workflow.load_users_failed],
  );

  useEffect(() => {
    void runSearch("");
  }, [runSearch]);

  const selectOptions = useMemo(() => {
    const seen = new Set<string>();
    const out = options.map((opt) => {
      seen.add(opt.member_id);
      return { value: opt.member_id, label: opt.label };
    });
    for (const userID of value) {
      if (seen.has(userID)) {
        continue;
      }
      out.push({ value: userID, label: labelByUserID[userID] ?? userID });
    }
    return out;
  }, [labelByUserID, options, value]);

  const modeLabel = assignmentModeLabel(control.assignment_mode_label, workflow);
  const runtimeChoice = !!control.runtime_choice;

  return (
    <Form.Item
      label={
        <Space size={4}>
          <span>{control.label || control.participant_name}</span>
          <QuestionCircleOutlined />
          {!runtimeChoice && modeLabel ? (
            <Tag className="workflow-start-assignment-tag">{modeLabel}</Tag>
          ) : null}
        </Space>
      }
      required={control.required && locked.length === 0}
    >
      {runtimeChoice && onAssignmentTypeChange ? (
        <Radio.Group
          value={assignmentType || undefined}
          disabled={disabled}
          onChange={(e) => onAssignmentTypeChange?.(e.target.value)}
          style={{ marginBottom: 8 }}
        >
          <Radio value="assigned">{displayText(workflow.assignment_assigned)}</Radio>
          <Radio value="available">{displayText(workflow.assignment_available)}</Radio>
        </Radio.Group>
      ) : null}
      <Select
        mode="multiple"
        showSearch
        filterOption={false}
        loading={loading}
        allowClear={!disabled && locked.length === 0}
        disabled={disabled}
        value={value}
        options={selectOptions}
        placeholder={displayText(workflow.select_users)}
        // Portal to body so options are not clipped inside the start-dialog modal.
        getPopupContainer={() => document.body}
        onSearch={(term) => {
          setSearch(term);
          void runSearch(term);
        }}
        onChange={(next) => {
          const merged = [...new Set([...locked, ...next])];
          onChange(merged);
        }}
        tagRender={
          locked.length === 0
            ? undefined
            : (props) => {
                const lockedTag = locked.includes(String(props.value));
                return (
                  <Tag
                    closable={props.closable && !lockedTag}
                    onClose={lockedTag ? undefined : props.onClose}
                    style={{ marginInlineEnd: 4 }}
                  >
                    {props.label}
                  </Tag>
                );
              }
        }
        onBlur={() => {
          if (search) {
            setSearch("");
            void runSearch("");
          }
        }}
      />
      {error ? <Alert type="error" showIcon title={error} style={{ marginTop: 8 }} /> : null}
    </Form.Item>
  );
}
