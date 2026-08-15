import { Alert, Form, Modal, Select } from "antd";
import { useEffect, useMemo } from "react";
import type { DisplayText, PreExecutionDialogModel, PreExecutionInput } from "../api/types";
import { displayText } from "../lib/i18n";

type PreExecutionDialogModalProps = {
  open: boolean;
  actionLabel?: DisplayText;
  actionName?: string;
  dialog: PreExecutionDialogModel | null;
  values: Record<string, string>;
  pending: boolean;
  onValuesChange: (next: Record<string, string>) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

function defaultInputValue(input: PreExecutionInput): string {
  return input.possible_values?.[0]?.key ?? "";
}

function inputOptions(input: PreExecutionInput) {
  return (input.possible_values ?? []).map((value) => ({
    value: value.key,
    label: value.label,
  }));
}

function PreExecutionInputControl({
  input,
  value,
  onChange,
}: {
  input: PreExecutionInput;
  value: string;
  onChange: (next: string) => void;
}) {
  if (input.type === "SINGLE_SELECT_PICK_LIST") {
    return (
      <Form.Item label={input.label} required>
        <Select
          showSearch
          optionFilterProp="label"
          value={value || undefined}
          options={inputOptions(input)}
          onChange={onChange}
        />
      </Form.Item>
    );
  }
  return (
    <Alert
      type="warning"
      showIcon
      title={`Unsupported pre-execution input type: ${input.type}`}
    />
  );
}

export function PreExecutionDialogModal({
  open,
  actionLabel,
  actionName,
  dialog,
  values,
  pending,
  onValuesChange,
  onCancel,
  onConfirm,
}: PreExecutionDialogModalProps) {
  const inputs = dialog?.inputs ?? [];
  const userInput = dialog?.user_input_record_information;

  const title = useMemo(() => {
    if (dialog?.title) {
      return dialog.title;
    }
    if (actionLabel && actionName) {
      return displayText(actionLabel, actionName);
    }
    return "";
  }, [actionLabel, actionName, dialog?.title]);

  useEffect(() => {
    if (!open || inputs.length === 0) {
      return;
    }
    const next = { ...values };
    let changed = false;
    for (const input of inputs) {
      if (!input.key || next[input.key]) {
        continue;
      }
      const fallback = defaultInputValue(input);
      if (fallback) {
        next[input.key] = fallback;
        changed = true;
      }
    }
    if (changed) {
      onValuesChange(next);
    }
  }, [open, inputs, values, onValuesChange]);

  const canConfirm = userInput
    ? false
    : inputs.every((input) => {
        if (input.type !== "SINGLE_SELECT_PICK_LIST") {
          return false;
        }
        return String(values[input.key] ?? "").trim().length > 0;
      }) || (inputs.length === 0 && Boolean(dialog?.message?.trim()));

  return (
    <Modal
      open={open}
      title={title}
      okText={dialog?.continue_label || "Continue"}
      cancelText={dialog?.cancel_label || "Cancel"}
      confirmLoading={pending}
      okButtonProps={{ disabled: !canConfirm }}
      onCancel={onCancel}
      onOk={onConfirm}
      destroyOnClose
    >
      {dialog?.message ? (
        <Alert type="warning" showIcon title={dialog.message} style={{ marginBottom: 16 }} />
      ) : null}
      {userInput ? (
        <Alert
          type="info"
          showIcon
          title="This action requires a user input object form."
          description={`Object: ${userInput.object_api_name ?? ""}${
            userInput.object_type_api_name ? ` (${userInput.object_type_api_name})` : ""
          }`}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form layout="vertical">
        {inputs.map((input) => (
          <PreExecutionInputControl
            key={input.key}
            input={input}
            value={values[input.key] ?? ""}
            onChange={(next) => onValuesChange({ ...values, [input.key]: next })}
          />
        ))}
      </Form>
    </Modal>
  );
}
