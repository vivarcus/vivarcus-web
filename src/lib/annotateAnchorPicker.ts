/** Cross-window protocol for Select Anchors → create-anchor mini browser. */

export const CREATE_ANCHOR_QUERY = "createAnchor";

export const ANCHOR_CREATED_MESSAGE = "vivarcus:anchor-created" as const;

export const ANCHOR_CREATED_CHANNEL = "vivarcus-anchor-created";

export type AnchorCreatedPayload = {
  type: typeof ANCHOR_CREATED_MESSAGE;
  recordId: string;
  objectApiName: string;
  anchor: {
    id: string;
    page: number;
    title: string;
    body: string;
  };
};

export function isCreateAnchorMode(search = window.location.search): boolean {
  return new URLSearchParams(search).get(CREATE_ANCHOR_QUERY) === "1";
}

export function buildCreateAnchorUrl(objectApiName: string, recordId: string): string {
  const path = `/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}`;
  return `${path}?${CREATE_ANCHOR_QUERY}=1`;
}

export function openCreateAnchorWindow(objectApiName: string, recordId: string): Window | null {
  // Avoid noopener/noreferrer so postMessage via opener remains a fallback;
  // BroadcastChannel is the primary notify path.
  return window.open(
    buildCreateAnchorUrl(objectApiName, recordId),
    "vivarcus-create-anchor",
    "width=1200,height=900",
  );
}

export function isAnchorCreatedMessage(data: unknown): data is AnchorCreatedPayload {
  if (!data || typeof data !== "object") {
    return false;
  }
  const msg = data as Partial<AnchorCreatedPayload>;
  return (
    msg.type === ANCHOR_CREATED_MESSAGE &&
    typeof msg.recordId === "string" &&
    typeof msg.objectApiName === "string" &&
    !!msg.anchor &&
    typeof msg.anchor.id === "string"
  );
}

export function publishAnchorCreated(payload: AnchorCreatedPayload): void {
  try {
    const channel = new BroadcastChannel(ANCHOR_CREATED_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // BroadcastChannel unavailable.
  }
  try {
    window.opener?.postMessage(payload, window.location.origin);
  } catch {
    // Opener may be cross-origin or gone.
  }
}

export function subscribeAnchorCreated(
  handler: (payload: AnchorCreatedPayload) => void,
): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(ANCHOR_CREATED_CHANNEL);
    channel.onmessage = (event) => {
      if (isAnchorCreatedMessage(event.data)) {
        handler(event.data);
      }
    };
  } catch {
    channel = null;
  }
  const onWindowMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) {
      return;
    }
    if (isAnchorCreatedMessage(event.data)) {
      handler(event.data);
    }
  };
  window.addEventListener("message", onWindowMessage);
  return () => {
    channel?.close();
    window.removeEventListener("message", onWindowMessage);
  };
}

/** Veeva Anchor Name limit. */
export const ANCHOR_TITLE_MAX_LENGTH = 140;

export function truncateAnchorTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= ANCHOR_TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, ANCHOR_TITLE_MAX_LENGTH);
}
