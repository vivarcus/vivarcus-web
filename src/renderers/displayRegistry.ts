import { DisplayIconRenderer } from "./DisplayIconRenderer";
import { DisplayImageRenderer } from "./ImageFieldRenderer";
import { DisplayLinkRenderer } from "./DisplayLinkRenderer";
import { DisplayRichTextRenderer } from "./DisplayRichTextRenderer";
import { DisplayTextRenderer } from "./DisplayTextRenderer";
import type { DisplayRendererComponent, DisplayRendererKind } from "./types";

const DISPLAY_RENDERERS: Record<DisplayRendererKind, DisplayRendererComponent> = {
  display_text: DisplayTextRenderer,
  display_link: DisplayLinkRenderer,
  display_rich_text: DisplayRichTextRenderer,
  display_icon: DisplayIconRenderer,
  display_image: DisplayImageRenderer,
};

export function getDisplayRenderer(
  kind: DisplayRendererKind,
): DisplayRendererComponent | undefined {
  return DISPLAY_RENDERERS[kind];
}

export { DISPLAY_RENDERERS };
