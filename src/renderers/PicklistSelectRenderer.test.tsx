import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../context/UiContext";
import { AntdProvider } from "../theme/antdProvider";
import { PicklistSelectRenderer } from "./PicklistSelectRenderer";

function renderPicklist(
  element: Parameters<typeof PicklistSelectRenderer>[0]["element"],
  value: unknown,
) {
  return render(
    <AntdProvider>
      <UiProvider>
        <PicklistSelectRenderer
          vaultId="vault-1"
          element={element}
          value={value}
          onChange={vi.fn()}
        />
      </UiProvider>
    </AntdProvider>,
  );
}

describe("PicklistSelectRenderer", () => {
  it("shows a disabled control and hint when no options are available", () => {
    renderPicklist(
      {
        kind: "field",
        field_api_name: "status__v",
        label: { text: "Status" },
        field_type: "Picklist",
        field_render: {
          field_ref: { field_api_name: "status__v" },
          field_type: "Picklist",
          renderer_kind: "picklist_select",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      },
      "",
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(
      screen.getByText("No picklist options are available for this field."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("renders options when picklist entries are present", () => {
    renderPicklist(
      {
        kind: "field",
        field_api_name: "status__v",
        label: { text: "Status" },
        field_type: "Picklist",
        picklist_options: [{ name: "active__v", label: "Active" }],
        field_render: {
          field_ref: { field_api_name: "status__v" },
          field_type: "Picklist",
          renderer_kind: "picklist_select",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      },
      "active__v",
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
