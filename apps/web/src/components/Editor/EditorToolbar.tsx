import type { Editor } from "@tiptap/react";
import styles from "./EditorToolbar.module.css";

interface Props {
  editor: Editor;
}

export default function EditorToolbar({ editor }: Props) {
  const btn = (
    active: boolean,
    onClick: () => void,
    label: string,
    title: string
  ) => (
    <button
      key={label}
      type="button"
      className={`${styles.btn} ${active ? styles.active : ""}`}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Barra de formato">
      <div className={styles.group}>
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Negrita")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Cursiva")}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Subrayado")}
        {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "S̶", "Tachado")}
        {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "`", "Código en línea")}
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        {([1, 2, 3] as const).map((level) =>
          btn(
            editor.isActive("heading", { level }),
            () => editor.chain().focus().toggleHeading({ level }).run(),
            `H${level}`,
            `Título ${level}`
          )
        )}
        {btn(editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), "¶", "Párrafo")}
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• Lista", "Lista sin orden")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. Lista", "Lista numerada")}
        {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "❝", "Cita")}
        {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "</> Bloque", "Bloque de código")}
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        {btn(false, () => editor.chain().focus().setTextAlign("left").run(), "⬅", "Alinear izquierda")}
        {btn(false, () => editor.chain().focus().setTextAlign("center").run(), "⬛", "Centrar")}
        {btn(false, () => editor.chain().focus().setTextAlign("right").run(), "➡", "Alinear derecha")}
        {btn(false, () => editor.chain().focus().setTextAlign("justify").run(), "☰", "Justificar")}
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        {btn(
          false,
          () => {
            const url = window.prompt("URL del enlace:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          },
          "🔗",
          "Insertar enlace"
        )}
        {btn(
          false,
          () => {
            const url = window.prompt("URL de la imagen:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          },
          "🖼",
          "Insertar imagen"
        )}
        {btn(
          false,
          () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
          "⊞",
          "Insertar tabla"
        )}
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        {btn(false, () => editor.chain().focus().undo().run(), "↩", "Deshacer")}
        {btn(false, () => editor.chain().focus().redo().run(), "↪", "Rehacer")}
      </div>
    </div>
  );
}
