import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AntdProvider } from "../theme/antdProvider";
import { RichTextEditorRenderer } from "./RichTextEditorRenderer";

describe("RichTextEditorRenderer", () => {
  it("renders stored html in the TipTap surface", () => {
    render(
      <AntdProvider>
        <RichTextEditorRenderer
          vaultId="vault-1"
          element={{
            kind: "field",
            field_api_name: "body__v",
            label: { text: "Body" },
            field_type: "RichText",
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
          }}
          value="<p>Hello</p>"
          onChange={vi.fn()}
        />
      </AntdProvider>,
    );

    expect(screen.getByRole("toolbar", { name: "Body formatting" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveTextContent("Hello");
    expect(screen.getByRole("button", { name: "link" })).toBeInTheDocument();
  });
});
