import { describe, expect, it } from "vitest";
import {
  isDocumentClientAction,
  isDocumentCreateDraftAction,
  isDocumentDownloadAction,
  isDocumentToolbarAction,
  isDocumentUploadAction,
} from "./documentActions";

describe("documentActions", () => {
  it("classifies download actions", () => {
    expect(isDocumentDownloadAction("download_source__v")).toBe(true);
    expect(isDocumentDownloadAction("download_rendition__v")).toBe(true);
    expect(isDocumentDownloadAction("checkout__v")).toBe(false);
  });

  it("classifies upload actions", () => {
    expect(isDocumentUploadAction("checkin__v")).toBe(true);
    expect(isDocumentUploadAction("upload_new_version__v")).toBe(true);
    expect(isDocumentUploadAction("checkout__v")).toBe(false);
  });

  it("classifies create draft actions", () => {
    expect(isDocumentCreateDraftAction("create_draft__v")).toBe(true);
    expect(isDocumentCreateDraftAction("checkin__v")).toBe(false);
  });

  it("detects client-side document actions", () => {
    expect(isDocumentClientAction("download_source__v")).toBe(true);
    expect(isDocumentClientAction("checkin__v")).toBe(true);
    expect(isDocumentClientAction("create_draft__v")).toBe(true);
  });

  it("detects document toolbar actions", () => {
    expect(isDocumentToolbarAction("checkout__v")).toBe(true);
    expect(isDocumentToolbarAction("create_draft__v")).toBe(false);
  });
});
