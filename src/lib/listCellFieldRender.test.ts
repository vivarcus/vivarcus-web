import { describe, expect, it } from "vitest";
import { iconValueFromField, listCellFieldRender, listCellTooltipText } from "./listCellFieldRender";

describe("listCellFieldRender", () => {
  it("maps formula icon payloads onto display_icon field_render", () => {
    const render = listCellFieldRender(
      {
        field_api_name: "completeness_icon__v",
        label: { text: "Completeness Status" },
        field_render: {
          field_ref: { field_api_name: "completeness_icon__v" },
          field_type: "String",
          renderer_kind: "display_icon",
          support_state: "supported",
          visibility: "visible",
          editability: "readonly",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      },
      { name: "circle", color: "#00C345", title: "Complete" },
    );
    expect(render?.renderer_kind).toBe("display_icon");
    expect(render?.icon).toEqual({
      name: "circle",
      color: "#00C345",
      title: "Complete",
    });
  });

  it("maps picklist values onto display_value labels", () => {
    const render = listCellFieldRender(
      {
        field_api_name: "level__v",
        label: { text: "Level" },
        field_render: {
          field_ref: { field_api_name: "level__v" },
          field_type: "Picklist",
          renderer_kind: "display_text",
          support_state: "supported",
          visibility: "visible",
          editability: "readonly",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          picklist_options: [
            { name: "study_level__v", label: "Study", order: 1 },
            { name: "country_level__v", label: "Country", order: 2 },
          ],
        },
      },
      "study_level__v",
    );
    expect(render?.display_value).toBe("Study");
  });

  it("returns undefined when column has no field_render", () => {
    expect(
      listCellFieldRender(
        { field_api_name: "name__v", label: { text: "Name" } },
        "Trial Master File Index",
      ),
    ).toBeUndefined();
  });
});

describe("listCellTooltipText", () => {
  const iconColumn = {
    field_api_name: "completeness__v",
    label: { text: "Completeness" },
    field_render: {
      field_ref: { field_api_name: "completeness__v" },
      field_type: "String",
      renderer_kind: "display_icon" as const,
      support_state: "supported" as const,
      visibility: "visible" as const,
      editability: "readonly" as const,
      requiredness: "optional" as const,
      required_satisfaction: "satisfied" as const,
    },
  };

  it("does not show native tooltip for icon values", () => {
    expect(
      listCellTooltipText(iconColumn, {
        name: "harvey-ball-0",
        color: "#FA2819",
        title: "0-25%",
      }),
    ).toBeUndefined();
  });

  it("does not show native tooltip when hover card is present", () => {
    expect(
      listCellTooltipText(iconColumn, "Study", undefined, true),
    ).toBeUndefined();
  });

  it("returns undefined for non-icon objects", () => {
    expect(listCellTooltipText(iconColumn, { foo: "bar" })).toBeUndefined();
  });
});

describe("iconValueFromField", () => {
  it("ignores non-icon values", () => {
    expect(iconValueFromField("complete__v")).toBeUndefined();
    expect(iconValueFromField(null)).toBeUndefined();
  });
});
