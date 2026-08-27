import { describe, expect, it } from "vitest";
import type { DisplayContext } from "../lib/i18n/types";
import {
  dateTimeDayjsToUtcIso,
  parseDateTimeDayjsValue,
  parseDayjsValue,
  parseTimeDayjsValue,
  picklistSelectBehavior,
  resolveFieldScale,
  resolveFieldUnavailableMessage,
  resolvePicklistOptionsWithCurrentValues,
  timeDayjsToRfc3339,
} from "./formUtils";
import { defaultShellChrome } from "../lib/i18n";

const laContext: DisplayContext = {
  language: "en",
  locale: "en-US",
  timezone: "America/Los_Angeles",
  date_format_profile: "numeric",
};

describe("picklistSelectBehavior", () => {
  it("enables search but disables virtual scroll for larger picklists", () => {
    expect(picklistSelectBehavior(7)).toEqual({
      showSearch: true,
      virtual: false,
      optionFilterProp: "label",
    });
  });

  it("keeps compact picklists without search", () => {
    expect(picklistSelectBehavior(6)).toEqual({
      showSearch: false,
      virtual: false,
      optionFilterProp: "label",
    });
  });
});

describe("resolvePicklistOptionsWithCurrentValues", () => {
  it("keeps active options unchanged", () => {
    const options = resolvePicklistOptionsWithCurrentValues(
      {
        picklist_options: [{ name: "active__v", label: "Active" }],
      },
      [],
    );
    expect(options).toEqual([{ name: "active__v", label: "Active" }]);
  });

  it("injects missing selected values for inactive entries", () => {
    const options = resolvePicklistOptionsWithCurrentValues(
      {
        picklist_options: [{ name: "active__v", label: "Active" }],
        field_render: {
          field_ref: { field_api_name: "status__v" },
          field_type: "Picklist",
          renderer_kind: "picklist_multiselect",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          display_value: "Retired, Active",
        },
      },
      ["retired__v", "active__v"],
    );
    expect(options).toEqual([
      { name: "active__v", label: "Active" },
      { name: "retired__v", label: "Retired", inactive: true, selectable: false },
    ]);
  });

  it("uses display_value for a single missing selection", () => {
    const options = resolvePicklistOptionsWithCurrentValues(
      {
        field_render: {
          field_ref: { field_api_name: "status__v" },
          field_type: "Picklist",
          renderer_kind: "picklist_select",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          display_value: "Retired",
        },
      },
      ["retired__v"],
    );
    expect(options).toEqual([{ name: "retired__v", label: "Retired", inactive: true, selectable: false }]);
  });
});

describe("resolveFieldUnavailableMessage", () => {
  it("prefers diagnostic_ref message over fallback", () => {
    expect(
      resolveFieldUnavailableMessage(
        {
          kind: "field",
          field_api_name: "status__v",
          field_render: {
            field_ref: { field_api_name: "status__v" },
            field_type: "Picklist",
            renderer_kind: "picklist_select",
            support_state: "supported",
            visibility: "visible",
            editability: "editable",
            requiredness: "optional",
            required_satisfaction: "satisfied",
            diagnostic_ref: { message: "Picklist is inactive" },
          },
        },
        defaultShellChrome.picklist_no_options,
      ),
    ).toBe("Picklist is inactive");
  });

  it("falls back to localized shell text", () => {
    expect(
      resolveFieldUnavailableMessage(
        { kind: "field", field_api_name: "status__v" },
        defaultShellChrome.picklist_no_options,
      ),
    ).toBe("No picklist options are available for this field.");
  });
});

describe("parseDayjsValue", () => {
  it("parses ISO dates even when the locale mask uses slashes", () => {
    const ctx = { ...laContext, locale: "zh-CN" };
    const parsed = parseDayjsValue("2026-06-01", ctx);
    expect(parsed).not.toBeNull();
    expect(parsed?.format("YYYY-MM-DD")).toBe("2026-06-01");
  });

  it("parses pasted dates with trailing newline or unpadded digits", () => {
    const ctx = { ...laContext, locale: "zh-CN" };
    expect(parseDayjsValue("2026-06-25\n", ctx)?.format("YYYY-MM-DD")).toBe("2026-06-25");
    expect(parseDayjsValue("2026/6/25", ctx)?.format("YYYY-MM-DD")).toBe("2026-06-25");
    expect(parseDayjsValue("06/25/2026", ctx)?.format("YYYY-MM-DD")).toBe("2026-06-25");
  });
});

describe("parseDateTimeDayjsValue", () => {
  it("parses and serializes DateTime values in the user timezone", () => {
    const stored = "2025-01-23T17:29:00.000Z";
    const picker = parseDateTimeDayjsValue(stored, laContext);
    expect(picker).not.toBeNull();
    expect(picker?.hour()).toBe(9);
    expect(picker?.minute()).toBe(29);
    expect(dateTimeDayjsToUtcIso(picker, laContext)).toBe(stored);
  });
});

describe("parseTimeDayjsValue", () => {
  it("round-trips a stored Time without applying timezone", () => {
    const picker = parseTimeDayjsValue("2026-07-22T15:04:00Z");
    expect(picker?.hour()).toBe(15);
    expect(picker?.minute()).toBe(4);
    expect(timeDayjsToRfc3339(picker)).toBe("1970-01-01T15:04:00.000Z");
  });
});

describe("resolveFieldScale", () => {
  it("returns scale from field_render when present", () => {
    expect(
      resolveFieldScale({
        kind: "field",
        field_api_name: "amount__v",
        field_render: {
          field_ref: { field_api_name: "amount__v" },
          field_type: "Number",
          renderer_kind: "number_input",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          scale: 2,
        },
      }),
    ).toBe(2);
  });
});
