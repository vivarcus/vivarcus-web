import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateFieldInput } from "./DateFieldInput";

const zhCtx = { locale: "zh-CN", timezone: "Asia/Shanghai", language: "zh" };
const calendarAria = "打开日历";

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
});
