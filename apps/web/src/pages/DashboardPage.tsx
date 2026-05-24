import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../services/api";
import { useT } from "../lib/i18n";
import { formatRelative, formatBytes } from "../lib/format";
import { useLocaleStore } from "../lib/i18n";
import { AppShell } from "../components/AppShell/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Plus, Search, File, Users, Sparkles } from "../components/ui/Icon";
import { toast } from "../components/ui/Toast";
import type { Document } from "@sdoc/types";
import styles from "./DashboardPage.module.css";

type Filter = "all" | "recent" | "shared" | "archived";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.list(0, 50),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => documentsApi.create({ title }),
    onSuccess: (doc: Document) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento creado");
      navigate(`/app/documents/${doc.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(t("toast.deleted"));
    },
  });

  const allDocs: Document[] = data?.content ?? [];

  const documents = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allDocs;
    if (q) list = list.filter((d) => d.title.toLowerCase().includes(q));
    if (filter === "recent") {
      const oneWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((d) => new Date(d.updatedAt).getTime() > oneWeek);
    } else if (filter === "archived") {
      list = list.filter((d) => d.status === "ARCHIVED");
    }
    return list;
  }, [allDocs, search, filter]);

  function handleCreate() {
    createMutation.mutate(t("editor.untitled"));
  }

  return (
    <AppShell>
      <div className="sdoc-container">
        <header className={styles.pageHeader}>
          <div>
            <p className="sdoc-eyebrow">Tu espacio</p>
            <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
          </div>
          <Button
            variant="primary"
            size="md"
            iconStart={<Plus width={16} height={16} />}
            onClick={handleCreate}
            loading={createMutation.isPending}
          >
            {t("dashboard.create")}
          </Button>
        </header>

        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <Input
              type="search"
              placeholder={t("dashboard.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              iconStart={<Search width={18} height={18} />}
            />
          </div>

          <div className={styles.filterTabs} role="tablist" aria-label="Filtros">
            {(["all", "recent", "shared", "archived"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`${styles.filterTab} ${filter === f ? styles.filterActive : ""}`}
                onClick={() => setFilter(f)}
              >
                {t(`dashboard.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <DocumentGridSkeleton />
        ) : documents.length === 0 ? (
          allDocs.length === 0 ? (
            <EmptyState onCreate={handleCreate} loading={createMutation.isPending} />
          ) : (
            <div className={styles.emptyResult}>
              <p>No encontramos documentos para "{search}".</p>
            </div>
          )
        ) : (
          <ul className={styles.docGrid}>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                locale={locale}
                onOpen={() => navigate(`/app/documents/${doc.id}`)}
                onDelete={() => {
                  if (confirm(`¿Eliminar "${doc.title}"?`)) {
                    deleteMutation.mutate(doc.id);
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function DocumentCard({
  doc,
  locale,
  onOpen,
  onDelete,
}: {
  doc: Document;
  locale: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <li className={styles.docCard}>
      <button type="button" className={styles.docCardBody} onClick={onOpen}>
        <span className={styles.docIcon}>
          <File width={20} height={20} />
        </span>
        <div className={styles.docContent}>
          <h3 className={styles.docTitle}>{doc.title || t("editor.untitled")}</h3>
          <p className={styles.docPreview}>
            {(doc as any).description || "Sin contenido aún. Haz clic para empezar."}
          </p>
          <div className={styles.docMeta}>
            <span className={styles.docMetaItem}>
              {t("dashboard.card.updated", { when: formatRelative(doc.updatedAt, locale as any) })}
            </span>
            <span className={styles.docMetaDot} aria-hidden>·</span>
            <span className={styles.docMetaItem}>{(doc as any).wordCount ?? 0} palabras</span>
            <span className={styles.docMetaDot} aria-hidden>·</span>
            <span className={styles.docMetaItem}>{formatBytes((doc as any).sizeBytes ?? 0, locale as any)}</span>
          </div>
        </div>
      </button>
      <div className={styles.docActions}>
        <button
          type="button"
          className={styles.docAction}
          aria-label={t("dashboard.card.menu.delete")}
          onClick={onDelete}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </li>
  );
}

function DocumentGridSkeleton() {
  return (
    <ul className={styles.docGrid} aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className={`${styles.docCard} ${styles.skeleton}`}>
          <div className={styles.skTitle} />
          <div className={styles.skText} />
          <div className={styles.skText} style={{ width: "60%" }} />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ onCreate, loading }: { onCreate: () => void; loading: boolean }) {
  const t = useT();
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Sparkles width={28} height={28} />
      </span>
      <h2 className={styles.emptyTitle}>{t("dashboard.empty.title")}</h2>
      <p className={styles.emptyDesc}>{t("dashboard.empty.desc")}</p>
      <Button
        variant="primary"
        size="lg"
        iconStart={<Plus width={18} height={18} />}
        onClick={onCreate}
        loading={loading}
      >
        {t("dashboard.empty.cta")}
      </Button>
    </div>
  );
}
