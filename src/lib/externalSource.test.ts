import { describe, expect, it } from "vitest";
import { externalSourceEditAction, externalSourceResyncRequest } from "./externalSource";

describe("externalSourceEditAction", () => {
  it("returns null without external source", () => {
    expect(externalSourceEditAction(null)).toBeNull();
    expect(externalSourceEditAction(undefined)).toBeNull();
  });

  it("returns null without a valid http(s) url", () => {
    expect(externalSourceEditAction({ provider: "feishu" })).toBeNull();
    expect(externalSourceEditAction({ provider: "feishu", url: "" })).toBeNull();
    expect(externalSourceEditAction({ provider: "feishu", url: "javascript:alert(1)" })).toBeNull();
  });

  it("returns edit action for feishu provenance", () => {
    expect(
      externalSourceEditAction({
        provider: "feishu",
        url: "https://example.feishu.cn/docx/abc",
      }),
    ).toEqual({
      url: "https://example.feishu.cn/docx/abc",
      label: "Edit in Feishu",
    });
  });

  it("falls back to capitalized provider label", () => {
    expect(
      externalSourceEditAction({
        provider: "wps",
        url: "https://example.com/doc",
      }),
    ).toEqual({
      url: "https://example.com/doc",
      label: "Edit in Wps",
    });
  });
});

describe("externalSourceResyncRequest", () => {
  it("returns null without feishu provenance", () => {
    expect(externalSourceResyncRequest(null)).toBeNull();
    expect(externalSourceResyncRequest({ provider: "wps", file_token: "t", file_type: "docx" })).toBeNull();
  });

  it("returns null without file token or type", () => {
    expect(externalSourceResyncRequest({ provider: "feishu" })).toBeNull();
    expect(externalSourceResyncRequest({ provider: "feishu", file_token: "tok" })).toBeNull();
  });

  it("returns resync request for feishu provenance", () => {
    expect(
      externalSourceResyncRequest({
        provider: "feishu",
        file_token: "tok123",
        file_type: "docx",
        title: "Protocol",
        url: "https://example.feishu.cn/docx/abc",
        profile_id: "profile-1",
      }),
    ).toEqual({
      profile_id: "profile-1",
      file_token: "tok123",
      file_type: "docx",
      title: "Protocol",
      url: "https://example.feishu.cn/docx/abc",
      label: "Sync from Feishu",
    });
  });
});
