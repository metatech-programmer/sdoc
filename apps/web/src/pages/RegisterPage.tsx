import { useState, type FormEvent, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { useT } from "../lib/i18n";
import { isEmail, isStrongPassword, passwordStrength } from "../lib/validators";
import { Logo } from "../components/Brand/Logo";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { LangSwitch } from "../components/ui/LangSwitch";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Arrow } from "../components/ui/Icon";
import { toast } from "../components/ui/Toast";
import styles from "./AuthPage.module.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const t = useT();
  const { setTokens, setUser } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const strengthLabels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Excelente"];
  const strengthColors = ["#DC2626", "#F59E0B", "#FBBF24", "#16A34A", "#15803D"];

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t("auth.error.required");
    if (!email) e.email = t("auth.error.required");
    else if (!isEmail(email)) e.email = t("auth.error.invalidEmail");
    if (!password) e.password = t("auth.error.required");
    else if (!isStrongPassword(password)) e.password = t("auth.error.shortPassword");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({ email, password, fullName });
      const data = await authApi.login(email, password);
      setTokens(data.accessToken, data.refreshToken);
      const user = await authApi.me();
      setUser(user);
      toast.success(`¡Bienvenido a Folio, ${user.fullName.split(" ")[0]}!`);
      navigate("/app");
    } catch {
      setErrors({ form: t("auth.error.generic") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" aria-label="Folio inicio" className={styles.brandLink}>
          <Logo variant="wordmark" size={26} />
        </Link>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <LangSwitch />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.split}>
          <section className={styles.formSide}>
            <div className={styles.formCard}>
              <h1 className={styles.title}>{t("auth.signUp.title")}</h1>
              <p className={styles.subtitle}>{t("auth.signUp.subtitle")}</p>

              {errors.form && (
                <div role="alert" className={styles.formError}>
                  {errors.form}
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <Input
                  type="text"
                  label={t("auth.field.name")}
                  placeholder={t("auth.placeholder.name")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  iconStart={<UserIcon width={18} height={18} />}
                  error={errors.fullName}
                />

                <Input
                  type="email"
                  label={t("auth.field.email")}
                  placeholder={t("auth.placeholder.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  required
                  iconStart={<Mail width={18} height={18} />}
                  error={errors.email}
                />

                <div>
                  <Input
                    type={showPw ? "text" : "password"}
                    label={t("auth.field.password")}
                    placeholder={t("auth.placeholder.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    iconStart={<Lock width={18} height={18} />}
                    iconEnd={
                      <button
                        type="button"
                        aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                        onClick={() => setShowPw(!showPw)}
                        style={{
                          display: "inline-flex",
                          background: "transparent",
                          color: "var(--color-text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        {showPw ? <EyeOff width={18} height={18} /> : <Eye width={18} height={18} />}
                      </button>
                    }
                    error={errors.password}
                    hint={!errors.password && password.length > 0 ? strengthLabels[strength] : undefined}
                  />
                  {password.length > 0 && (
                    <div className={styles.strengthBar} aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          style={{
                            background: i < strength ? strengthColors[strength] : "var(--color-border)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  iconEnd={!loading ? <Arrow width={18} height={18} /> : undefined}
                >
                  {loading ? t("auth.loading") : t("auth.submit.signUp")}
                </Button>

                <p className={styles.terms}>{t("auth.terms")}</p>
              </form>

              <p className={styles.altPrompt}>
                {t("auth.hasAccount")} <Link to="/login" className={styles.altLink}>{t("nav.signIn")}</Link>
              </p>
            </div>
          </section>

          <aside className={styles.proseSide} aria-hidden="true">
            <blockquote className={styles.quote}>
              <p>"Un escritor es alguien para quien escribir es más difícil que para los demás."</p>
              <footer>— Thomas Mann</footer>
            </blockquote>
          </aside>
        </div>
      </main>
    </div>
  );
}
