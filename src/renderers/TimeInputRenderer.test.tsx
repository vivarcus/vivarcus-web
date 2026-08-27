import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../context/UiContext";
import { AntdProvider } from "../theme/antdProvider";
import { TimeInputRenderer } from "./TimeInputRenderer";
import type { FormRendererProps } from "./types";

const timeElement: FormRendererProps["element"] = {
  kind: "field",
  field_api_name: "start_time__c",
  label: { text: "Start Time" },
  field_type: "Time",
  field_render: {
    field_ref: { field_api_name: "start_time__c" },
    field_type: "Time",
    renderer_kind: "time_input",
    support_state: "supported",
    visibility: "visible",
    editability: "editable",
    requiredness: "optional",
    required_satisfaction: "satisfied",
  },
};

describe("TimeInputRenderer", () => {
  it("shows a locale 12-hour value for stored RFC3339 Time", () => {
    render(
      <AntdProvider>
        <UiProvider
          displayContext={{ locale: "en-US", timezone: "America/New_York", language: "en" }}
        >
          <TimeInputRenderer
            vaultId="vault-1"
            element={timeElement}
            value="2026-07-22T15:04:05Z"
            onChange={vi.fn()}
          />
        </UiProvider>
      </AntdProvider>,
    );

    const input = screen.getByRole("textbox", { name: "Start Time" });
    expect(input).toHaveValue("3:04 PM");
  });
});
