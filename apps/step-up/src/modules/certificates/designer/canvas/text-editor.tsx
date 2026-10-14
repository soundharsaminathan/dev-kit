import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import type { TipTapDoc } from "../../schema";
import { createCertificateExtensions } from "../tiptap/extensions";
import styles from "./text-editor.module.scss";

type InlineTextEditorProps = {
  content: TipTapDoc;
  onChange: (content: TipTapDoc) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
};

export function InlineTextEditor({
  content,
  onChange,
  onBlur,
  autoFocus = true,
}: InlineTextEditorProps) {
  const editor = useEditor({
    extensions: createCertificateExtensions(),
    content,
    autofocus: autoFocus ? "end" : false,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as TipTapDoc);
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: styles.editor ?? "cert-inline-editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content);
    if (current !== next) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
}
