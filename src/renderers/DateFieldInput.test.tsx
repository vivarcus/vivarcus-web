import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { displayText, defaultFormChrome } from "../lib/i18n";
import { DateFieldInput } from "./DateFieldInput";

const zhCtx = { locale: "zh-CN", timezone: "Asia/Shanghai", language: "zh" };
const calendarAria = displayText(defaultFormChrome.open_calendar);

function getEditInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector(
    ".date-field-input .ant-input-affix-wrapper input",
  ) as HTMLInputElement | null;
  if (!input) {
    throw new Error("edit input not found");
  }
  return input;
}

describe("DateFieldInput", () => {
  it("commits typed date before a following submit click reads parent state", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const enUS = {
      locale: "en-US",
      timezone: "America/Los_Angeles",
      language: "en",
    };

    function Harness() {
      const [due, setDue] = useState<string>("");
      return (
        <div>
          <DateFieldInput
            value={due || null}
            displayContext={enUS}
            onChange={(next) => setDue(next ?? "")}
          />
          <button type="button" onClick={() => onSubmit(due)}>
            submit
          </button>
        </div>
      );
    }

    const { container } = render(<Harness />);
    const input = getEditInput(container);
    await user.click(input);
    await user.paste("09/30/2026");
    await user.click(screen.getByRole("button", { name: "submit" }));

    expect(onSubmit).toHaveBeenCalledWith("2026-09-30");
  });

  it("commits pasted ISO dates with trailing newline on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <div>
        <DateFieldInput
          value={null}
          displayContext={zhCtx}
          onChange={onChange}
        />
        <button type="button">away</button>
      </div>,
    );

    const input = getEditInput(container);
    await user.click(input);
    await user.paste("2026-06-25\n");
    await user.click(screen.getByRole("button", { name: "away" }));

    expect(onChange).toHaveBeenCalledWith("2026-06-25");
  });

  it("commits unpadded slash dates on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <DateFieldInput
        value={null}
        displayContext={zhCtx}
        onChange={onChange}
      />,
    );

    const input = getEditInput(container);
    await user.click(input);
    await user.paste("2026/6/25");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("2026-06-25");
  });

  it("clears to null when the text is emptied", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <div>
        <DateFieldInput
          value="2026-06-25"
          displayContext={zhCtx}
          onChange={onChange}
        />
        <button type="button">away</button>
      </div>,
    );

    const input = getEditInput(container);
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "away" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("keeps invalid text and marks the field without committing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <div>
        <DateFieldInput
          value={null}
          displayContext={zhCtx}
          onChange={onChange}
        />
        <button type="button">away</button>
      </div>,
    );

    const input = getEditInput(container);
    await user.click(input);
    await user.type(input, "not-a-date");
    await user.click(screen.getByRole("button", { name: "away" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(input.closest(".ant-input-affix-wrapper")).toHaveClass(
      "ant-input-status-error",
    );
    expect(input).toHaveValue("not-a-date");
  });

  it("opens the calendar panel when the text input is focused", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DateFieldInput value={null} displayContext={zhCtx} onChange={vi.fn()} />,
    );

    const input = getEditInput(container);
    const calendar = screen.getByRole("button", { name: calendarAria });
    expect(calendar).toHaveAttribute("aria-expanded", "false");
    await user.click(input);
    expect(calendar).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector(".ant-picker-dropdown")).toBeTruthy();
    expect(input).toHaveFocus();
  });

  it("uses the resolved chrome language when it differs from display formatting", () => {
    const { container } = render(
      <DateFieldInput
        value={null}
        displayContext={{ locale: "en-US", timezone: "UTC", language: "en" }}
        calendarAriaLabel="打开日历"
        calendarLanguage="zh"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "打开日历" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>(".ant-picker-input input"),
    ).toHaveAttribute("placeholder", "请选择日期");
  });

  it("opens the calendar panel from the suffix control", async () => {
    const user = userEvent.setup();
    render(
      <DateFieldInput value={null} displayContext={zhCtx} onChange={vi.fn()} />,
    );

    const calendar = screen.getByRole("button", { name: calendarAria });
    expect(calendar).toHaveAttribute("aria-expanded", "false");
    await user.click(calendar);
    expect(calendar).toHaveAttribute("aria-expanded", "true");
    const dropdown = document.querySelector(".ant-picker-dropdown");
    expect(dropdown).toBeTruthy();
    // Panel must escape overflow:hidden ancestors (e.g. .record-section).
    expect(dropdown?.parentElement).toBe(document.body);
  });

  it("commits a day chosen from the calendar panel", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateFieldInput
        value="2026-07-25"
        displayContext={zhCtx}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: calendarAria }));
    const day = document.querySelector(
      '.ant-picker-cell:not(.ant-picker-cell-disabled)[title="2026-07-10"] .ant-picker-cell-inner',
    );
    expect(day).toBeTruthy();
    await user.click(day!);

    expect(onChange).toHaveBeenCalledWith("2026-07-10");
  });

  it("keeps text-input focus after opening the calendar", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DateFieldInput
        value="2026-07-25"
        displayContext={zhCtx}
        onChange={vi.fn()}
      />,
    );

    const input = getEditInput(container);
    await user.click(screen.getByRole("button", { name: calendarAria }));
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: calendarAria })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes the calendar after picking a day", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateFieldInput
        value="2026-03-15"
        displayContext={zhCtx}
        onChange={onChange}
      />,
    );

    const calendar = screen.getByRole("button", { name: calendarAria });
    await user.click(calendar);
    const day = document.querySelector(
      '.ant-picker-cell:not(.ant-picker-cell-disabled)[title="2026-03-10"] .ant-picker-cell-inner',
    );
    expect(day).toBeTruthy();
    await user.click(day!);

    expect(onChange).toHaveBeenCalledWith("2026-03-10");
    expect(calendar).toHaveAttribute("aria-expanded", "false");
  });

  it("commits the same calendar day independently on two adjacent fields", async () => {
    const user = userEvent.setup();
    const enUS = {
      locale: "en-US",
      timezone: "America/Los_Angeles",
      language: "en",
    };

    function TwoVisitDates() {
      const [start, setStart] = useState<string | null>("2026-03-15");
      const [end, setEnd] = useState<string | null>("2026-03-15");
      return (
        <div>
          <DateFieldInput
            value={start}
            displayContext={enUS}
            calendarAriaLabel="Open start calendar"
            onChange={setStart}
          />
          <DateFieldInput
            value={end}
            displayContext={enUS}
            calendarAriaLabel="Open end calendar"
            onChange={setEnd}
          />
          <span data-testid="start-value">{start ?? ""}</span>
          <span data-testid="end-value">{end ?? ""}</span>
        </div>
      );
    }

    render(<TwoVisitDates />);

    await user.click(screen.getByRole("button", { name: "Open start calendar" }));
    const startDay = document.querySelector(
      '.ant-picker-cell:not(.ant-picker-cell-disabled)[title="2026-03-10"] .ant-picker-cell-inner',
    );
    expect(startDay).toBeTruthy();
    await user.click(startDay!);
    expect(screen.getByTestId("start-value")).toHaveTextContent("2026-03-10");

    await user.click(screen.getByRole("button", { name: "Open end calendar" }));
    const openPopups = [
      ...document.querySelectorAll(".ant-picker-dropdown"),
    ].filter((el) => !el.classList.contains("ant-picker-dropdown-hidden"));
    expect(openPopups).toHaveLength(1);
    const endDay = openPopups[0]?.querySelector(
      '.ant-picker-cell:not(.ant-picker-cell-disabled)[title="2026-03-10"] .ant-picker-cell-inner',
    );
    expect(endDay).toBeTruthy();
    await user.click(endDay!);

    expect(screen.getByTestId("start-value")).toHaveTextContent("2026-03-10");
    expect(screen.getByTestId("end-value")).toHaveTextContent("2026-03-10");
    expect(screen.getByRole("button", { name: "Open start calendar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
