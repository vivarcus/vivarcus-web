import { useEffect, useRef, useState, type RefObject } from "react";
import type { DocumentMediaPlayback } from "../../api/types";
import { displayText } from "../../lib/i18n";
import type { DisplayText } from "../../lib/i18n/types";

/** Veeva Help speeds, plus 1.75 from JW Player Doc Info observation. */
export const MEDIA_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Aligns with Veeva library thumbnail: still from ~2s into the video. */
const POSTER_SEEK_SECONDS = 2;

type Props = {
  src: string;
  kind: "video" | "audio";
  withCredentials?: boolean;
  /** Server poster when available; otherwise client captures a frame at ~2s. */
  posterUrl?: string | null;
  playbackRateLabel: DisplayText;
};

function formatRate(rate: number): string {
  return `${rate}x`;
}

function revokePoster(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Progressive HTML5 media player with Veeva-aligned speed controls and poster.
 */
export function DocumentMediaPlayer({
  src,
  kind,
  withCredentials = false,
  posterUrl: serverPosterUrl,
  playbackRateLabel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [rate, setRate] = useState(1);
  const [capturedPosterUrl, setCapturedPosterUrl] = useState<string | null>(null);
  const capturedPosterRef = useRef<string | null>(null);

  const effectivePoster = (serverPosterUrl?.trim() || capturedPosterUrl || undefined) ?? undefined;
  const crossOrigin = withCredentials ? "use-credentials" : undefined;

  useEffect(() => {
    const el = kind === "audio" ? audioRef.current : videoRef.current;
    if (el) {
      el.playbackRate = rate;
    }
  }, [rate, src, kind]);

  useEffect(() => {
    revokePoster(capturedPosterRef.current);
    capturedPosterRef.current = null;
    setCapturedPosterUrl(null);
  }, [src, serverPosterUrl]);

  useEffect(() => {
    return () => {
      revokePoster(capturedPosterRef.current);
      capturedPosterRef.current = null;
    };
  }, []);

  // Capture poster on a hidden video so the visible player is not seeked.
  useEffect(() => {
    if (kind !== "video" || serverPosterUrl?.trim() || !src) {
      return;
    }

    let cancelled = false;
    const probe = document.createElement("video");
    probe.muted = true;
    probe.playsInline = true;
    probe.preload = "auto";
    if (crossOrigin) {
      probe.crossOrigin = crossOrigin;
    }
    probe.src = src;

    const fail = () => {
      probe.removeAttribute("src");
      probe.load();
    };

    const onReady = () => {
      if (cancelled) {
        return;
      }
      if (!Number.isFinite(probe.duration) || probe.duration <= 0) {
        return;
      }
      if (probe.videoWidth <= 0 || probe.videoHeight <= 0) {
        return;
      }
      const target = Math.min(POSTER_SEEK_SECONDS, Math.max(0, probe.duration - 0.05));
      const onSeeked = () => {
        probe.removeEventListener("seeked", onSeeked);
        if (cancelled) {
          return;
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = probe.videoWidth;
          canvas.height = probe.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            fail();
            return;
          }
          ctx.drawImage(probe, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (cancelled || !blob) {
                fail();
                return;
              }
              const url = URL.createObjectURL(blob);
              revokePoster(capturedPosterRef.current);
              capturedPosterRef.current = url;
              setCapturedPosterUrl(url);
              fail();
            },
            "image/jpeg",
            0.85,
          );
        } catch {
          fail();
        }
      };
      probe.addEventListener("seeked", onSeeked);
      try {
        probe.currentTime = target;
      } catch {
        probe.removeEventListener("seeked", onSeeked);
        fail();
      }
    };

    probe.addEventListener("loadeddata", onReady, { once: true });
    probe.addEventListener("error", fail, { once: true });

    return () => {
      cancelled = true;
      fail();
    };
  }, [kind, src, serverPosterUrl, crossOrigin]);

  return (
    <div className="document-viewer__media" data-testid="document-media-player">
      {kind === "audio" ? (
        <audio
          ref={audioRef as RefObject<HTMLAudioElement>}
          controls
          preload="metadata"
          src={src}
          crossOrigin={crossOrigin}
        />
      ) : (
        <video
          ref={videoRef as RefObject<HTMLVideoElement>}
          controls
          playsInline
          preload="metadata"
          src={src}
          poster={effectivePoster}
          crossOrigin={crossOrigin}
        />
      )}
      <div
        className="document-viewer__media-rates"
        role="group"
        aria-label={displayText(playbackRateLabel)}
        data-testid="document-media-playback-rates"
      >
        <span className="document-viewer__media-rates-label">{displayText(playbackRateLabel)}</span>
        {MEDIA_PLAYBACK_RATES.map((value) => (
          <button
            key={value}
            type="button"
            className={
              rate === value
                ? "document-viewer__media-rate document-viewer__media-rate--active"
                : "document-viewer__media-rate"
            }
            aria-pressed={rate === value}
            onClick={() => setRate(value)}
          >
            {formatRate(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Resolve player kind from media_playback or source mime. */
export function mediaPlayerKind(
  playback: DocumentMediaPlayback | null | undefined,
  sourceMediaType: string | undefined,
): "video" | "audio" {
  if (playback?.kind === "audio" || playback?.kind === "video") {
    return playback.kind;
  }
  if (/^audio\//i.test((sourceMediaType ?? "").split(";")[0]?.trim() ?? "")) {
    return "audio";
  }
  return "video";
}
