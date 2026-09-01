import { ConfigProvider, TimePicker } from "antd";
import { useEffect, useMemo } from "react";
import { useUi } from "../context/UiContext";
import {
  timeFieldPlaceholder,
  timePickerFormat,
} from "../lib/i18n";
import { antdLocaleForDisplay, applyDayjsLocale } from "../lib/i18n/antdLocale";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import {
  isFieldDisabled,
  isFieldRequired,
  parseTimeDayjsValue,
  resolveFieldLabel,
  timeDayjsToWallClock,
} from "./formUtils";

export function TimeInputRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { displayContext } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const format = timePickerFormat(displayContext);
  const use12Hours = format.includes("A") || format.includes("h");
  const current = parseTimeDayjsValue(value);
  const locale = useMemo(
    () => antdLocaleForDisplay(displayContext),
    [displayContext],
  );

  useEffect(() => {
    applyDayjsLocale(displayContext);
  }, [displayContext]);

  return (
    <ConfigProvider locale={locale}>
      {wrapFormControl(
        <TimePicker
          value={current}
          disabled={disabled}
          format={format}
          placeholder={timeFieldPlaceholder(displayContext)}
          aria-label={showLabel ? undefined : label}
          className="field__time"
          use12Hours={use12Hours}
          allowClear={!required && !disabled}
          onChange={(next) => onChange(next ? timeDayjsToWallClock(next) : null)}
        />,
        { label, required, showLabel },
      )}
    </ConfigProvider>
  );
}
