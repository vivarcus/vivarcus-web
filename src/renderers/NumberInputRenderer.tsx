import { InputNumber } from "antd";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import {
  isFieldDisabled,
  isFieldRequired,
  resolveFieldLabel,
  resolveFieldScale,
} from "./formUtils";

export function NumberInputRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const scale = resolveFieldScale(element);
  const numericValue =
    value == null || value === "" ? null : Number(value);

  return wrapFormControl(
    <InputNumber
      value={Number.isFinite(numericValue) ? numericValue : null}
      precision={scale}
      disabled={disabled}
      // Commit while typing so a late form/prefetch re-render cannot wipe an un-blurred draft.
      changeOnBlur={false}
      aria-label={showLabel ? undefined : label}
      style={{ width: "100%" }}
      onChange={(next) => onChange(next ?? null)}
    />,
    { label, required, showLabel },
  );
}
