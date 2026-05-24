/**
 * Shell autenticado — navbar superior + menú usuario.
 * Reutilizable en Dashboard, Editor, Settings, Billing.
 */
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, ReactNode } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useT } from "../../lib/i18n";
import { Logo } from "../Brand/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LangSwitch } from "../ui/LangSwitch";
import { Cloud, WifiOff, User } from "../ui/Icon";
import { useOfflineStore } from "../../stores/offlineStore";
import styles from "./AppShell.module.css";

interface Props {
  children: ReactNode;
  /** Si false, ocupa todo el ancho (editor zen). */
  contained?: boolean;
}

export function AppShell({ children, contained = true }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isOnline = useOfflineStore((s) => s.isOnline);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const isApp = location.pathname.startsWith("/app");

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={`${contained ? "sdoc-container" : ""} ${styles.navInner}`}>
          <Link to="/app" className={styles.brand} aria-label="SDOC">
            <Logo variant="wordmark" size={26} />
          </Link>

          <nav className={styles.navLinks} aria-label="Aplicación">
            <Link to="/app" className={isApp ? styles.activeLink : ""}>{t("nav.dashboard")}</Link>
          </nav>

          <div className={styles.navActions}>
            <span
              className={`${styles.statusPill} ${isOnline ? styles.statusOnline : styles.statusOffline}`}
              title={isOnline ? "En línea" : "Sin conexión"}
            >
              {isOnline ? <Cloud width={14} height={14} /> : <WifiOff width={14} height={14} />}
              <span className={styles.statusText}>{isOnline ? "En línea" : "Offline"}</span>
            </span>

            <ThemeToggle />
            <LangSwitch />

            <div className={styles.userMenu} ref={menuRef}>
              <button
                type="button"
                className={styles.avatar}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menú de usuario"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {initials}
              </button>

              {menuOpen && (
                <div className={styles.menu} role="menu">
                  <div className={styles.menuHeader}>
                    <p className={styles.menuName}>{user?.fullName}</p>
                    <p className={styles.menuEmail}>{user?.email}</p>
                  </div>
                  <button type="button" className={styles.menuItem} role="menuitem" onClick={handleLogout}>
                    <User width={16} height={16} />
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
