import { useThemeStore, Theme } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { Sun, Moon, Monitor } from "./Icon";
import styles from "./Toggle.module.css";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const t = useT();

  const options: { value: Theme; label: string; icon: JSX.Element }[] = [
    { value: "light", label: t("common.theme.light"), icon: <Sun width={16} height={16} /> },
    { value: "dark", label: t("common.theme.dark"), icon: <Moon width={16} height={16} /> },
    { value: "system", label: t("common.theme.system"), icon: <Monitor width={16} height={16} /> },
  ];

  return (
    <div className={styles.group} role="radiogroup" aria-label={t("common.theme.system")}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={theme === opt.value}
          aria-label={opt.label}
          title={opt.label}
          className={`${styles.option} ${theme === opt.value ? styles.active : ""}`}
          onClick={() => setTheme(opt.value)}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
