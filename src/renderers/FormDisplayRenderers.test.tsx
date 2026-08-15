import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DisplayContext } from "../api/types";
import { UiProvider } from "../context/UiContext";
import { formatDateTimeDisplayValue } from "../lib/i18n/dateFormat";
import { FormDisplayTextRenderer } from "./FormDisplayRenderers";

const laContext: DisplayContext = {
  language: "en",
  locale: "en-US",
  timezone: "America/Los_Angeles",
  date_format_profile: "numeric",
};

describe("FormDisplayTextRenderer", () => {
  it("formats readonly DateTime values with displayContext from props", () => {
    render(
      <UiProvider>
        <FormDisplayTextRenderer
          vaultId="vault-1"
          displayContext={laContext}
          element={{
            kind: "field",
            field_api_name: "due_date__v",
            label: { text: "Due Date" },
            field_type: "DateTime",
            field_render: {
              field_ref: { field_api_name: "due_date__v" },
              field_type: "DateTime",
              renderer_kind: "display_text",
              support_state: "supported",
              visibility: "visible",
              editability: "readonly",
              requiredness: "optional",
              required_satisfaction: "satisfied",
            },
          }}
          value="2025-01-23T17:29:00.000Z"
          onChange={() => {}}
        />
      </UiProvider>,
    );

    const expected = formatDateTimeDisplayValue(
      new Date("2025-01-23T17:29:00.000Z"),
      laContext,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("falls back to UiProvider displayContext when prop is omitted", () => {
    render(
      <UiProvider displayContext={laContext}>
        <FormDisplayTextRenderer
          vaultId="vault-1"
          element={{
            kind: "field",
            field_api_name: "active__v",
            label: { text: "Active" },
            field_type: "Boolean",
            field_render: {
              field_ref: { field_api_name: "active__v" },
              field_type: "Boolean",
              renderer_kind: "display_text",
              support_state: "supported",
              visibility: "visible",
              editability: "readonly",
              requiredness: "optional",
              required_satisfaction: "satisfied",
            },
          }}
          value={true}
          onChange={() => {}}
          showLabel={false}
        />
      </UiProvider>,
    );

    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
});
