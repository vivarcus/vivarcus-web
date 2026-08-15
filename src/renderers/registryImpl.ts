import type { DisplayRendererKind, DisplayRendererProps, FormRendererKind, FormRendererProps } from "./types";
import { DISPLAY_RENDERERS, getDisplayRenderer } from "./displayRegistry";
import { FORM_RENDERERS, getFormRenderer } from "./formRegistry";

export function renderFormField(kind: FormRendererKind, props: FormRendererProps) {
  const Renderer = getFormRenderer(kind);
  if (!Renderer) {
    return null;
  }
  return Renderer(props);
}

export function renderDisplayField(kind: DisplayRendererKind, props: DisplayRendererProps) {
  const Renderer = getDisplayRenderer(kind);
  if (!Renderer) {
    return null;
  }
  return Renderer(props);
}

export { FORM_RENDERERS, DISPLAY_RENDERERS, getFormRenderer, getDisplayRenderer };
