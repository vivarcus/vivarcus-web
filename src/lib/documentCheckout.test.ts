import { describe, expect, it } from "vitest";
import {
  canUploadSourceOutsideCheckin,
  canUploadSourceViaCheckin,
  documentViewerRefreshKey,
  isCheckinSourceUpload,
  viaCheckinUpload,
} from "./documentCheckout";

describe("documentCheckout", () => {
  it("allows outside checkin when unlocked", () => {
    expect(canUploadSourceOutsideCheckin(undefined)).toBe(true);
    expect(canUploadSourceOutsideCheckin({ locked: false })).toBe(true);
  });

  it("blocks outside checkin when locked", () => {
    expect(canUploadSourceOutsideCheckin({ locked: true, locked_by_me: true })).toBe(false);
    expect(canUploadSourceOutsideCheckin({ locked: true, locked_by_me: false })).toBe(false);
  });

  it("allows via checkin only for self lock", () => {
    expect(canUploadSourceViaCheckin({ locked: true, locked_by_me: true })).toBe(true);
    expect(canUploadSourceViaCheckin({ locked: true, locked_by_me: false })).toBe(false);
    expect(canUploadSourceViaCheckin({ locked: false })).toBe(false);
  });

  it("detects checkin upload intent", () => {
    expect(isCheckinSourceUpload("checkin__v")).toBe(true);
    expect(isCheckinSourceUpload("upload_new_version__v")).toBe(false);
    expect(viaCheckinUpload({ locked: true, locked_by_me: true }, "checkin__v")).toBe(true);
    expect(viaCheckinUpload({ locked: true, locked_by_me: true }, "upload_new_version__v")).toBe(
      false,
    );
  });

  it("includes checkout state in viewer refresh key", () => {
    const base = {
      state_api_name: "draft__v",
      record_version: 3,
      document_header: { major_version_number: 0, minor_version_number: 2 },
    };
    expect(documentViewerRefreshKey({ ...base })).toBe("draft__v:3:0:2:checkout:none");
    expect(
      documentViewerRefreshKey({
        ...base,
        document_header: {
          ...base.document_header,
          checkout: { locked: true, locked_by_me: true },
        },
      }),
    ).toBe("draft__v:3:0:2:checkout:self");
    expect(
      documentViewerRefreshKey({
        ...base,
        document_header: {
          ...base.document_header,
          checkout: { locked: true, locked_by_me: false },
        },
      }),
    ).toBe("draft__v:3:0:2:checkout:other");
  });
});
