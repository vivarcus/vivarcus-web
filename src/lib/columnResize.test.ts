import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  DEFAULT_COLUMN_WIDTH_MIN,
  DEFAULT_RECORD_LINK_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  defaultListColumnWidth,
  measureHeaderColumnWidths,
  readColumnPixelWidth,
  useColumnWidths,
} from "./columnResize";

function createHeaderRow(): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.innerHTML = `
    <th data-column-field="name__v" style="width: 120px"></th>
    <th data-column-field="status__v" style="width: 80px"></th>
  `;
  document.body.appendChild(row);
  return row;
}

function mouseMove(clientX: number) {
  document.dispatchEvent(new MouseEvent("mousemove", { clientX, bubbles: true }));
}

function mouseUp() {
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
}

describe("defaultListColumnWidth", () => {
  it("uses a wider default for record-link columns", () => {
    expect(defaultListColumnWidth("Name", { recordLink: true })).toBe(
      DEFAULT_RECORD_LINK_COLUMN_WIDTH,
    );
  });

  it("sizes ordinary columns from the label with a floor", () => {
    expect(defaultListColumnWidth("ID")).toBe(DEFAULT_COLUMN_WIDTH_MIN);
    expect(defaultListColumnWidth("最终文档数量")).toBeGreaterThan(DEFAULT_COLUMN_WIDTH_MIN);
  });
});

describe("measureHeaderColumnWidths", () => {
  it("reads widths from header cells with data-column-field", () => {
    const row = createHeaderRow();
    Object.defineProperty(row.children[0], "getBoundingClientRect", {
      value: () => ({ width: 120 }),
    });
    Object.defineProperty(row.children[1], "getBoundingClientRect", {
      value: () => ({ width: 80 }),
    });
    expect(measureHeaderColumnWidths(row)).toEqual({
      name__v: 120,
      status__v: 80,
    });
    row.remove();
  });
});

describe("readColumnPixelWidth", () => {
  it("returns measured width", () => {
    const th = document.createElement("th");
    Object.defineProperty(th, "getBoundingClientRect", {
      value: () => ({ width: 144.2 }),
    });
    expect(readColumnPixelWidth(th)).toBe(144);
  });
});

describe("useColumnWidths", () => {
  it("clamps resized widths and reports the final value on mouseup", () => {
    const onColumnWidthChange = vi.fn();
    const tableRoot = document.createElement("div");
    const { result } = renderHook(() =>
      useColumnWidths({ name__v: 120 }, onColumnWidthChange),
    );

    act(() => {
      result.current.beginResize("name__v", 100, 120, tableRoot, { name__v: 120 });
    });

    act(() => {
      mouseMove(100 + 2280);
    });

    act(() => {
      mouseUp();
    });
    expect(onColumnWidthChange).toHaveBeenCalledWith("name__v", MAX_COLUMN_WIDTH);
    expect(result.current.widths.name__v).toBe(MAX_COLUMN_WIDTH);
  });

  it("does not go below the minimum width", () => {
    const onColumnWidthChange = vi.fn();
    const tableRoot = document.createElement("div");
    const { result } = renderHook(() =>
      useColumnWidths({ status__v: 120 }, onColumnWidthChange),
    );

    act(() => {
      result.current.beginResize("status__v", 200, 120, tableRoot, { status__v: 120 });
    });

    act(() => {
      mouseMove(50);
    });

    act(() => {
      mouseUp();
    });
    expect(onColumnWidthChange).toHaveBeenCalledWith("status__v", MIN_COLUMN_WIDTH);
    expect(result.current.widths.status__v).toBe(MIN_COLUMN_WIDTH);
  });

  it("only locks the resized column when resize starts", () => {
    const tableRoot = document.createElement("div");
    const { result } = renderHook(() => useColumnWidths({}));

    act(() => {
      result.current.beginResize("name__v", 100, 120, tableRoot, {
        name__v: 120,
        status__v: 80,
      });
    });

    expect(result.current.widths).toEqual({
      name__v: 120,
    });
  });

  it("keeps previously saved widths for other columns", () => {
    const onColumnWidthChange = vi.fn();
    const tableRoot = document.createElement("div");
    const { result } = renderHook(() =>
      useColumnWidths({ status__v: 80 }, onColumnWidthChange),
    );

    act(() => {
      result.current.beginResize("name__v", 100, 120, tableRoot, {
        name__v: 120,
        status__v: 80,
      });
    });

    act(() => {
      mouseMove(160);
    });

    act(() => {
      mouseUp();
    });

    expect(onColumnWidthChange).toHaveBeenCalledWith("name__v", 180);
    expect(result.current.widths).toEqual({
      status__v: 80,
      name__v: 180,
    });
  });
});
