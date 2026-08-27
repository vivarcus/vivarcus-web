import { Modal, Radio } from "antd";
import { useEffect, useState } from "react";
import type { LifecycleAction } from "../api/types";
import { useUi } from "../context/UiContext";
import { defaultWorkflowChrome, displayText } from "../lib/i18n";

type Props = {
  open: boolean;
  actions: LifecycleAction[];
  pending?: boolean;
  onCancel: () => void;
  onSelect: (action: LifecycleAction) => void;
};

export function StartWorkflowPickerModal({ open, actions, pending, onCancel, onSelect }: Props) {
  const { shell } = useUi();
  const [selected, setSelected] = useState(actions[0]?.name ?? "");

  useEffect(() => {
    if (open) {
      setSelected(actions[0]?.name ?? "");
    }
  }, [open, actions]);

  const chosen = actions.find((action) => action.name === selected) ?? actions[0];

  return (
    <Modal
      open={open}
      title={displayText(defaultWorkflowChrome.start_workflow_select)}
      okText={displayText(shell.continue)}
      cancelText={displayText(shell.cancel)}
      confirmLoading={pending}
      okButtonProps={{ disabled: !chosen }}
      onCancel={onCancel}
      onOk={() => {
        if (chosen) {
          onSelect(chosen);
        }
      }}
    >
      <Radio.Group
        className="start-workflow-picker"
        value={chosen?.name}
        onChange={(event) => setSelected(String(event.target.value))}
      >
        {actions.map((action) => (
          <Radio key={action.name} value={action.name} style={{ display: "block", marginBlock: 8 }}>
            {displayText(action.label, action.name)}
          </Radio>
        ))}
      </Radio.Group>
    </Modal>
  );
}
