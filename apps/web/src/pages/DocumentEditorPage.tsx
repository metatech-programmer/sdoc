import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, exportApi } from "../services/api";
import {
  buildSdocFromEditor,
  downloadSdoc,
  openSdocFromDisk,
  sdocDocumentToTiptap,
} from "../services/sdoc-file";
import { useAuthStore } from "../stores/authStore";
import { useDocumentStore } from "../stores/documentStore";
import { useYjsCollaboration } from "../hooks/useYjsCollaboration";
import { useAutoSave } from "../hooks/useAutoSave";
import { useOfflineStore } from "../stores/offlineStore";
import { useT, useLocaleStore } from "../lib/i18n";
import { formatTime } from "../lib/format";
import SdocEditor from "../components/Editor/SdocEditor";
import { Logo } from "../components/Brand/Logo";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { LangSwitch } from "../components/ui/LangSwitch";
import { toast } from "../components/ui/Toast";
import {
  Arrow,
  Download,
  Share,
  Sparkles,
  Cloud,
  WifiOff,
  X,
} from "../components/ui/Icon";
import { useEffect, useState, useRef } from "react";
import styles from "./DocumentEditorPage.module.css";

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const isOnline = useOfflineStore((s) => s.isOnline);

  // Selectores granulares (no desestructurar el store entero — causa loop infinito)
  const isDirty = useDocumentStore((s) => s.isDirty);
  const isSaving = useDocumentStore((s) => s.isSaving);
  const lastSavedAt = useDocumentStore((s) => s.lastSavedAt);
  const collaborators = useDocumentStore((s) => s.collaborators);

  const [zen, setZen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);

  const {
    data: doc,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["document", id],
    queryFn: () => documentsApi.get(id!),
    enabled: !!id,
  });

  const updateTitleMutation = useMutation({
    mutationFn: (newTitle: string) => documentsApi.update(id!, { title: newTitle } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  // Sincroniza el doc cargado con el store (usa getState para no depender del método).
  useEffect(() => {
    if (doc) {
      useDocumentStore.getState().setCurrentDocument(doc);
      setTitle(doc.title || "Sin título");
    }
    return () => useDocumentStore.getState().setCurrentDocument(null);
  }, [doc]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    if (exportOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportOpen]);

  // ESC sale del zen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && zen) setZen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zen]);

  const { ydoc, provider } = useYjsCollaboration({
    documentId: id ?? "",
    enabled: !!id,
  });

  const { scheduleAutoSave } = useAutoSave(id);

  async function handleExport(format: "PDF" | "DOCX" | "HTML") {
    setExportOpen(false);
    if (!id) return;
    try {
      await exportApi.request(id, format);
      toast.success(`${t("editor.export")} ${format} en proceso. Te avisamos por correo.`);
    } catch {
      toast.error("No pudimos iniciar el export. Reintenta.");
    }
  }

  /** Descarga el documento actual como archivo .sdoc (formato oficial). */
  async function handleDownloadSdoc() {
    setExportOpen(false);
    if (!doc) return;
    try {
      const user = useAuthStore.getState().user;
      const tiptapJson = (doc as { content?: unknown }).content ?? {
        type: "doc",
        content: [{ type: "paragraph" }],
      };
      const file = await buildSdocFromEditor({
        title: doc.title || t("editor.untitled"),
        ownerId: user?.id ?? doc.ownerId,
        ownerEmail: user?.email,
        ownerName: user?.fullName,
        language: doc.language ?? "es",
        tiptapJson,
      });
      await downloadSdoc(file);
      toast.success(`${doc.title}.sdoc descargado`);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el archivo .sdoc");
    }
  }

  /** Abre un .sdoc desde disco y crea un documento nuevo con su contenido. */
  async function handleOpenSdoc() {
    setExportOpen(false);
    try {
      const sdoc = await openSdocFromDisk();
      if (!sdoc) return;
      const tiptap = sdocDocumentToTiptap(sdoc.document);
      const newDoc = await documentsApi.create({
        title: sdoc.manifest.title || "Importado desde .sdoc",
        description: sdoc.manifest.description,
        language: sdoc.manifest.meta?.language ?? "es",
      });
      await documentsApi.update(newDoc.id, tiptap);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(`Importado: ${sdoc.manifest.title}`);
      navigate(`/app/documents/${newDoc.id}`);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo abrir el archivo .sdoc");
    }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => toast.success(t("toast.copied")));
  }

  function commitTitle() {
    setTitleEditing(false);
    if (title.trim() && title !== doc?.title) {
      updateTitleMutation.mutate(title.trim());
    } else if (!title.trim()) {
      setTitle(doc?.title || t("editor.untitled"));
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loader} aria-label="Cargando documento" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className={styles.loading}>
        <p className={styles.loadError}>No se pudo cargar este documento.</p>
        <Button variant="ghost" onClick={() => navigate("/app")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const saveStatusText = !isOnline
    ? t("editor.savedOffline")
    : isSaving
    ? t("editor.saving")
    : isDirty
    ? "Sin guardar"
    : lastSavedAt
    ? `${t("editor.saved")} · ${formatTime(lastSavedAt, locale)}`
    : t("editor.saved");

  const saveStatusKind = !isOnline ? "offline" : isSaving ? "saving" : isDirty ? "dirty" : "saved";

  return (
    <div className={`${styles.page} ${zen ? styles.zen : ""}`}>
      {!zen && (
        <header className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <Link to="/app" className={styles.brand} aria-label="Volver a documentos">
              <Logo variant="mark" size={28} />
            </Link>
            <span className={styles.divider} aria-hidden="true" />
            {titleEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setTitle(doc.title || t("editor.untitled"));
                    setTitleEditing(false);
                  }
                }}
                className={styles.titleInput}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={styles.title}
                onClick={() => setTitleEditing(true)}
                title="Renombrar"
              >
                {title || t("editor.untitled")}
              </button>
            )}

            <span className={`${styles.saveStatus} ${styles[`status_${saveStatusKind}`]}`}>
              <span className={styles.saveDot} />
              {saveStatusText}
            </span>
          </div>

          <div className={styles.toolbarRight}>
            {collaborators.length > 0 && (
              <div className={styles.collaborators} aria-label={`${collaborators.length} colaboradores`}>
                {collaborators.slice(0, 3).map((c) => (
                  <span
                    key={c.userId}
                    className={styles.collabAvatar}
                    style={{ background: c.color }}
                    title={c.name}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
                {collaborators.length > 3 && (
                  <span className={styles.collabMore}>+{collaborators.length - 3}</span>
                )}
              </div>
            )}

            <span className={styles.netStatus} aria-hidden="true">
              {isOnline ? <Cloud width={16} height={16} /> : <WifiOff width={16} height={16} />}
            </span>

            <ThemeToggle />
            <LangSwitch />

            <Button
              variant="ghost"
              size="sm"
              iconStart={<Share width={16} height={16} />}
              onClick={handleShare}
            >
              {t("editor.share")}
            </Button>

            <div className={styles.exportDropdown} ref={exportRef}>
              <Button
                variant="outline"
                size="sm"
                iconStart={<Download width={16} height={16} />}
                onClick={() => setExportOpen(!exportOpen)}
              >
                {t("editor.export")}
              </Button>
              {exportOpen && (
                <div className={styles.exportMenu} role="menu">
                  <button
                    role="menuitem"
                    className={styles.exportItem}
                    onClick={handleDownloadSdoc}
                  >
                    <span className={styles.exportFmt}>.sdoc</span>
                    <span className={styles.exportTag}>nativo</span>
                  </button>
                  {(["PDF", "DOCX", "HTML"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      role="menuitem"
                      className={styles.exportItem}
                      onClick={() => handleExport(fmt)}
                    >
                      <span className={styles.exportFmt}>{fmt}</span>
                      <Arrow width={14} height={14} />
                    </button>
                  ))}
                  <button
                    role="menuitem"
                    className={styles.exportItem}
                    onClick={handleOpenSdoc}
                    style={{ borderTop: "1px dashed var(--color-border)", marginTop: 4, paddingTop: 8 }}
                  >
                    <span className={styles.exportFmt}>Abrir .sdoc…</span>
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              iconStart={<Sparkles width={16} height={16} />}
              onClick={() => setZen(true)}
              title={t("editor.zen")}
            >
              {t("editor.zen")}
            </Button>
          </div>
        </header>
      )}

      {zen && (
        <button
          type="button"
          className={styles.zenExit}
          onClick={() => setZen(false)}
          aria-label={t("editor.exitZen")}
        >
          <X width={18} height={18} />
        </button>
      )}

      <main className={styles.editorWrapper}>
        <div className={styles.editorInner}>
          <SdocEditor
            ydoc={ydoc}
            provider={provider}
            onUpdate={(content) => scheduleAutoSave(content)}
          />
        </div>
      </main>
    </div>
  );
}
