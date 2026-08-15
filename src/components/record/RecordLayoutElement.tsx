import type { DisplayText } from "../../api/types";
import { displayText } from "../../lib/i18n";
import { useUi } from "../../context/UiContext";
import { FieldValue } from "../FieldValue";

type Props = {
  kind: string;
  label?: DisplayText;
  name?: string;
  value?: unknown;
  vaultId?: string;
  fieldApiName?: string;
  fieldType?: string;
  targetObjectApiName?: string;
  tabApiName?: string;
  displayContext?: import("../../api/types").DisplayContext;
};

export function RecordLayoutElement({
  kind,
  label,
  name,
  value,
  vaultId,
  fieldApiName,
  fieldType,
  targetObjectApiName,
  tabApiName,
  displayContext,
}: Props) {
  const { shell } = useUi();
  const text = displayText(label, name);

  switch (kind) {
    case "helpSection":
      return (
        <div className="layout-help">
          <p>{text || displayText(shell.help_placeholder)}</p>
        </div>
      );
    case "text":
      if (vaultId && (value !== undefined || fieldApiName)) {
        return (
          <div className="layout-text">
            <FieldValue
              vaultId={vaultId}
              value={value}
              fieldApiName={fieldApiName}
              fieldType={fieldType}
              targetObjectApiName={targetObjectApiName}
              tabApiName={tabApiName}
              displayContext={displayContext}
            />
          </div>
        );
      }
      return (
        <div className="layout-text">
          <p>{text}</p>
        </div>
      );
    case "spacer":
      return <hr className="layout-spacer" aria-hidden />;
    default:
      return null;
  }
}

export function recordLayoutElementKey(
  kind: string,
  name?: string,
  label?: DisplayText,
  index?: number,
): string {
  if (name?.trim()) {
    return `${kind}-${name}`;
  }
  const labelText = label ? displayText(label) : "";
  if (labelText.trim()) {
    return `${kind}-${labelText}`;
  }
  return `${kind}-${index ?? 0}`;
}
