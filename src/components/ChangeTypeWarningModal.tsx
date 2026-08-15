import { Modal } from "antd";
import type { ChangeTypeWarning } from "../api/types";
import { displayText, displayTextTemplate } from "../lib/i18n";

type Props = {
  open: boolean;
  warning: ChangeTypeWarning | null;
  objectLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ChangeTypeWarningModal({
  open,
  warning,
  objectLabel,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  if (!warning) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={displayTextTemplate(warning.title, { "0": objectLabel })}
      okText={displayText(warning.confirm)}
      cancelText={displayText(warning.cancel)}
      confirmLoading={pending}
      onCancel={onCancel}
      onOk={onConfirm}
      destroyOnHidden
    >
      <p>{displayTextTemplate(warning.message, { "0": objectLabel })}</p>
      {warning.fields && warning.fields.length > 0 ? (
        <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
          {warning.fields.map((field) => (
            <li key={field.api_name}>{displayText(field.label, field.api_name)}</li>
          ))}
        </ul>
      ) : null}
      <p>{displayText(warning.warning_confirm)}</p>
    </Modal>
  );
}
