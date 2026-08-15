import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormulaIcon } from "./formulaIcon";

describe("FormulaIcon", () => {
  it("renders Font Awesome icons at Veeva size", () => {
    const { container } = render(<FormulaIcon name="check" color="#00C348" />);
    const icon = container.querySelector(".fa-check");
    expect(icon).toBeTruthy();
    expect(icon).toHaveClass("field-icon__fa");
  });

  it("renders harvey-ball icons as svg", () => {
    const { container } = render(<FormulaIcon name="harvey-ball-50" color="#FFA60C" />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector(".fa")).toBeNull();
  });

  it("renders comment bubble icons as svg", () => {
    const { container } = render(<FormulaIcon name="comment-bubble-exclamation" color="#F8972B" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
