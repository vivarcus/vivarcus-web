import { describe, expect, it } from "vitest";
import { formatTimezoneOptionLabel, ianaTimezoneId } from "./timezoneLabel";

describe("ianaTimezoneId", () => {
  it("keeps IANA region/city codes", () => {
    expect(ianaTimezoneId("Asia/Shanghai")).toBe("Asia/Shanghai");
  });

  it("accepts UTC", () => {
    expect(ianaTimezoneId("UTC")).toBe("UTC");
  });

  it("ignores picklist entry names", () => {
    expect(ianaTimezoneId("asia_shanghai__sys")).toBe("");
  });
});

describe("formatTimezoneOptionLabel", () => {
  it("appends IANA when the picklist label is a short display name", () => {
    expect(formatTimezoneOptionLabel("Asia/Shanghai", "China Standard Time")).toBe(
      "China Standard Time (Asia/Shanghai)",
    );
  });

  it("does not duplicate an IANA id already in the label", () => {
    expect(
      formatTimezoneOptionLabel(
        "Asia/Shanghai",
        "(GMT+08:00) China Standard Time (Asia/Shanghai)",
      ),
    ).toBe("(GMT+08:00) China Standard Time (Asia/Shanghai)");
  });

  it("does not duplicate a city already in the label", () => {
    expect(formatTimezoneOptionLabel("Asia/Shanghai", "Shanghai")).toBe("Shanghai");
  });

  it("falls back to the catalog code", () => {
    expect(formatTimezoneOptionLabel("Asia/Tokyo", "")).toBe("Asia/Tokyo");
  });
});
