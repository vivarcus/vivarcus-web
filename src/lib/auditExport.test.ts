import { describe, expect, it } from "vitest";
import {
  auditTypeForPanel,
  buildExportQuery,
  domainDateRangeTooLarge,
  localDateInputToRFC3339,
  localDateTimeInputToRFC3339,
} from "./auditExport";

describe("auditTypeForPanel", () => {
  it("maps admin panel kinds to CAP-AUD audit types", () => {
    expect(auditTypeForPanel("login")).toBe("login_audit_trail");
    expect(auditTypeForPanel("system")).toBe("system_audit_trail");
    expect(auditTypeForPanel("domain")).toBe("domain_audit_trail");
    expect(auditTypeForPanel("object_records")).toBe("object_audit_trail");
    expect(auditTypeForPanel("record_object")).toBe("object_audit_trail");
  });
});

describe("localDateTimeInputToRFC3339", () => {
  it("returns undefined for empty input", () => {
    expect(localDateTimeInputToRFC3339("")).toBeUndefined();
  });

  it("converts datetime-local values to ISO strings", () => {
    const iso = localDateTimeInputToRFC3339("2026-05-30T12:30");
    expect(iso).toMatch(/^2026-05-30T/);
  });

  it("keeps minute-only From at second 0", () => {
    const iso = localDateTimeInputToRFC3339("2026-08-27T10:06");
    const parsed = new Date(iso!);
    expect(parsed.getSeconds()).toBe(0);
    expect(parsed.getMilliseconds()).toBe(0);
  });

  it("extends minute-only To through the end of that minute", () => {
    const start = localDateTimeInputToRFC3339("2026-08-27T10:06");
    const end = localDateTimeInputToRFC3339("2026-08-27T10:06", true);
    expect(Date.parse(end!) - Date.parse(start!)).toBe(59_999);
  });
});

describe("localDateInputToRFC3339", () => {
  it("converts date-only values using local day bounds", () => {
    const start = localDateInputToRFC3339("2026-07-07", false);
    const end = localDateInputToRFC3339("2026-07-21", true);
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Date.parse(end!) - Date.parse(start!)).toBeGreaterThan(0);
  });
});

describe("domainDateRangeTooLarge", () => {
  it("allows inclusive Last 2 weeks ranges", () => {
    expect(domainDateRangeTooLarge("2026-07-07", "2026-07-21")).toBe(false);
  });

  it("rejects ranges longer than two weeks", () => {
    expect(domainDateRangeTooLarge("2026-07-01", "2026-07-21")).toBe(true);
  });
});

describe("buildExportQuery", () => {
  it("includes object and record for record audit", () => {
    expect(
      buildExportQuery("record_object", {
        objectName: "study__v",
        recordId: "V1",
      }),
    ).toEqual({ object_name: "study__v", record_id: "V1" });
  });

  it("includes record audit filters in export query", () => {
    expect(
      buildExportQuery("record_object", {
        objectName: "study__v",
        recordId: "V1",
        user: "alice",
        action: "Edit",
        time_from: "2026-05-01T00:00:00.000Z",
        time_to: "2026-05-30T00:00:00.000Z",
      }),
    ).toEqual({
      object_name: "study__v",
      record_id: "V1",
      user: "alice",
      action: "Edit",
      time_from: "2026-05-01T00:00:00.000Z",
      time_to: "2026-05-30T00:00:00.000Z",
    });
  });

  it("includes related objects in record audit export", () => {
    expect(
      buildExportQuery("record_object", {
        objectName: "study__v",
        recordId: "V1",
        include_related: ["study_country__v", ""],
      }),
    ).toEqual({
      object_name: "study__v",
      record_id: "V1",
      include_related: ["study_country__v"],
    });
  });
});
