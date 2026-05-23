import { useState, useRef, useEffect } from "react";
import { useLocaleStore, LOCALES, useT } from "../../lib/i18n";
import { Globe } from "./Icon";
import styles from "./LangSwitch.module.css";

export function LangSwitch() {
  const { locale, setLocale } = useLocaleStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale)!;

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("common.language")}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe width={16} height={16} />
        <span aria-hidden="true">{current.code.toUpperCase().slice(0, 2)}</span>
      </button>
      {open && (
        <ul className={styles.menu} role="listbox">
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                className={`${styles.item} ${l.code === locale ? styles.itemActive : ""}`}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
              >
                <span className={styles.flag} aria-hidden="true">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
