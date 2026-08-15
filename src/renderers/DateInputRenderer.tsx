import { DateFieldInput } from "./DateFieldInput";
import { useUi } from "../context/UiContext";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import {
  isFieldDisabled,
  isFieldRequired,
  resolveFieldLabel,
} from "./formUtils";

export function DateInputRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { displayContext } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);

  return wrapFormControl(
    <DateFieldInput
      value={value}
      disabled={disabled}
      allowClear={!required}
      displayContext={displayContext}
      aria-label={showLabel ? undefined : label}
      onChange={onChange}
    />,
    { label, required, showLabel },
  );
}
