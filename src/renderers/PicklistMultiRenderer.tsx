import { Select } from "antd";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { FormRendererProps } from "./types";
import { FieldUnavailableControl, wrapFormControl } from "./fieldChrome";
import {
  isFieldDisabled,
  isFieldRequired,
  normalizePicklistSelection,
  resolveFieldLabel,
  resolveFieldUnavailableMessage,
  resolvePicklistOptionsWithCurrentValues,
  picklistSelectOptions,
  picklistSelectBehavior,
} from "./formUtils";

export function PicklistMultiRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { shell } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const selected = normalizePicklistSelection(value);
  const options = resolvePicklistOptionsWithCurrentValues(element, selected);

  if (options.length === 0) {
    const hint = resolveFieldUnavailableMessage(element, shell.picklist_no_options);
    return wrapFormControl(
      <FieldUnavailableControl
        hint={hint}
        control={
          <Select
            mode="multiple"
            disabled
            aria-label={showLabel ? undefined : label}
            placeholder="—"
            options={[]}
          />
        }
      />,
      { label, required, showLabel, className: "field field--picklist-multi" },
    );
  }

  const picklistBehavior = picklistSelectBehavior(options.length);
  const optionsKey = options.map((entry) => entry.name).join("\0");

  return wrapFormControl(
    <Select
      key={optionsKey}
      mode="multiple"
      value={selected}
      disabled={disabled}
      allowClear={!required}
      showSearch={picklistBehavior.showSearch}
      virtual={picklistBehavior.virtual}
      optionFilterProp={picklistBehavior.optionFilterProp}
      maxTagCount="responsive"
      aria-label={showLabel ? undefined : label}
      placeholder={displayText(shell.please_select)}
      options={picklistSelectOptions(options)}
      onChange={(next) => onChange([...next])}
    />,
    { label, required, showLabel, className: "field field--picklist-multi" },
  );
}
