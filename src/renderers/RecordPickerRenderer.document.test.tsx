import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../context/UiContext";
import { AntdProvider } from "../theme/antdProvider";
import { applyDocumentFormReferenceOptions } from "../lib/documentForm";
import type { FormSection } from "../api/types";
import { RecordPickerRenderer } from "./RecordPickerRenderer";

const support = {
  type_options: [{ name: "TYPE-1", label: "General" }],
  subtype_options_by_type: {
    "TYPE-1": [{ name: "SUB-1", label: "Common" }],
  },
};

const baseSections: FormSection[] = [
  {
    name: "details__c",
    label: { text: "Details" },
    elements: [
      {
        kind: "field",
        field_api_name: "subtype__v",
        label: { text: "Subtype" },
        field_type: "Object",
        field_render: {
          field_ref: { field_api_name: "subtype__v" },
          field_type: "Object",
          renderer_kind: "record_picker",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          target_object_api_name: "document_type__v",
          reference_options: [],
        },
      },
    ],
  },
];

describe("RecordPickerRenderer document subtype cascade", () => {
  it("allows selecting subtype after type is chosen", async () => {
    const blocked = applyDocumentFormReferenceOptions(baseSections, support, {})[0]
      .elements[0];
    const { rerender } = render(
      <AntdProvider>
        <UiProvider>
          <RecordPickerRenderer
            vaultId="vault-1"
            element={blocked}
            value=""
            onChange={vi.fn()}
            formValues={{}}
            formFieldLabels={{ type__v: "Type" }}
          />
        </UiProvider>
      </AntdProvider>,
    );

    const blockedInput = screen.getByRole("combobox", { name: "Subtype" });
    expect(blockedInput).toBeDisabled();
    expect(blockedInput.closest(".ant-select")?.textContent).toContain("Depends on Type");

    const enabled = applyDocumentFormReferenceOptions(baseSections, support, {
      type__v: "TYPE-1",
    })[0].elements[0];
    rerender(
      <AntdProvider>
        <UiProvider>
          <RecordPickerRenderer
            vaultId="vault-1"
            element={enabled}
            value=""
            onChange={vi.fn()}
            formValues={{ type__v: "TYPE-1" }}
            formFieldLabels={{ type__v: "Type" }}
          />
        </UiProvider>
      </AntdProvider>,
    );

    const input = screen.getByRole("combobox", { name: "Subtype" });
    expect(input).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(input);
    expect(await screen.findByRole("option", { name: "Common" })).toBeInTheDocument();
  });
});
