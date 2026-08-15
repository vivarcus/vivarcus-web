import { TimePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useUi } from "../context/UiContext";
import { dateFieldPlaceholder, defaultFormChrome, displayText } from "../lib/i18n";
import type { FormRendererProps } from "./types";
import { DateFieldInput } from "./DateFieldInput";
import { wrapFormControl } from "./fieldChrome";
import {
  dateTimeDayjsToUtcIso,
  isFieldDisabled,
  isFieldRequired,
  parseDateTimeDayjsValue,
  resolveFieldLabel,
} from "./formUtils";

/** Veeva DateTime edit UI uses a 12-hour time mask with AM/PM. */
const TIME_FORMAT = "h:mm A";

export function DateTimeInputRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const { displayContext } = useUi();
  const label = resolveFieldLabel(element);
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const current = parseDateTimeDayjsValue(value, displayContext);
  const language = (displayContext.language ?? "").toLowerCase();
  const nowLabel = language.startsWith("zh")
    ? "现在"
    : displayText(defaultFormChrome.datetime_now, "Now");

  const emit = (next: Dayjs | null) => {
    if (!next) {
      onChange(null);
      return;
    }
    onChange(dateTimeDayjsToUtcIso(next, displayContext));
  };

  const onDatePartChange = (isoDate: string | null) => {
    if (!isoDate) {
      emit(null);
      return;
    }
    const nextDate = dayjs(isoDate, "YYYY-MM-DD", true);
    if (!nextDate.isValid()) {
      emit(null);
      return;
    }
    const base = current ?? nextDate.hour(0).minute(0).second(0).millisecond(0);
    emit(base.year(nextDate.year()).month(nextDate.month()).date(nextDate.date()));
  };

  const onTimeChange = (nextTime: Dayjs | null) => {
    if (!nextTime) {
      if (!current) {
        emit(null);
        return;
      }
      emit(current.hour(0).minute(0).second(0).millisecond(0));
      return;
    }
    const base =
      current ??
      parseDateTimeDayjsValue(new Date().toISOString(), displayContext) ??
      nextTime;
    emit(base.hour(nextTime.hour()).minute(nextTime.minute()).second(0).millisecond(0));
  };

  const onNow = () => {
    emit(parseDateTimeDayjsValue(new Date().toISOString(), displayContext));
  };

  return wrapFormControl(
    <div className="field__datetime">
      <DateFieldInput
        className="field__datetime-date"
        value={current ? current.format("YYYY-MM-DD") : null}
        disabled={disabled}
        allowClear={!required}
        displayContext={displayContext}
        placeholder={dateFieldPlaceholder(displayContext, false)}
        aria-label={showLabel ? `${label} date` : label}
        onChange={onDatePartChange}
      />
      <TimePicker
        value={current}
        disabled={disabled}
        format={TIME_FORMAT}
        placeholder={TIME_FORMAT}
        aria-label={showLabel ? `${label} time` : label}
        className="field__datetime-time"
        use12Hours
        onChange={onTimeChange}
      />
      {!disabled && (
        <button type="button" className="field__datetime-now" onClick={onNow}>
          {nowLabel}
        </button>
      )}
    </div>,
    { label, required, showLabel },
  );
}
