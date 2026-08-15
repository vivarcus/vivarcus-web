import { Alert, Button, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";

type Props = {
  open: boolean;
  chrome: ListChrome;
  title: string;
  initialName?: string;
  showInfo?: boolean;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
};

export function SaveViewNameDialog({
  open,
  chrome,
  title,
  initialName = "",
  showInfo = false,
  saving = false,
  error = null,
  onClose,
  onSave,
}: Props) {
  const { shell } = useUi();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  return (
    <Modal
      open={open}
      className="save-view-name-dialog"
      title={title}
      width={480}
      onCancel={onClose}
      footer={[
        <Button key="cancel" disabled={saving} onClick={onClose}>
          {displayText(shell.cancel)}
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={!name.trim()}
          onClick={() => void onSave(name.trim())}
        >
          {displayText(shell.save)}
        </Button>,
      ]}
    >
      {error && <Alert type="error" title={error} showIcon role="alert" className="save-view-name-dialog__error" />}
      {showInfo && (
        <p className="save-view-name-dialog__info">{displayText(chrome.save_view_dialog_info)}</p>
      )}
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label={displayText(chrome.view_label)} required>
          <Input
            value={name}
            maxLength={40}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onPressEnter={() => {
              if (name.trim() && !saving) {
                void onSave(name.trim());
              }
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
