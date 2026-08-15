import { describe, expect, it } from "vitest";
import { MEDIA_PLAYBACK_RATES, mediaPlayerKind } from "./DocumentMediaPlayer";

describe("DocumentMediaPlayer helpers", () => {
  it("exposes Veeva-aligned playback rates", () => {
    expect([...MEDIA_PLAYBACK_RATES]).toEqual([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  });

  it("resolves audio vs video kind", () => {
    expect(mediaPlayerKind({ kind: "audio" } as never, "video/mp4")).toBe("audio");
    expect(mediaPlayerKind({ kind: "video" } as never, "audio/mpeg")).toBe("video");
    expect(mediaPlayerKind(null, "audio/mpeg")).toBe("audio");
    expect(mediaPlayerKind(undefined, "video/mp4")).toBe("video");
  });
});
