import { describe, expect, it } from "vitest";
import {
  collectRelatedSectionCountTargets,
  relatedSectionRowCount,
} from "./relatedSectionCount";

describe("relatedSectionRowCount", () => {
  it("prefers total over row length", () => {
    expect(relatedSectionRowCount({ total: 12, rows: [{ record_id: "1", fields: {} }] })).toBe(12);
  });

  it("falls back to row length when total is absent", () => {
    expect(
      relatedSectionRowCount({
        rows: [
          { record_id: "1", fields: {} },
          { record_id: "2", fields: {} },
        ],
      }),
    ).toBe(2);
  });
});

describe("collectRelatedSectionCountTargets", () => {
  it("ignores sections with null elements", () => {
    expect(collectRelatedSectionCountTargets([
      {
        name: "resolution_details__c",
        label: { text: "Resolution Details" },
        elements: null as unknown as undefined,
      },
    ])).toEqual([]);
  });

  it("collects the first related element per section", () => {
    const targets = collectRelatedSectionCountTargets([
      {
        name: "details__c",
        label: { text: "Details" },
        elements: [{ kind: "field", field_api_name: "name__v", label: { text: "Name" } }],
      },
      {
        name: "sites__c",
        label: { text: "Study Sites" },
        elements: [
          {
            kind: "relatedObject",
            label: { text: "Sites" },
            related: {
              section_context_token: "token-sites",
              target_object_api_name: "site__v",
              link_field_api_name: "study_country__v",
              columns: [],
              prevent_record_create: false,
              modal_create_record: false,
              create_allowed: true,
            },
          },
        ],
      },
    ]);

    expect(targets).toEqual([{ sectionId: "section-sites__c", token: "token-sites" }]);
  });

  it("skips sections that already embed row_count from BuildPage", () => {
    expect(
      collectRelatedSectionCountTargets([
        {
          name: "sites__c",
          label: { text: "Study Sites" },
          elements: [
            {
              kind: "relatedObject",
              label: { text: "Sites" },
              related: {
                section_context_token: "token-sites",
                target_object_api_name: "site__v",
                link_field_api_name: "study_country__v",
                columns: [],
                prevent_record_create: false,
                modal_create_record: false,
                create_allowed: true,
                row_count: 0,
              },
            },
          ],
        },
      ]),
    ).toEqual([]);
  });
});

describe("relatedSectionCountsFromPage", () => {
  it("seeds badge totals from embedded row_count", async () => {
    const { relatedSectionCountsFromPage } = await import("./relatedSectionCount");
    expect(
      relatedSectionCountsFromPage([
        {
          name: "sites__c",
          label: { text: "Sites" },
          elements: [
            {
              kind: "relatedObject",
              label: { text: "Sites" },
              related: {
                section_context_token: "t",
                target_object_api_name: "site__v",
                link_field_api_name: "study__v",
                columns: [],
                prevent_record_create: false,
                modal_create_record: false,
                create_allowed: true,
                row_count: 3,
              },
            },
          ],
        },
      ]),
    ).toEqual({ "section-sites__c": 3 });
  });
});
