import StarterKit from "@tiptap/starter-kit";
import { sanitizeRichTextHtml } from "./richTextSanitize";

/** TipTap extensions aligned with RichText sanitize allowlist. */
export function createRichTextEditorExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      },
    }),
  ];
}

export function sanitizePastedRichTextHtml(html: string): string {
  return sanitizeRichTextHtml(html);
}
