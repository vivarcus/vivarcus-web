import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordFieldCell } from "./RecordFieldCell";

describe("RecordFieldCell", () => {
  it("renders edit fields with detail grid label/control structure", () => {
    const { container } = render(
      <dl className="field-grid field-grid--detail">
        <RecordFieldCell
          mode="edit"
          vaultId="vault-1"
          element={{
            kind: "field",
            field_api_name: "name__v",
            label: { text: "Name" },
            field_type: "String",
          }}
          value="Alpha"
          onChange={() => {}}
        />
      </dl>,
    );

    expect(container.querySelector(".field-grid__item--edit dt")).toHaveTextContent("Name");
    expect(container.querySelector(".field-grid__item--edit dd input")).toHaveValue("Alpha");
    expect(screen.queryByText("Name", { selector: "label span" })).toBeNull();
  });

  it("shows field_render validation messages in edit mode", () => {
    render(
      <dl className="field-grid field-grid--detail">
        <RecordFieldCell
          mode="edit"
          vaultId="vault-1"
          element={{
            kind: "field",
            field_api_name: "name__v",
            label: { text: "Name" },
            field_type: "String",
            field_render: {
              field_ref: { field_api_name: "name__v" },
              field_type: "String",
              renderer_kind: "text_input",
              support_state: "supported",
              visibility: "visible",
              editability: "editable",
              requiredness: "required",
              required_satisfaction: "needs_user_input",
              validation_message: ["Name is required"],
            },
          }}
          value=""
          onChange={() => {}}
        />
      </dl>,
    );

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("tags rich text fields for one-column full-width layout", () => {
    const { container } = render(
      <dl className="field-grid field-grid--detail field-grid--one-col">
        <RecordFieldCell
          mode="edit"
          vaultId="vault-1"
          element={{
            kind: "field",
            field_api_name: "capa_action_plan__c",
            label: { text: "CAPA Action Plan" },
            field_type: "RichText",
          }}
          value=""
          onChange={() => {}}
        />
      </dl>,
    );

    expect(container.querySelector(".field-grid__item--rich-text")).toBeTruthy();
  });

  it("does not tag long text fields for one-column full-width layout", () => {
    const { container } = render(
      <dl className="field-grid field-grid--detail field-grid--one-col">
        <RecordFieldCell
          mode="edit"
          vaultId="vault-1"
          element={{
            kind: "field",
            field_api_name: "possible_root_cause_description__c",
            label: { text: "Root Cause" },
            field_type: "LongText",
          }}
          value=""
          onChange={() => {}}
        />
      </dl>,
    );

    expect(container.querySelector(".field-grid__item--rich-text")).toBeNull();
    expect(container.querySelector(".field-grid__item--multiline")).toBeTruthy();
  });
});
