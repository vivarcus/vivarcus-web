import { Modal, Select } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { ObjectTypeOption } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { pickDefaultObjectType } from "../lib/createObjectType";

type Props = {
  open: boolean;
  objectLabel: string;
  objectTypes: ObjectTypeOption[];
  defaultObjectType?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (objectTypeApiName: string) => void;
};

export function CreateObjectTypeModal({
  open,
  objectLabel,
  objectTypes,
  defaultObjectType,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const { shell } = useUi();
  const options = useMemo(
    () =>
      objectTypes.map((type) => ({
        value: type.api_name,
        label: displayText(type.label, type.api_name),
      })),
    [objectTypes],
  );
  const [selectedType, setSelectedType] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedType("");
      return;
    }
    setSelectedType(pickDefaultObjectType(objectTypes, defaultObjectType));
  }, [open, objectTypes, defaultObjectType]);

  return (
    <Modal
      className="create-object-type-modal"
      open={open}
      title={displayTextTemplate(shell.form_create_title, { object: objectLabel })}
      okText={displayText(shell.form_submit_create)}
      cancelText={displayText(shell.cancel)}
      confirmLoading={pending}
      okButtonProps={{ disabled: !selectedType }}
      onCancel={onCancel}
      onOk={() => selectedType && onConfirm(selectedType)}
      destroyOnHidden
    >
      <p>{displayText(shell.select_object_type)}</p>
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
