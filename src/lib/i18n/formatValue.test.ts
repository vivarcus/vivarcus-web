import { describe, expect, it } from "vitest";
import {
  formatFieldDisplayValue,
  picklistDisplayLabels,
  resolveDisplayFormatValue,
} from "./formatValue";
import { defaultDisplayContext } from "./types";

describe("resolveDisplayFormatValue", () => {
  it("prefers canonical picklist value over display_value", () => {
    expect(
      resolveDisplayFormatValue("inprogress__v", "Picklist", "In Progress"),
    ).toBe("inprogress__v");
  });

  it("prefers canonical boolean value over display_value", () => {
    expect(resolveDisplayFormatValue(false, "Boolean", "false")).toBe(false);
  });

  it("falls back to display_value when canonical value is empty", () => {
    expect(resolveDisplayFormatValue("", "Picklist", "In Progress")).toBe("In Progress");
  });
});

describe("formatFieldDisplayValue", () => {
  const zhCtx = { ...defaultDisplayContext, language: "zh", locale: "zh-CN" };

  it("localizes boolean false from string display_value", () => {
    expect(formatFieldDisplayValue("false", "Boolean", zhCtx)).toBe("否");
  });

  it("localizes boolean true from Yes string", () => {
    expect(formatFieldDisplayValue("Yes", "Boolean", zhCtx)).toBe("是");
  });

  it("keeps Number 1 as a number, not 是", () => {
    expect(formatFieldDisplayValue("1", "Number", zhCtx)).toBe("1");
    expect(formatFieldDisplayValue(1, "Number", zhCtx)).toBe("1");
    expect(formatFieldDisplayValue("0", "Number", zhCtx)).toBe("0");
  });

  it("localizes Formula boolean without treating numeric counts as boolean", () => {
    expect(formatFieldDisplayValue("false", "Formula", zhCtx)).toBe("否");
    expect(formatFieldDisplayValue("true", "Formula", zhCtx)).toBe("是");
    expect(formatFieldDisplayValue("1", "Formula", zhCtx)).toBe("1");
  });

  it("localizes picklist via options", () => {
    const text = formatFieldDisplayValue("inprogress__v", "Picklist", zhCtx, [
      { name: "inprogress__v", label: "进行中" },
    ]);
    expect(text).toBe("进行中");
  });
});

describe("picklistDisplayLabels", () => {
  it("maps stored api names to option labels", () => {
    expect(
      picklistDisplayLabels("inprogress__v", [
        { name: "inprogress__v", label: "进行中" },
        { name: "complete__v", label: "完成" },
      ]),
    ).toBe("进行中");
  });
});
