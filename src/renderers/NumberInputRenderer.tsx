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
  resolveFieldLabel,
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
  const scale = resolveFieldScale(element);
  const numericValue =
    value == null || value === "" ? null : Number(value);
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
          precision={scale}
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
            return formatNumberDisplayValue(numeric, displayContext, scale);
          }}
          parser={(raw) => parseLocaleNumberInput(raw ?? "", intlLocale)}
          onChange={(next) => onChange(next ?? null)}
        />,
        { label, required, showLabel },
      )}
    </ConfigProvider>
  );
}
