import { useUi } from "../context/UiContext";
import { displayText, formatFieldDisplayValue, resolveDisplayFormatValue } from "../lib/i18n";
import type { DisplayRendererProps } from "./types";

export function DisplayTextRenderer({
  value,
  fieldApiName,
  fieldType,
  displayContext,
  fieldRender,
}: DisplayRendererProps) {
  const { shell, displayContext: uiDisplayContext } = useUi();
  const ctx = displayContext ?? uiDisplayContext;
  const resolvedFieldType = fieldType ?? fieldRender?.field_type;
  const displayValue = resolveDisplayFormatValue(
    value,
    resolvedFieldType,
    fieldRender?.display_value,
  );

  if (displayValue == null || displayValue === "") {
    return (
      <span className="field-value field-value--empty">
        {displayText(shell.empty_value)}
      </span>
    );
  }

  const text = formatFieldDisplayValue(
    displayValue,
    resolvedFieldType,
    ctx,
    fieldRender?.picklist_options,
  );

  if (fieldApiName?.endsWith("_status__v") || fieldApiName === "state__v") {
    return <span className="field-value badge badge--info">{text}</span>;
  }

  if (text.length > 120) {
    return (
      <span className="field-value field-value--long" title={text}>
        {text}
      </span>
    );
  }

  return <span className="field-value">{text}</span>;
}
