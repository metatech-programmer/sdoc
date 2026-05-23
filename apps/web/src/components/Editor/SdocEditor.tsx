import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import EditorToolbar from "./EditorToolbar";
import styles from "./SdocEditor.module.css";

interface SdocEditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  onUpdate?: (content: unknown) => void;
  editable?: boolean;
}

export default function SdocEditor({
  ydoc,
  provider,
  onUpdate,
  editable = true,
}: SdocEditorProps) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider,
              user: { name: "Usuario", color: "#60a5fa" },
            }),
          ]
        : []),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    onUpdate({ editor }) {
      onUpdate?.(editor.getJSON());
    },
  });

  if (!editor) return null;

  return (
    <div className={styles.wrapper}>
      {editable && <EditorToolbar editor={editor} />}
      <div className={styles.content}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
