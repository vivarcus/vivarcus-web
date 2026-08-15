import type { FieldRenderModel, ListColumn } from "../api/types";
import { picklistDisplayLabels } from "./i18n/formatValue";

type IconValue = {
  name: string;
  color?: string;
  title?: string;
};

function isIconValue(value: unknown): value is IconValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as IconValue).name === "string" &&
    (value as IconValue).name.trim() !== ""
  );
}

export function iconValueFromField(value: unknown): FieldRenderModel["icon"] | undefined {
  if (!isIconValue(value)) {
    return undefined;
  }
  return {
    name: value.name,
    color: value.color,
    title: value.title,
  };
}

/** Tooltip text for list cells. Icon/hovercard cells use popovers instead of native titles. */
export function listCellTooltipText(
  column: ListColumn,
  value: unknown,
  refDisplayValue?: unknown,
  hasHoverCard?: boolean,
): string | undefined {
  if (hasHoverCard) {
    return undefined;
  }
  const fieldRender = listCellFieldRender(column, value) ?? column.field_render;
  if (fieldRender?.renderer_kind === "display_icon") {
    return undefined;
  }
  const source = refDisplayValue ?? value;
  if (iconValueFromField(source)) {
    return undefined;
  }
  if (source == null || source === "") {
    return undefined;
  }
  if (typeof source === "object") {
    return undefined;
  }
  const text = String(source).trim();
  return text || undefined;
}

/** Merge list column field_render with row value for display renderers (icon, picklist). */
export function listCellFieldRender(
  column: ListColumn,
  value: unknown,
): FieldRenderModel | undefined {
  const base = column.field_render;
  if (!base) {
    return undefined;
  }
  const icon = iconValueFromField(value);
  if (icon || base.renderer_kind === "display_icon") {
    return {
      ...base,
      renderer_kind: "display_icon",
      icon: icon ?? base.icon,
    };
  }
  if (base.picklist_options?.length && value != null && value !== "") {
    const label = picklistDisplayLabels(value, base.picklist_options);
    if (label) {
      return { ...base, display_value: label };
    }
  }
  return base;
}
