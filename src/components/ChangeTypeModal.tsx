import { Modal, Select } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { ChangeTypeAction } from "../api/types";
import { displayText, displayTextTemplate } from "../lib/i18n";

type Props = {
  open: boolean;
  action: ChangeTypeAction;
  objectLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (objectTypeName: string) => void;
};

export function ChangeTypeModal({
  open,
  action,
  objectLabel,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const [selectedType, setSelectedType] = useState<string>("");
  const labels = action.labels;
  const options = useMemo(
    () =>
      action.options.map((option) => ({
        value: option.api_name,
        label: displayText(option.label, option.api_name),
      })),
    [action.options],
  );

  useEffect(() => {
    if (!open) {
      setSelectedType("");
      return;
    }
    setSelectedType(options[0]?.value ?? "");
  }, [open, options]);

  return (
    <Modal
      open={open}
      title={displayTextTemplate(labels.title, { "0": objectLabel })}
      okText={displayText(labels.confirm)}
      cancelText={displayText(labels.cancel)}
      confirmLoading={pending}
      okButtonProps={{ disabled: !selectedType }}
      onCancel={onCancel}
      onOk={() => selectedType && onConfirm(selectedType)}
      destroyOnHidden
    >
      <p>{displayTextTemplate(labels.message, { "0": objectLabel })}</p>
      <Select
        style={{ width: "100%" }}
        value={selectedType || undefined}
        options={options}
        onChange={setSelectedType}
        disabled={pending}
      />
    </Modal>
  );
}
