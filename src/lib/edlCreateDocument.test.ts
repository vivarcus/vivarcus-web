import { describe, expect, it } from "vitest";
import type { RecordPageModel } from "../api/types";
import {
  buildEdlCreateDocumentHref,
  EDL_DOCUMENT_CREATE_OBJECT_TYPE,
  EDL_DOCUMENT_CREATE_TAB,
} from "./edlCreateDocument";
import { NAV_TRAIL_PARAM, decodeNavTrail, encodeNavTrail } from "./navTrail";

function pageWithFields(
  fields: Record<string, unknown>,
  recordName?: string,
): RecordPageModel {
  return {
    object_api_name: "edl_item__v",
    record_name: recordName,
    sections: [
      {
        section_id: "details__c",
        label: { text: "Details" },
        elements: Object.entries(fields).map(([field_api_name, value]) => ({
          field_api_name,
          value,
        })),
      },
    ],
  } as RecordPageModel;
}

describe("buildEdlCreateDocumentHref", () => {
  it("routes document create through Library tab with base document object type", () => {
    const href = buildEdlCreateDocumentHref(
      "LFA00000000001G",
      pageWithFields({ study__v: "0ST000000000001", name__v: "Protocol" }),
    );
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/objects/document__v/create");
    expect(url.searchParams.get("tab")).toBe(EDL_DOCUMENT_CREATE_TAB);
    expect(url.searchParams.get("object_type")).toBe(EDL_DOCUMENT_CREATE_OBJECT_TYPE);
    expect(url.searchParams.get("page")).toBeNull();
    expect(url.searchParams.get("prefill.study__v")).toBe("0ST000000000001");
    expect(url.searchParams.get("prefill.name__v")).toBe("Protocol");
  });

  it("includes reference display labels for prefill when available on the EDL Item page", () => {
    const href = buildEdlCreateDocumentHref(
      "LFA00000000001G",
      {
        ...pageWithFields({ owning_milestone__v: "EZD00000000002X" }),
        sections: [
          {
            section_id: "details__c",
            label: { text: "Details" },
            elements: [
              {
                field_api_name: "owning_milestone__v",
                value: "EZD00000000002X",
                field_render: { display_value: "Site Activation" },
              },
            ],
          },
        ],
      } as RecordPageModel,
    );
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.get("prefill.owning_milestone__v")).toBe("EZD00000000002X");
    expect(url.searchParams.get("prefill_display.owning_milestone__v")).toBe("Site Activation");
  });

  it("defaults the nav trail to the originating EDL Item", () => {
    const href = buildEdlCreateDocumentHref(
      "LFA00000000001G",
      pageWithFields({}, "Protocol Item"),
    );
    const url = new URL(href, "http://localhost");
    expect(decodeNavTrail(url.searchParams.get(NAV_TRAIL_PARAM))).toEqual([
      { href: "/objects/edl_item__v/records/LFA00000000001G", label: "Protocol Item" },
    ]);
  });

  it("preserves a caller-supplied nav trail", () => {
    const trail = encodeNavTrail([
      { href: "/pages/milestone_workspace__v", label: "Site Activation" },
      { href: "/objects/edl_item__v/records/LFA00000000001G?tab=edl_items__c", label: "Protocol" },
    ]);
    const href = buildEdlCreateDocumentHref("LFA00000000001G", pageWithFields({}), {
      navTrail: trail,
    });
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.get(NAV_TRAIL_PARAM)).toBe(trail);
  });
});
