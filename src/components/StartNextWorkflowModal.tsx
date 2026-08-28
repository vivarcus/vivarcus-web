import { Modal, Radio } from "antd";
import { useEffect, useState } from "react";
import type { LifecycleAction } from "../api/types";
import { useUi } from "../context/UiContext";
import { defaultWorkflowChrome, displayText, displayTextTemplate } from "../lib/i18n";

type Choice = "start" | "none";

type Props = {
  open: boolean;
  workflowLabel?: string;
  actions: LifecycleAction[];
  pending?: boolean;
  onCancel: () => void;
  onSelect: (action: LifecycleAction) => void;
};

export function StartNextWorkflowModal({
  open,
  workflowLabel,
  actions,
  pending,
  onCancel,
  onSelect,
}: Props) {
  const { shell } = useUi();
  const workflow = defaultWorkflowChrome;
  const [choice, setChoice] = useState<Choice>("start");
  const [selected, setSelected] = useState(actions[0]?.name ?? "");

  useEffect(() => {
    if (open) {
      setChoice("start");
      setSelected(actions[0]?.name ?? "");
    }
  }, [open, actions]);

  const chosen = actions.find((action) => action.name === selected) ?? actions[0];
  const canContinue = choice === "none" || Boolean(chosen);

  return (
    <Modal
      open={open}
      title={displayText(workflow.start_next_workflow_title)}
      okText={displayText(shell.continue)}
      cancelText={displayText(shell.cancel)}
      confirmLoading={pending}
      okButtonProps={{ disabled: !canContinue }}
      onCancel={onCancel}
      onOk={() => {
        if (choice === "none") {
          onCancel();
          return;
        }
        if (chosen) {
          onSelect(chosen);
        }
      }}
    >
      <p>
        {displayTextTemplate(workflow.start_next_workflow_body, {
          label: workflowLabel?.trim() || displayText(workflow.task_fallback),
        })}
      </p>
      <Radio.Group
        className="start-next-workflow-picker"
        value={choice}
        onChange={(event) => setChoice(event.target.value as Choice)}
      >
        <Radio value="start" style={{ display: "block", marginBlock: 8 }}>
          {displayText(workflow.start_next_workflow_start)}
        </Radio>
        {choice === "start" ? (
          <Radio.Group
            className="start-next-workflow-picker__workflows"
            value={chosen?.name}
            onChange={(event) => setSelected(String(event.target.value))}
            style={{ display: "block", marginInlineStart: 24, marginBlockEnd: 8 }}
          >
            {actions.map((action) => (
              <Radio key={action.name} value={action.name} style={{ display: "block", marginBlock: 8 }}>
                {displayText(action.label, action.name)}
              </Radio>
            ))}
          </Radio.Group>
        ) : null}
        <Radio value="none" style={{ display: "block", marginBlock: 8 }}>
          {displayText(workflow.start_next_workflow_none)}
        </Radio>
      </Radio.Group>
    </Modal>
  );
}
