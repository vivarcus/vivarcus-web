import { Select } from "antd";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { FormRendererProps } from "./types";
import { FieldUnavailableControl, wrapFormControl } from "./fieldChrome";
import {
  isFieldDisabled,
  isFieldRequired,
  resolveFieldLabel,
  resolveFieldUnavailableMessage,
  resolvePicklistOptionsWithCurrentValues,
  picklistSelectOptions,
  picklistSelectBehavior,
} from "./formUtils";

export function PicklistSelectRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { shell } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const current = value == null || value === "" ? "" : String(value);
  const options = resolvePicklistOptionsWithCurrentValues(
    element,
    current ? [current] : [],
  );

  if (options.length === 0) {
    const hint = resolveFieldUnavailableMessage(element, shell.picklist_no_options);
    return wrapFormControl(
      <FieldUnavailableControl
        hint={hint}
        control={
          <Select
            disabled
            aria-label={showLabel ? undefined : label}
            placeholder="—"
            options={[]}
          />
        }
      />,
      { label, required, showLabel },
    );
  }

  const picklistBehavior = picklistSelectBehavior(options.length);

  return wrapFormControl(
    <Select
      value={current || undefined}
      disabled={disabled}
      allowClear={!required}
      showSearch={picklistBehavior.showSearch}
      virtual={picklistBehavior.virtual}
      optionFilterProp={picklistBehavior.optionFilterProp}
      aria-label={showLabel ? undefined : label}
      placeholder={displayText(shell.please_select)}
      options={picklistSelectOptions(options)}
      onChange={(next) => onChange(next ?? "")}
    />,
    { label, required, showLabel },
  );
}
