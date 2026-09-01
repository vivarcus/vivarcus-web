import { CalendarOutlined } from "@ant-design/icons";
import { ConfigProvider, DatePicker, Input } from "antd";
import type { InputRef } from "antd/es/input";
import type { Dayjs } from "dayjs";
import type { CSSProperties } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  dateFieldPlaceholder,
  datePickerFormat,
  normalizeDateInputText,
  type DisplayContext,
} from "../lib/i18n";
import { antdLocaleForDisplay, applyDayjsLocale } from "../lib/i18n/antdLocale";
import { parseDayjsValue } from "./formUtils";

export type DateFieldInputProps = {
  /** Stored value: YYYY-MM-DD, empty string, or null. */
  value: unknown;
  onChange: (next: string | null) => void;
  displayContext?: DisplayContext;
  disabled?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  calendarAriaLabel?: string;
  calendarLanguage?: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
};

function formatStoredForEdit(
  stored: unknown,
  displayContext?: DisplayContext,
): string {
  const parsed = parseDayjsValue(stored, displayContext);
  if (!parsed) {
    return "";
  }
  return parsed.format(datePickerFormat(displayContext, false));
}

function cssSafeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function isInsideOwnDatePopup(node: Node | null, popupClass: string): boolean {
  if (!node || !(node instanceof Element) || !popupClass) {
    return false;
  }
  return Boolean(node.closest(`.${popupClass}`));
}

function openCalendarAriaLabel(displayContext?: DisplayContext): string {
  const language = (displayContext?.language ?? "").toLowerCase();
  if (language.startsWith("zh")) {
    return "打开日历";
  }
  return "Open calendar";
}

function calendarDisplayContext(
  displayContext: DisplayContext | undefined,
  calendarLanguage: string | undefined,
): DisplayContext | undefined {
  const language = calendarLanguage?.trim();
  if (!language) {
    return displayContext;
  }
  return {
    language,
    locale: language,
    timezone: displayContext?.timezone ?? "UTC",
    date_format_profile: displayContext?.date_format_profile,
  };
}

/**
 * Text-first date entry with an optional calendar panel.
 * Commits on blur / Enter via flexible parse; calendar selection is only a helper.
 */
export function DateFieldInput({
  value,
  onChange,
  displayContext,
  disabled = false,
  allowClear = true,
  placeholder,
  calendarAriaLabel,
  calendarLanguage,
  className,
  style,
  "aria-label": ariaLabel,
}: DateFieldInputProps) {
  const pickerId = useId();
  const popupClass = `date-field-input__popup-${cssSafeId(pickerId)}`;
  const rootRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<InputRef>(null);
  const suppressOpenOnFocusRef = useRef(false);
  const [text, setText] = useState(() =>
    formatStoredForEdit(value, displayContext),
  );
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (focused) {
      return;
    }
    setText(formatStoredForEdit(value, displayContext));
    setInvalid(false);
    // Sync from the committed value only — do not depend on `focused`, or an
    // invalid blur would immediately wipe the error state when focus flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [value, displayContext]);

  const focusTextInput = () => {
    inputRef.current?.input?.focus({ preventScroll: true });
  };

  const openCalendar = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
    // DatePicker steals focus on open (and may scroll the page); keep typing focus.
    queueMicrotask(focusTextInput);
    requestAnimationFrame(focusTextInput);
  };

  const commitText = (raw: string) => {
    const normalized = normalizeDateInputText(raw);
    if (!normalized) {
      setInvalid(false);
      setText("");
      onChange(null);
      return;
    }
    const parsed = parseDayjsValue(normalized, displayContext);
    if (!parsed) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(parsed.format(datePickerFormat(displayContext, false)));
    onChange(parsed.format("YYYY-MM-DD"));
  };

  const restoreTextFocusWithoutOpening = () => {
    const inputEl = inputRef.current?.input;
    if (inputEl && document.activeElement === inputEl) {
      return;
    }
    suppressOpenOnFocusRef.current = true;
    focusTextInput();
  };

  const onCalendarChange = (next: Dayjs | null) => {
    if (!next) {
      setInvalid(false);
      setText("");
      onChange(null);
      setOpen(false);
      return;
    }
    setInvalid(false);
    setText(next.format(datePickerFormat(displayContext, false)));
    onChange(next.format("YYYY-MM-DD"));
    setOpen(false);
    restoreTextFocusWithoutOpening();
  };

  const calendarContext = useMemo(
    () => calendarDisplayContext(displayContext, calendarLanguage),
    [calendarLanguage, displayContext],
  );
  const locale = useMemo(
    () => antdLocaleForDisplay(calendarContext),
    [calendarContext],
  );
  const calendarAria =
    calendarAriaLabel?.trim() || openCalendarAriaLabel(calendarContext);

  useEffect(() => {
    applyDayjsLocale(calendarContext);
  }, [calendarContext]);

  return (
    <ConfigProvider locale={locale}>
      <span
        ref={rootRef}
        className={["date-field-input", className].filter(Boolean).join(" ")}
        style={style}
      >
        <Input
          ref={inputRef}
          value={text}
          disabled={disabled}
          placeholder={
            placeholder ?? dateFieldPlaceholder(displayContext, false)
          }
          status={invalid ? "error" : undefined}
          allowClear={allowClear && !disabled}
          aria-label={ariaLabel}
          aria-invalid={invalid}
          onChange={(event) => {
            setText(event.target.value);
            if (invalid) {
              setInvalid(false);
            }
          }}
          onFocus={() => {
            setFocused(true);
            if (suppressOpenOnFocusRef.current) {
              suppressOpenOnFocusRef.current = false;
              return;
            }
            openCalendar();
          }}
          onBlur={(event) => {
            const related = event.relatedTarget as Node | null;
            // This field's hidden DatePicker stole focus — restore typing focus.
            // Do not match another date field's picker via a shared class.
            if (
              related instanceof Element &&
              (rootRef.current?.contains(related) ||
                isInsideOwnDatePopup(related, popupClass))
            ) {
              restoreTextFocusWithoutOpening();
              return;
            }
            // Flush the typed value before the next event (submit click) reads
            // parent state. Closing the calendar stays deferred so a day
            // mousedown can still reach onCalendarChange.
            flushSync(() => {
              commitText(textRef.current);
            });
            window.setTimeout(() => {
              const active = document.activeElement;
              if (
                active === inputRef.current?.input ||
                isInsideOwnDatePopup(active, popupClass)
              ) {
                return;
              }
              setFocused(false);
              setOpen(false);
            }, 0);
          }}
          onPressEnter={(event) => {
            commitText((event.target as HTMLInputElement).value);
            setOpen(false);
            (event.target as HTMLInputElement).blur();
          }}
          suffix={
            <CalendarOutlined
              className="date-field-input__calendar"
              role="button"
              aria-label={calendarAria}
              aria-controls={pickerId}
              aria-expanded={open}
              onMouseDown={(event) => {
                // Keep text focus; avoid Input blur racing the open.
                event.preventDefault();
              }}
              onClick={() => {
                if (disabled) {
                  return;
                }
                if (open) {
                  setOpen(false);
                } else {
                  openCalendar();
                }
              }}
            />
          }
        />
        <DatePicker
          id={pickerId}
          className="date-field-input__picker"
          tabIndex={-1}
          open={open}
          placement="bottomLeft"
          classNames={{ popup: { root: popupClass } }}
          // Small gap so flipped top placement does not sit flush on the field border.
          styles={{ popup: { root: { marginTop: 4, marginBottom: 4 } } }}
          panelRender={(panel) => (
            <div
              onMouseDown={(event) => {
                // Keep the text input focused while picking a day.
                event.preventDefault();
              }}
            >
              {panel}
            </div>
          )}
          onOpenChange={(next) => {
            if (next) {
              openCalendar();
              return;
            }
            // Ignore close when focus is still in our text input (DatePicker
            // loses focus by design while the user types).
            const active = document.activeElement;
            if (rootRef.current?.contains(active)) {
              return;
            }
            setOpen(false);
          }}
          value={parseDayjsValue(value, displayContext)}
          disabled={disabled}
          allowClear={false}
          inputReadOnly
          onChange={onCalendarChange}
          // Mount outside .record-section (overflow:hidden) so the panel is not clipped.
          getPopupContainer={() => document.body}
        />
      </span>
    </ConfigProvider>
  );
}
