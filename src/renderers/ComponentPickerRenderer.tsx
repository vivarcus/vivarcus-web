import { Input } from "antd";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import { resolveFieldLabel } from "./formUtils";
import { DisplayTextRenderer } from "./DisplayTextRenderer";

/** Phase 3: component fields are readonly-only; show display value in forms. */
export function ComponentPickerRenderer({
  element,
  value,
  showLabel = true,
}: FormRendererProps) {
  const label = resolveFieldLabel(element);
  const displayText =
    element.field_render?.display_value != null &&
    String(element.field_render.display_value).trim() !== ""
      ? String(element.field_render.display_value)
      : String(value ?? "");

  if (element.field_render?.editability === "editable") {
    return wrapFormControl(
      <Input
        value={displayText}
        readOnly
        aria-label={showLabel ? undefined : label}
      />,
      { label, showLabel },
    );
  }

  return (
    <DisplayTextRenderer
      value={value}
      fieldApiName={element.field_api_name}
      fieldType={element.field_type ?? element.field_render?.field_type}
      fieldRender={element.field_render}
    />
  );
}
