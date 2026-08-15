import { Link } from "react-router-dom";
import { useUi } from "../context/UiContext";
import { displayText, formatFieldDisplayValue } from "../lib/i18n";
import type { DisplayRendererProps } from "./types";

export function DisplayLinkRenderer({
  value,
  fieldApiName: _fieldApiName,
  fieldType,
  displayContext,
  fieldRender,
  navigationTarget,
}: DisplayRendererProps) {
  const { shell, displayContext: uiDisplayContext } = useUi();
  const ctx = displayContext ?? uiDisplayContext;
  const navTarget = navigationTarget ?? fieldRender?.navigation_target ?? null;
  const displayValue =
    fieldRender?.display_value !== undefined ? fieldRender.display_value : value;

  if (displayValue == null || displayValue === "") {
    return (
      <span className="field-value field-value--empty">
        {displayText(shell.empty_value)}
      </span>
    );
  }

  const recordId = String(value ?? displayValue);
  const text = formatFieldDisplayValue(displayValue, fieldType, ctx);
  const routeRef = navTarget?.route_ref?.trim();

  if (routeRef) {
    const linkText = text.trim() || recordId;
    return (
      <Link to={routeRef} className="field-value field-value--link">
        {linkText}
      </Link>
    );
  }

  return <span className="field-value">{text}</span>;
}
