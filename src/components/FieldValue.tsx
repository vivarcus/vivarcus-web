import { getDisplayRenderer } from "../renderers/displayRegistry";
import { resolveDisplayRendererKind } from "../renderers/resolveKind";
import type { DisplayRendererProps } from "../renderers/types";

export function FieldValue(props: DisplayRendererProps) {
  const kind = resolveDisplayRendererKind({
    fieldType: props.fieldType,
    fieldRender: props.fieldRender,
    navigationTarget: props.navigationTarget,
  });

  const Renderer = getDisplayRenderer(kind);
  if (!Renderer) {
    return null;
  }

  return <Renderer {...props} />;
}
