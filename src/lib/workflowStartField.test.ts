import { describe, expect, it } from "vitest";
import { workflowDialogFieldElement } from "./workflowStartField";
import type { PageElement, WorkflowStartDialogControl } from "../api/types";

describe("workflowDialogFieldElement", () => {
  it("forces editable field_render when reusing a read-only page element", () => {
    const pageElement: PageElement = {
      kind: "field",
      field_api_name: "milestone_master_set__v",
      field_type: "Object",
      label: { text: "Milestone Master Set" },
      target_object_api_name: "template_milestone_master_set__v",
      field_render: {
        editability: "readonly",
        requiredness: "optional",
        support_state: "supported",
        renderer_kind: "display_link",
        target_object_api_name: "template_milestone_master_set__v",
      },
    };
    const control: WorkflowStartDialogControl = {
      type: "field",
      field_api_name: "milestone_master_set__v",
      required: true,
    };
    const element = workflowDialogFieldElement(control, pageElement);
    expect(element?.read_only).toBe(false);
    expect(element?.field_render?.editability).toBe("editable");
    expect(element?.field_render?.renderer_kind).toBe("record_picker");
    expect(element?.required).toBe(true);
  });

  it("prefers server field_element over page layout metadata", () => {
    const control: WorkflowStartDialogControl = {
      type: "field",
      field_api_name: "plat_edl_template__v",
      required: true,
      field_element: {
        kind: "field",
        field_api_name: "plat_edl_template__v",
        field_type: "Object",
        label: { text: "Template EDL" },
        target_object_api_name: "edl_template__v",
        field_render: {
          editability: "editable",
          requiredness: "required",
          support_state: "supported",
          renderer_kind: "record_picker",
          target_object_api_name: "edl_template__v",
        },
      },
    };
    const pageElement: PageElement = {
      kind: "field",
      field_api_name: "plat_edl_template__v",
      field_type: "Object",
      field_render: {
        editability: "readonly",
        renderer_kind: "display_link",
      },
    };
    const element = workflowDialogFieldElement(control, pageElement);
    expect(element?.field_render?.renderer_kind).toBe("record_picker");
    expect(element?.field_render?.editability).toBe("editable");
  });
});
