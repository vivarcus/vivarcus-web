import { getFormRenderer } from "../renderers/formRegistry";
import { resolveFormRendererKind } from "../renderers/resolveKind";
import type { FormRendererProps } from "../renderers/types";

export function FormFieldInput(props: FormRendererProps) {
  const kind = resolveFormRendererKind(props.element);
  if (!kind) {
    return null;
  }

  const Renderer = getFormRenderer(kind);
  if (!Renderer) {
    return null;
  }

  return Renderer(props);
}
