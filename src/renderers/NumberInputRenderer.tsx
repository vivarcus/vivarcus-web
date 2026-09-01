import { ConfigProvider, InputNumber } from "antd";
import { useMemo } from "react";
import { useUi } from "../context/UiContext";
import {
  formatNumberDisplayValue,
  normalizeIntlLocale,
  parseLocaleNumberInput,
} from "../lib/i18n";
import { antdLocaleForDisplay } from "../lib/i18n/antdLocale";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import {
  isFieldDisabled,
  isFieldRequired,
  percentDisplayScale,
  resolveFieldLabel,
  resolveFieldMaxValue,
  resolveFieldMinValue,
  resolveFieldScale,
} from "./formUtils";

export function NumberInputRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { displayContext } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const storedScale = resolveFieldScale(element);
  const fieldType = element.field_type ?? element.field_render?.field_type;
  const isPercent = fieldType === "Percent";
  const displayScale = isPercent ? percentDisplayScale(storedScale) : storedScale;
  const stored = value == null || value === "" ? null : Number(value);
  const numericValue =
    stored == null || !Number.isFinite(stored) ? null : isPercent ? stored * 100 : stored;
  const storedMin = resolveFieldMinValue(element);
  const storedMax = resolveFieldMaxValue(element);
  const min =
    storedMin == null ? undefined : isPercent ? storedMin * 100 : storedMin;
  const max =
    storedMax == null ? undefined : isPercent ? storedMax * 100 : storedMax;
  const locale = useMemo(
    () => antdLocaleForDisplay(displayContext),
    [displayContext],
  );
  const intlLocale = normalizeIntlLocale(displayContext.locale);

  return (
    <ConfigProvider locale={locale}>
      {wrapFormControl(
        <InputNumber
          value={Number.isFinite(numericValue) ? numericValue : null}
          precision={displayScale}
          min={min}
          max={max}
          disabled={disabled}
          // Commit while typing so a late form/prefetch re-render cannot wipe an un-blurred draft.
          changeOnBlur={false}
          aria-label={showLabel ? undefined : label}
          style={{ width: "100%" }}
          formatter={(raw, info) => {
            if (info.userTyping) {
              return info.input;
            }
            if (raw == null || raw === "") {
              return "";
            }
            const numeric = typeof raw === "number" ? raw : Number(raw);
            if (!Number.isFinite(numeric)) {
              return String(raw);
            }
            return formatNumberDisplayValue(numeric, displayContext, displayScale);
          }}
          parser={(raw) => parseLocaleNumberInput(raw ?? "", intlLocale)}
          onChange={(next) => {
            if (next == null) {
              onChange(null);
              return;
            }
            onChange(isPercent ? next / 100 : next);
          }}
        />,
        { label, required, showLabel },
      )}
    </ConfigProvider>
  );
}
