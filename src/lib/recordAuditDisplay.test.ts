import { describe, expect, it } from "vitest";
import {
  auditTrailModalTitle,
  auditResultsSummaryRange,
  enrichRecordAuditRows,
  formatAuditRecordCellLabel,
} from "./recordAuditDisplay";
import { defaultAuditChrome } from "./i18n";

describe("auditTrailModalTitle", () => {
  it("matches Veeva screenshot title format", () => {
    expect(auditTrailModalTitle("Study", "dfdfdfddfdf")).toBe(
      "Audit trail for Study : Study: dfdfdfddfdf",
    );
  });

  it("uses localized trail title template", () => {
    const chrome = {
      ...defaultAuditChrome,
      trail_title_for: {
        text: "{object}：{object}: {record} 的审计追踪",
        key: "system:audit.trail_title_for",
      },
    };
    expect(auditTrailModalTitle("研究", "NVC-301", chrome)).toBe(
      "研究：研究: NVC-301 的审计追踪",
    );
  });
});

describe("formatAuditRecordCellLabel", () => {
  it("matches Veeva record column format", () => {
    expect(formatAuditRecordCellLabel("Study", "dfdfdfddfdf")).toBe("Study : dfdfdfddfdf");
  });
});

describe("enrichRecordAuditRows", () => {
  it("uses fixed record cell for all rows in record audit dialog", () => {
    const [row] = enrichRecordAuditRows(
      [
        {
          user_name: "nick@example.com",
          item: "Study : 0s0s0s0s",
          event_description: '"Study Number" changed from "" to "dfdfdfddfdf"',
        },
      ],
      "Study : dfdfdfddfdf",
    );
    expect(row.record).toBe("Study : dfdfdfddfdf");
  });

  it("rewrites create event description with fixed record cell", () => {
    const chrome = {
      ...defaultAuditChrome,
      item_created: {
        text: "{item} 已创建",
        key: "system:audit.item_created",
      },
    };
    const [row] = enrichRecordAuditRows(
      [
        {
          action: "Create",
          user_name: "admin@novacrest.com",
          item: "product__v 00P000000000001",
          event_description: "Created record 00P000000000001 on object product__v",
        },
      ],
      "产品 : NVC-301 (Novitinib) 250mg Tablet",
      chrome,
    );
    expect(row.event_description).toBe(
      "产品 : NVC-301 (Novitinib) 250mg Tablet 已创建",
    );
    expect(row.item).toBe("产品 : NVC-301 (Novitinib) 250mg Tablet");
  });

  it("uses object label plus record name from item when no fixed cell", () => {
    const [row] = enrichRecordAuditRows([
      {
        object_label: "研究",
        object_name: "study__v",
        record_id: "0ST000000000001",
        item: "研究 : 基本研究 : CCB-2401-PSO-201",
        event_description: "研究 : 基本研究 : CCB-2401-PSO-201 已创建",
        action: "Create",
      },
    ]);
    expect(row.record).toBe("研究 : CCB-2401-PSO-201");
    expect(row.event_description).toBe("研究 : 基本研究 : CCB-2401-PSO-201 已创建");
  });

  it("adds record column from item when no fixed cell", () => {
    const [row] = enrichRecordAuditRows([
      {
        user_name: "System",
        on_behalf_of: "nick@example.com",
        item: "Study : dfdfdfddfdf",
        event_description: "changed",
      },
    ]);
    expect(row.record).toBe("Study : dfdfdfddfdf");
    expect(row.user_name).toBe("System on behalf of nick@example.com");
  });

  it("localizes on-behalf-of template", () => {
    const chrome = {
      ...defaultAuditChrome,
      on_behalf_of: {
        text: "{user}代表{principal}",
        key: "system:audit.on_behalf_of",
      },
    };
    const [row] = enrichRecordAuditRows(
      [
        {
          user_name: "System",
          on_behalf_of: "nick@example.com",
        },
      ],
      undefined,
      chrome,
    );
    expect(row.user_name).toBe("System代表nick@example.com");
  });

  it("keeps related-record labels when primary context is set", () => {
    const rows = enrichRecordAuditRows(
      [
        {
          object_name: "write_perm_test__c",
          record_id: "P1",
          object_label: "Write Permission Test",
          item: "Write Permission Test : Parent",
          action: "Create",
        },
        {
          object_name: "wpt_child__c",
          record_id: "C1",
          object_label: "WPT Child",
          item: "WPT Child : Child One",
          action: "Create",
        },
      ],
      "Write Permission Test : Parent",
      defaultAuditChrome,
      { objectName: "write_perm_test__c", recordId: "P1" },
    );
    expect(rows[0].record).toBe("Write Permission Test : Parent");
    expect(rows[0].event_description).toBe("Write Permission Test : Parent created");
    expect(rows[1].record).toBe("WPT Child : Child One");
    expect(rows[1].event_description).toBeUndefined();
  });
});

describe("auditResultsSummaryRange", () => {
  const now = new Date(2026, 7, 31);

  it("uses the filter window when both bounds are set", () => {
    expect(
      auditResultsSummaryRange(
        [{ timestamp: "12 May 2026 6:15 PM CST" }],
        "2026-07-31T00:00",
        "2026-08-31T23:59",
        now,
      ),
    ).toEqual({ from: "31 Jul 2026", to: "31 Aug 2026" });
  });

  it("uses oldest event date and today when timestamp is all", () => {
    expect(
      auditResultsSummaryRange(
        [
          { timestamp: "12 May 2026 6:15 PM CST" },
          { timestamp: "07 Nov 2024 7:29 PM CST" },
        ],
        "",
        "",
        now,
      ),
    ).toEqual({ from: "07 Nov 2024", to: "31 Aug 2026" });
  });

  it("keeps today as the end date when there are no events", () => {
    expect(auditResultsSummaryRange([], "", "", now)).toEqual({
      from: "—",
      to: "31 Aug 2026",
    });
  });

  it("uses the calendar date from numeric timestamps without timezone shift", () => {
    expect(
      auditResultsSummaryRange(
        [{ timestamp: "08/22/2026 4:04 PM UTC" }],
        "",
        "",
        now,
      ),
    ).toEqual({ from: "22 Aug 2026", to: "31 Aug 2026" });
  });
});
