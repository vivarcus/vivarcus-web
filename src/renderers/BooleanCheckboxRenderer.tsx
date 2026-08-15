import { Radio } from "antd";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { FormRendererProps } from "./types";
import { isFieldDisabled, isFieldRequired, normalizeBoolean, resolveFieldLabel } from "./formUtils";
import { wrapFormControl } from "./fieldChrome";

export function BooleanCheckboxRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { shell } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const checked = normalizeBoolean(value);
  const yesLabel = displayText(shell.metadata_yes);
  const noLabel = displayText(shell.metadata_no);

  const control = (
    <Radio.Group
      className="field field--boolean-radio"
      value={checked}
      disabled={disabled}
      aria-label={showLabel ? undefined : label}
      onChange={(e) => onChange(e.target.value)}
      optionType="default"
    >
      <Radio value={true}>{yesLabel}</Radio>
      <Radio value={false}>{noLabel}</Radio>
    </Radio.Group>
  );

  if (!showLabel) {
    return control;
  }

  return wrapFormControl(control, { label, showLabel, required });
}
