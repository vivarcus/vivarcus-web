import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button } from "antd";
import { useEffect, useMemo, useRef } from "react";
import type { FormRendererProps } from "./types";
import { wrapFormControl } from "./fieldChrome";
import { isFieldDisabled, isFieldRequired, resolveFieldLabel } from "./formUtils";
import {
  createRichTextEditorExtensions,
  sanitizePastedRichTextHtml,
} from "./richTextEditorExtensions";
import { isRichTextEmpty, sanitizeRichTextHtml } from "./richTextSanitize";

type ToolbarButton = {
  id: string;
  label: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

function buildToolbarActions(): ToolbarButton[] {
  return [
    {
      id: "bold",
      label: "B",
      isActive: (editor) => editor.isActive("bold"),
      run: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      id: "italic",
      label: "I",
      isActive: (editor) => editor.isActive("italic"),
      run: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: "underline",
      label: "U",
      isActive: (editor) => editor.isActive("underline"),
      run: (editor) => editor.chain().focus().toggleUnderline().run(),
    },
    {
      id: "strike",
      label: "S",
      isActive: (editor) => editor.isActive("strike"),
      run: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: "bullet",
      label: "•",
      isActive: (editor) => editor.isActive("bulletList"),
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: "number",
      label: "1.",
      isActive: (editor) => editor.isActive("orderedList"),
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "link",
      label: "🔗",
      isActive: (editor) => editor.isActive("link"),
      run: (editor) => {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("URL", previousUrl ?? "");
        if (url === null) {
          return;
        }
        const trimmed = url.trim();
        if (!trimmed) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
      },
    },
    {
      id: "clear",
      label: "⌫",
      isActive: () => false,
      run: (editor) => editor.chain().focus().unsetAllMarks().run(),
    },
  ];
}

const TOOLBAR_ACTIONS = buildToolbarActions();

function normalizeEditorHtml(html: string): string {
  const sanitized = sanitizeRichTextHtml(html);
  return isRichTextEmpty(sanitized) ? "" : sanitized;
}

export function RichTextEditorRenderer({
  element,
  value,
  onChange,
  showLabel = true,
}: FormRendererProps) {
  const label = resolveFieldLabel(element) || "Rich text";
  const disabled = isFieldDisabled(element);
  const required = isFieldRequired(element);
  const lastEmitted = useRef("");
  const extensions = useMemo(() => createRichTextEditorExtensions(), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: sanitizeRichTextHtml(String(value ?? "")) || "<p></p>",
    editable: !disabled,
    editorProps: {
      transformPastedHTML: sanitizePastedRichTextHtml,
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        ...(showLabel ? {} : { "aria-label": label }),
        ...(required ? { "aria-required": "true" } : {}),
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const normalized = normalizeEditorHtml(activeEditor.getHTML());
      if (normalized === lastEmitted.current) {
        return;
      }
      lastEmitted.current = normalized;
      onChange(normalized);
    },
    onBlur: ({ editor: activeEditor }) => {
      const normalized = normalizeEditorHtml(activeEditor.getHTML());
      if (normalized === lastEmitted.current) {
        return;
      }
      lastEmitted.current = normalized;
      onChange(normalized);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const sanitized = normalizeEditorHtml(String(value ?? ""));
    const current = normalizeEditorHtml(editor.getHTML());
    if (sanitized === current) {
      lastEmitted.current = sanitized;
      return;
    }
    lastEmitted.current = sanitized;
    editor.commands.setContent(sanitized || "<p></p>", { emitUpdate: false });
  }, [editor, value]);

  return wrapFormControl(
    <div className="rich-text-editor">
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label={`${label} formatting`}>
        {editor
          ? TOOLBAR_ACTIONS.map((action) => (
              <Button
                key={action.id}
                type={action.isActive(editor) ? "primary" : "text"}
                size="small"
                className="rich-text-editor__toolbar-btn"
                disabled={disabled}
                aria-label={action.id}
                aria-pressed={action.isActive(editor) || undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => action.run(editor)}
              >
                {action.label}
              </Button>
            ))
          : null}
      </div>
      <EditorContent editor={editor} className="rich-text-editor__surface" />
    </div>,
    { label, required, showLabel },
  );
}
