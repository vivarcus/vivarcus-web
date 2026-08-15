import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { DisplayRendererProps } from "./types";
import { isRichTextEmpty, sanitizeRichTextHtml } from "./richTextSanitize";

export function DisplayRichTextRenderer({
  value,
  fieldRender,
}: DisplayRendererProps) {
  const { shell } = useUi();
  const displayValue =
    fieldRender?.display_value !== undefined ? fieldRender.display_value : value;
  const raw = String(displayValue ?? "");
  if (!raw.includes("<")) {
    const plain = raw.trim();
    if (!plain) {
      return (
        <span className="field-value field-value--empty">
          {displayText(shell.empty_value)}
        </span>
      );
    }
    return <span className="field-value field-value--long">{plain}</span>;
  }

  const sanitized = sanitizeRichTextHtml(raw);
  if (isRichTextEmpty(sanitized)) {
    return (
      <span className="field-value field-value--empty">
        {displayText(shell.empty_value)}
      </span>
    );
  }

  return (
    <div
      className="field-value field-value--richtext"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
