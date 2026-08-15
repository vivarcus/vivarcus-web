import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormFieldInput } from "../components/FormFieldInput";
import { UiProvider } from "../context/UiContext";
import { AntdProvider } from "../theme/antdProvider";

function renderFormInput(element: Parameters<typeof FormFieldInput>[0]["element"], value: unknown) {
  return render(
    <AntdProvider>
      <UiProvider>
        <FormFieldInput vaultId="vault-1" element={element} value={value} onChange={() => {}} />
      </UiProvider>
    </AntdProvider>,
  );
}

describe("FormFieldInput registry dispatch", () => {
  it("renders text_input from renderer_kind", () => {
    renderFormInput(
      {
        kind: "field",
        field_api_name: "name__v",
        label: { text: "Name" },
        field_render: {
          field_ref: { field_api_name: "name__v" },
          field_type: "String",
          renderer_kind: "text_input",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      },
      "Alpha",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Alpha");
  });

  it("renders boolean_checkbox from renderer_kind", () => {
    renderFormInput(
      {
        kind: "field",
        field_api_name: "active__v",
        label: { text: "Active" },
        field_render: {
          field_ref: { field_api_name: "active__v" },
          field_type: "Boolean",
          renderer_kind: "boolean_checkbox",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      },
      true,
    );
    expect(screen.getByRole("radio", { name: "Yes" })).toBeChecked();
  });

  it("renders rich_text_editor from renderer_kind", () => {
    renderFormInput(
      {
        kind: "field",
        field_api_name: "body__v",
        label: { text: "Body" },
        field_render: {
          field_ref: { field_api_name: "body__v" },
          field_type: "RichText",
          renderer_kind: "rich_text_editor",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      },
      "<p>Hello</p>",
    );
    expect(screen.getByRole("toolbar", { name: "Body formatting" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveTextContent("Hello");
  });

  it("returns null for unsupported renderer_kind", () => {
    const { container } = renderFormInput(
      {
        kind: "field",
        field_api_name: "file__v",
        field_render: {
          field_ref: { field_api_name: "file__v" },
          field_type: "Binary",
          renderer_kind: "unsupported",
          support_state: "unsupported",
          visibility: "hidden",
          editability: "hidden",
          requiredness: "optional",
          required_satisfaction: "blocked",
        },
      },
      null,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
