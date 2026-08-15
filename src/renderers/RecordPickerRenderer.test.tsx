import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../context/UiContext";
import { AntdProvider } from "../theme/antdProvider";
import { RecordPickerRenderer } from "./RecordPickerRenderer";

function renderRecordPicker(
  element: Parameters<typeof RecordPickerRenderer>[0]["element"],
  value: unknown,
  onChange = vi.fn(),
) {
  return render(
    <AntdProvider>
      <UiProvider>
        <RecordPickerRenderer
          vaultId="vault-1"
          element={element}
          value={value}
          onChange={onChange}
        />
      </UiProvider>
    </AntdProvider>,
  );
}

describe("RecordPickerRenderer", () => {
  it("shows read-only value and hint when target object is missing", async () => {
    const onChange = vi.fn();
    renderRecordPicker(
      {
        kind: "field",
        field_api_name: "study__vr",
        label: { text: "Study" },
        field_type: "Object",
        field_render: {
          field_ref: { field_api_name: "study__vr" },
          field_type: "Object",
          renderer_kind: "record_picker",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          display_value: "Study Alpha",
        },
      },
      "rec-123",
      onChange,
    );

    expect(screen.getByDisplayValue("Study Alpha")).toBeDisabled();
    expect(
      screen.getByText("This reference field has no target object configured."),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByDisplayValue("Study Alpha"), "x");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("prefers server diagnostic message for missing target object", () => {
    renderRecordPicker(
      {
        kind: "field",
        field_api_name: "study__vr",
        label: { text: "Study" },
        field_type: "Object",
        field_render: {
          field_ref: { field_api_name: "study__vr" },
          field_type: "Object",
          renderer_kind: "record_picker",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          diagnostic_ref: { message: "Target object study__v is not configured" },
        },
      },
      "",
    );

    expect(
      screen.getByText("Target object study__v is not configured"),
    ).toBeInTheDocument();
  });
});
