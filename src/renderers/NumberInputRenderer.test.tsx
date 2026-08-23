import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../context/UiContext";
import { AntdProvider } from "../theme/antdProvider";
import { NumberInputRenderer } from "./NumberInputRenderer";
import type { FormRendererProps } from "./types";

const plannedElement: FormRendererProps["element"] = {
  kind: "field",
  field_api_name: "planned__ctms",
  label: { text: "Planned" },
  field_type: "Number",
  field_render: {
    field_ref: { field_api_name: "planned__ctms" },
    field_type: "Number",
    renderer_kind: "number_input",
    support_state: "supported",
    visibility: "visible",
    editability: "editable",
    requiredness: "optional",
    required_satisfaction: "satisfied",
    scale: 0,
  },
};

function renderPlanned(value: unknown, onChange = vi.fn()) {
  render(
    <AntdProvider>
      <UiProvider>
        <NumberInputRenderer
          vaultId="vault-1"
          element={plannedElement}
          value={value}
          onChange={onChange}
        />
      </UiProvider>
    </AntdProvider>,
  );
  return onChange;
}

describe("NumberInputRenderer", () => {
  it("commits typed digits before blur so a parent re-render cannot discard them", async () => {
    const user = userEvent.setup();
    const onChange = renderPlanned(0);

    const input = screen.getByRole("spinbutton", { name: "Planned" });
    await user.click(input);
    await user.clear(input);
    await user.keyboard("80");

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(80);
  });
});
