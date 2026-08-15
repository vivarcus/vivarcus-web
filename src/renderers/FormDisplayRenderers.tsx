import { useUi } from "../context/UiContext";
import { DisplayLinkRenderer } from "./DisplayLinkRenderer";
import { DisplayRichTextRenderer } from "./DisplayRichTextRenderer";
import { DisplayTextRenderer } from "./DisplayTextRenderer";
import { wrapFormControl } from "./fieldChrome";
import { resolveFieldLabel } from "./formUtils";
import type { DisplayContext } from "../api/types";
import type { FormRendererProps } from "./types";

function useFormDisplayContext(props: FormRendererProps): DisplayContext {
  const { displayContext } = useUi();
  return props.displayContext ?? displayContext;
}

function sharedDisplayProps(props: FormRendererProps, displayContext: DisplayContext) {
  const { element, value } = props;
  return {
    value,
    fieldApiName: element.field_api_name,
    fieldType: element.field_type ?? element.field_render?.field_type,
    fieldRender: element.field_render,
    displayContext,
  };
}

export function FormDisplayTextRenderer(props: FormRendererProps) {
  const { element, showLabel = true } = props;
  const label = resolveFieldLabel(element);
  const displayContext = useFormDisplayContext(props);
  const content = (
    <DisplayTextRenderer {...sharedDisplayProps(props, displayContext)} />
  );
  if (!showLabel) {
    return content;
  }
  return wrapFormControl(content, { label, showLabel });
}

export function FormDisplayRichTextRenderer(props: FormRendererProps) {
  const { element, showLabel = true } = props;
  const label = resolveFieldLabel(element);
  const displayContext = useFormDisplayContext(props);
  const content = (
    <DisplayRichTextRenderer {...sharedDisplayProps(props, displayContext)} />
  );
  if (!showLabel) {
    return content;
  }
  return wrapFormControl(content, { label, showLabel });
}

export function FormDisplayLinkRenderer(props: FormRendererProps) {
  const { element, showLabel = true } = props;
  const label = resolveFieldLabel(element);
  const displayContext = useFormDisplayContext(props);
  const content = (
    <DisplayLinkRenderer
      {...sharedDisplayProps(props, displayContext)}
      navigationTarget={element.field_render?.navigation_target}
    />
  );
  if (!showLabel) {
    return content;
  }
  return wrapFormControl(content, { label, showLabel });
}
