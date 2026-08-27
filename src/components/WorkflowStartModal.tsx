import { Alert, Form, Modal } from "antd";
import { useMemo } from "react";
import type {
  LifecycleAction,
  PageElement,
  PageSection,
  RecordPageModel,
  WorkflowStartDialogControl,
} from "../api/types";
import { useUi } from "../context/UiContext";
import {
  defaultWorkflowChrome,
  displayText,
  displayTextTemplate,
  type WorkflowChrome,
} from "../lib/i18n";
import { workflowControlFieldName, workflowDialogFieldElement } from "../lib/workflowStartField";
import { RecordFieldCell } from "./record/RecordFieldCell";
import { DateFieldInput } from "../renderers/DateFieldInput";
import { WorkflowParticipantControl } from "./WorkflowParticipantControl";

function findPageElement(sections: PageSection[], fieldAPIName: string): PageElement | undefined {
  for (const section of sections) {
    for (const element of section.elements) {
      if (element.field_api_name === fieldAPIName) {
        return element;
      }
    }
  }
  return undefined;
}

function WorkflowDateControl({
  control,
  value,
  onChange,
}: {
  control: WorkflowStartDialogControl;
  value: string;
  onChange: (next: string) => void;
}) {
  const { displayContext } = useUi();

  return (
    <Form.Item label={control.label || control.control_name} required={control.required}>
      <DateFieldInput
        value={value}
        displayContext={displayContext}
        allowClear={!control.required}
        onChange={(next) => onChange(next ?? "")}
      />
    </Form.Item>
  );
}

function WorkflowStartControl({
  control,
  vaultId,
  objectName,
  recordId,
  page,
  workflow,
  value,
  formValues,
  participantValue,
  dateValue,
  assignmentType,
  onChange,
  onParticipantChange,
  onDateChange,
  onAssignmentTypeChange,
}: {
  control: WorkflowStartDialogControl;
  vaultId: string;
  objectName: string;
  recordId: string;
  page: RecordPageModel;
  workflow: WorkflowChrome;
  value: unknown;
  formValues: Record<string, unknown>;
  participantValue: string[];
  dateValue: string;
  assignmentType?: string;
  onChange: (value: unknown) => void;
  onParticipantChange: (value: string[]) => void;
  onDateChange: (value: string) => void;
  onAssignmentTypeChange?: (value: string) => void;
}) {
  if (control.type === "instructions") {
    const text = control.instructions || control.label;
    if (!text) {
      return null;
    }
    return (
      <div className="workflow-start-instructions">
        <span className="workflow-start-instructions-label">
          {displayText(workflow.instructions_label)}
        </span>
        {text}
      </div>
    );
  }
  if (control.type === "participant" && control.participant_name) {
    return (
      <WorkflowParticipantControl
        control={control}
        vaultId={vaultId}
        objectName={objectName}
        recordId={recordId}
        value={participantValue}
        onChange={onParticipantChange}
        assignmentType={assignmentType}
        onAssignmentTypeChange={control.runtime_choice ? onAssignmentTypeChange : undefined}
        workflow={workflow}
      />
    );
  }
  if (control.type === "date" && control.control_name) {
    return <WorkflowDateControl control={control} value={dateValue} onChange={onDateChange} />;
  }
  if (control.type !== "field" || !control.field_api_name) {
    return null;
  }
  const element = workflowDialogFieldElement(control, findPageElement(page.sections, control.field_api_name));
  if (!element) {
    return (
      <Alert
        type="warning"
        showIcon
        title={displayTextTemplate(workflow.field_not_on_layout, {
          field: control.field_api_name,
        })}
      />
    );
  }
  return (
    <RecordFieldCell
      mode="edit"
      vaultId={vaultId}
      element={element}
      value={value}
      onChange={onChange}
      recordIdPlaceholder={page.record_id}
      formValues={formValues}
    />
  );
}

export function WorkflowStartModal({
  open,
  action,
  page,
  vaultId,
  objectName,
  recordId,
  values,
  participantValues,
  dateValues,
  assignmentTypeValues,
  pending,
  onValuesChange,
  onParticipantValuesChange,
  onDateValuesChange,
  onAssignmentTypeValuesChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  action: LifecycleAction | null;
  page: RecordPageModel;
  vaultId: string;
  objectName: string;
  recordId: string;
  values: Record<string, unknown>;
  participantValues: Record<string, string[]>;
  dateValues: Record<string, string>;
  assignmentTypeValues: Record<string, string>;
  pending: boolean;
  onValuesChange: (next: Record<string, unknown>) => void;
  onParticipantValuesChange: (next: Record<string, string[]>) => void;
  onDateValuesChange: (next: Record<string, string>) => void;
  onAssignmentTypeValuesChange: (next: Record<string, string>) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { shell } = useUi();
  const dialog = action?.workflow_start_dialog;
  const controls = dialog?.controls ?? [];
  const workflow = useMemo(
    () => ({ ...defaultWorkflowChrome, ...(page.workflow ?? {}) }),
    [page.workflow],
  );

  const title = useMemo(() => {
    if (!action) {
      return "";
    }
    if (dialog?.label) {
      return dialog.label;
    }
    return displayText(action.label, action.name);
  }, [action, dialog?.label]);

  const hasRequiredControls = useMemo(
    () => controls.some((control) => control.required),
    [controls],
  );

  const missingRequired = useMemo(() => {
    if (!dialog?.controls) {
      return false;
    }
    return dialog.controls.some((control) => {
      if (control.type === "participant" && control.participant_name && control.runtime_choice) {
        const selected = participantValues[control.participant_name] ?? [];
        const hasUsers = selected.some((id) => id.trim() !== "");
        if (control.required || hasUsers) {
          const mode = assignmentTypeValues[control.participant_name];
          if (mode !== "assigned" && mode !== "available") {
            return true;
          }
        }
      }
      if (!control.required) {
        return false;
      }
      if (control.type === "field" && control.field_api_name) {
        const raw = values[control.field_api_name];
        return raw == null || String(raw).trim() === "";
      }
      if (control.type === "participant" && control.participant_name) {
        const selected = participantValues[control.participant_name] ?? [];
        return selected.length === 0 || selected.every((id) => id.trim() === "");
      }
      if (control.type === "date" && control.control_name) {
        const raw = dateValues[control.control_name];
        return raw == null || String(raw).trim() === "";
      }
      return false;
    });
  }, [dialog?.controls, assignmentTypeValues, dateValues, participantValues, values]);

  if (!action || !dialog) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={title}
      width={532}
      className="workflow-start-modal"
      okText={displayText(action.label, action.name)}
      cancelText={displayText(shell.cancel)}
      onCancel={onCancel}
      onOk={onConfirm}
      confirmLoading={pending}
      okButtonProps={{ disabled: missingRequired }}
      destroyOnClose
    >
      <Form layout="vertical" className="workflow-start-form">
        {controls.length === 0 && (
          <Alert type="info" showIcon title={displayText(workflow.no_additional_info)} />
        )}
        {controls.map((control, index) => (
          <div
            key={`${control.type}-${control.field_api_name ?? control.participant_name ?? control.control_name ?? control.label ?? index}`}
            className="workflow-start-control"
            data-field-api-name={workflowControlFieldName(control) || undefined}
          >
            <WorkflowStartControl
              control={control}
              vaultId={vaultId}
              objectName={objectName}
              recordId={recordId}
              page={page}
              workflow={workflow}
              formValues={values}
              value={control.field_api_name ? values[control.field_api_name] : undefined}
              participantValue={
                control.participant_name ? (participantValues[control.participant_name] ?? []) : []
              }
              dateValue={control.control_name ? (dateValues[control.control_name] ?? "") : ""}
              assignmentType={
                control.participant_name ? (assignmentTypeValues[control.participant_name] ?? "") : ""
              }
              onChange={(next) => {
                if (!control.field_api_name) {
                  return;
                }
                onValuesChange({ ...values, [control.field_api_name]: next });
              }}
              onParticipantChange={(next) => {
                if (!control.participant_name) {
                  return;
                }
                onParticipantValuesChange({
                  ...participantValues,
                  [control.participant_name]: next,
                });
              }}
              onDateChange={(next) => {
                if (!control.control_name) {
                  return;
                }
                onDateValuesChange({
                  ...dateValues,
                  [control.control_name]: next,
                });
              }}
              onAssignmentTypeChange={(next) => {
                if (!control.participant_name) {
                  return;
                }
                onAssignmentTypeValuesChange({
                  ...assignmentTypeValues,
                  [control.participant_name]: next,
                });
              }}
            />
          </div>
        ))}
        {hasRequiredControls && (
          <div className="workflow-start-required-note">{displayText(workflow.required_to_proceed)}</div>
        )}
      </Form>
    </Modal>
  );
}
