import { DateFieldInput } from "./DateFieldInput";
import { useUi } from "../context/UiContext";
import { useFormChrome } from "../context/FormChromeContext";
import { displayText } from "../lib/i18n";
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
  const formChrome = useFormChrome();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);

  return wrapFormControl(
    <DateFieldInput
      value={value}
      disabled={disabled}
      allowClear={!required}
      displayContext={displayContext}
      calendarAriaLabel={displayText(formChrome.open_calendar)}
      calendarLanguage={formChrome.open_calendar.language}
      aria-label={showLabel ? undefined : label}
      onChange={onChange}
    />,
    { label, required, showLabel },
  );
}
