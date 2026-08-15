import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { UiProvider } from "../context/UiContext";
import { DisplayLinkRenderer } from "./DisplayLinkRenderer";

function renderLink(props: Parameters<typeof DisplayLinkRenderer>[0]) {
  return render(
    <MemoryRouter>
      <UiProvider>
        <DisplayLinkRenderer {...props} />
      </UiProvider>
    </MemoryRouter>,
  );
}

describe("DisplayLinkRenderer", () => {
  it("shows record id in link when display label equals record id", () => {
    renderLink({
      value: "rec-123",
      fieldType: "Object",
      fieldRender: {
        field_ref: { field_api_name: "study__vr" },
        field_type: "Object",
        renderer_kind: "display_link",
        support_state: "supported",
        visibility: "visible",
        editability: "readonly",
        requiredness: "optional",
        required_satisfaction: "satisfied",
        display_value: "rec-123",
        navigation_target: {
          kind: "record_detail",
          target_object_ref: "study__v",
          target_record_id: "rec-123",
          route_ref: "/objects/study__v/records/rec-123",
        },
      },
    });

    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("rec-123");
    expect(link).toHaveAttribute("href", "/objects/study__v/records/rec-123");
  });

  it("shows resolved display label when different from record id", () => {
    renderLink({
      value: "rec-123",
      fieldType: "Object",
      fieldRender: {
        field_ref: { field_api_name: "study__vr" },
        field_type: "Object",
        renderer_kind: "display_link",
        support_state: "supported",
        visibility: "visible",
        editability: "readonly",
        requiredness: "optional",
        required_satisfaction: "satisfied",
        display_value: "Study Alpha",
        navigation_target: {
          kind: "record_detail",
          target_object_ref: "study__v",
          target_record_id: "rec-123",
          route_ref: "/objects/study__v/records/rec-123",
        },
      },
    });

    expect(screen.getByRole("link")).toHaveTextContent("Study Alpha");
  });
});
