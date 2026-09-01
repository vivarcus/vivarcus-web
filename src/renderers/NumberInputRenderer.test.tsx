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

  it("displays Currency-style grouping from the user locale when not typing", () => {
    render(
      <AntdProvider>
        <UiProvider
          displayContext={{ locale: "en-US", timezone: "UTC", language: "en" }}
        >
          <NumberInputRenderer
            vaultId="vault-1"
            element={{
              ...plannedElement,
              field_api_name: "amount__c",
              label: { text: "Amount" },
              field_type: "Currency",
              field_render: {
                ...plannedElement.field_render!,
                field_ref: { field_api_name: "amount__c" },
                field_type: "Currency",
                scale: 2,
              },
            }}
            value={1234.5}
            onChange={vi.fn()}
          />
        </UiProvider>
      </AntdProvider>,
    );

    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveValue("1,234.5");
  });

  it("shows Percent as percent points and writes fractional storage", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AntdProvider>
        <UiProvider>
          <NumberInputRenderer
            vaultId="vault-1"
            element={{
              ...plannedElement,
              field_api_name: "rate__c",
              label: { text: "Rate" },
              field_type: "Percent",
              field_render: {
                ...plannedElement.field_render!,
                field_ref: { field_api_name: "rate__c" },
                field_type: "Percent",
                scale: 2,
              },
            }}
            value={0.65}
            onChange={onChange}
          />
        </UiProvider>
      </AntdProvider>,
    );

    const input = screen.getByRole("spinbutton", { name: "Rate" });
    expect(input).toHaveValue("65");

    await user.click(input);
    await user.clear(input);
    await user.keyboard("40");
    expect(onChange).toHaveBeenLastCalledWith(0.4);
  });

  it("uses stored-fraction Percent scale so scale 4 allows two percent-point decimals", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AntdProvider>
        <UiProvider>
          <NumberInputRenderer
            vaultId="vault-1"
            element={{
              ...plannedElement,
              field_api_name: "rate__c",
              label: { text: "Rate" },
              field_type: "Percent",
              field_render: {
                ...plannedElement.field_render!,
                field_ref: { field_api_name: "rate__c" },
                field_type: "Percent",
                scale: 4,
                min_value: 0,
                max_value: 1,
              },
            }}
            value={0.2592}
            onChange={onChange}
          />
        </UiProvider>
      </AntdProvider>,
    );

    const input = screen.getByRole("spinbutton", { name: "Rate" });
    expect(input).toHaveValue("25.92");

    await user.click(input);
    await user.clear(input);
    await user.keyboard("25.92");
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBeCloseTo(0.2592, 10);
  });
});
