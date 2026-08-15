import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormChromeProvider } from "../context/FormChromeContext";
import { UiProvider } from "../context/UiContext";
import { defaultFormChrome } from "../lib/i18n";
import { DateInputRenderer } from "./DateInputRenderer";
import type { FormRendererProps } from "./types";

const dateElement: FormRendererProps["element"] = {
  kind: "field",
  field_api_name: "start_date__v",
  label: { text: "Start Date" },
  field_type: "Date",
  field_render: {
    field_ref: { field_api_name: "start_date__v" },
    field_type: "Date",
    renderer_kind: "date_input",
    support_state: "supported",
    visibility: "visible",
    editability: "editable",
    requiredness: "optional",
    required_satisfaction: "satisfied",
  },
};

describe("DateInputRenderer", () => {
  it("uses resolved form chrome for the calendar control", () => {
    render(
      <UiProvider
        displayContext={{ locale: "en-US", timezone: "UTC", language: "en" }}
      >
        <FormChromeProvider
          chrome={{
            ...defaultFormChrome,
            open_calendar: {
              text: "打开日历",
              key: "system:form.open_calendar",
              language: "zh",
            },
          }}
        >
          <DateInputRenderer
            vaultId="vault-1"
            element={dateElement}
            value={null}
            onChange={vi.fn()}
          />
        </FormChromeProvider>
      </UiProvider>,
    );

    expect(screen.getByRole("button", { name: "打开日历" })).toBeInTheDocument();
  });
});
