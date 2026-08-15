import { Input } from "antd";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import { isFieldDisabled, isFieldRequired, resolveFieldLabel } from "./formUtils";

export function TextAreaRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const maxLength =
    element.max_length && element.max_length > 0
      ? element.max_length
      : element.field_render?.max_length && element.field_render.max_length > 0
        ? element.field_render.max_length
        : undefined;

  return wrapFormControl(
    <Input.TextArea
      value={String(value ?? "")}
      disabled={disabled}
      aria-label={showLabel ? undefined : label}
      maxLength={maxLength}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
    />,
    { label, required, showLabel },
  );
}
