import { Link } from "react-router-dom";
import { useT } from "../../lib/i18n";
import { Logo } from "../../components/Brand/Logo";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { LangSwitch } from "../../components/ui/LangSwitch";
import {
  Users,
  WifiOff,
  Download,
  Shield,
  Clock,
  Flag,
  Sparkles,
  Arrow,
  Check,
} from "../../components/ui/Icon";
import { PricingSection } from "../../components/Pricing/PricingSection";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <>
      <a href="#main" className="sdoc-skip-link">Saltar al contenido</a>

      <header className={styles.nav}>
        <div className={`sdoc-container ${styles.navInner}`}>
          <Link to="/" className={styles.brand} aria-label="SDOC inicio">
            <Logo variant="wordmark" size={28} />
          </Link>

          <nav className={styles.navLinks} aria-label="Principal">
            <a href="#features">{t("nav.features")}</a>
            <a href="#pricing">{t("nav.pricing")}</a>
            <a href="#docs">{t("nav.docs")}</a>
          </nav>

          <div className={styles.navActions}>
            <ThemeToggle />
            <LangSwitch />
            <Link to="/login" className={styles.signInLink}>{t("nav.signIn")}</Link>
            <Link to="/register">
              <Button variant="primary" size="sm">{t("nav.signUp")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* === HERO === */}
        <section className={styles.hero}>
          <div className="sdoc-container">
            <div className={styles.heroGrid}>
              <div className={styles.heroContent}>
                <p className="sdoc-eyebrow">
                  <Sparkles width={14} height={14} /> {t("hero.eyebrow")}
                </p>
                <h1 className={styles.heroTitle}>
                  {t("hero.title").split("\n").map((line, i) => (
                    <span key={i} className={styles.heroLine}>{line}</span>
                  ))}
                </h1>
                <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
                <div className={styles.heroCtas}>
                  <Link to="/register">
                    <Button variant="primary" size="lg" iconEnd={<Arrow width={18} height={18} />}>
                      {t("hero.cta.primary")}
                    </Button>
                  </Link>
                  <a href="#features">
                    <Button variant="ghost" size="lg">{t("hero.cta.secondary")}</Button>
                  </a>
                </div>
                <p className={styles.heroNote}>{t("hero.note")}</p>

                <div className={styles.heroMeta}>
                  <span className={styles.metaItem}>
                    <Flag width={14} height={14} /> {t("brand.madeIn")}
                  </span>
                  <span className={styles.metaDot} aria-hidden="true">·</span>
                  <span className={styles.metaItem}>
                    <Shield width={14} height={14} /> Habeas Data
                  </span>
                  <span className={styles.metaDot} aria-hidden="true">·</span>
                  <span className={styles.metaItem}>
                    <Check width={14} height={14} /> GDPR
                  </span>
                </div>
              </div>

              <div className={styles.heroVisual} aria-hidden="true">
                <div className={styles.mockup}>
                  <div className={styles.mockupChrome}>
                    <span /><span /><span />
                  </div>
                  <div className={styles.mockupContent}>
                    <div className={styles.mockTitle}>El arte de pensar despacio</div>
                    <div className={styles.mockMeta}>
                      <span className={styles.savedDot} /> {t("editor.saved")}
                    </div>
                    <div className={styles.mockBody}>
                      <p>SDOC es donde las ideas dejan de ser borrador. Cada palabra encuentra su lugar.</p>
                      <p>Las mejores cosas que he escrito sucedieron en silencio, con la lluvia afuera y un cursor parpadeando.</p>
                      <div className={styles.mockBlock}>
                        <span className={styles.mockBlockTag}>Capítulo 3</span>
                        <p className={styles.mockBlockText}>Una herramienta no se nota cuando es la correcta. Desaparece, y solo queda la voz.</p>
                      </div>
                    </div>
                    <div className={styles.mockCursors}>
                      <span className={styles.cursor} style={{ background: "#F59E0B" }}>MC</span>
                      <span className={styles.cursor} style={{ background: "#0EA5E9" }}>JD</span>
                      <span className={styles.cursor} style={{ background: "#10B981" }}>AR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* === SOCIAL PROOF === */}
        <section className={styles.proof}>
          <div className="sdoc-container">
            <p className={styles.proofLabel}>Usado por equipos en</p>
            <div className={styles.proofLogos}>
              <span>Universidad Nacional</span>
              <span>EAFIT</span>
              <span>Andes</span>
              <span>Javeriana</span>
              <span>ICESI</span>
              <span>Rosario</span>
            </div>
          </div>
        </section>

        {/* === FEATURES === */}
        <section id="features" className={styles.features}>
          <div className="sdoc-container-narrow">
            <p className="sdoc-eyebrow" style={{ justifyContent: "center" }}>
              {t("features.eyebrow")}
            </p>
            <h2 className={styles.sectionTitle}>
              {t("features.title").split("\n").map((line, i) => (
                <span key={i} className={styles.titleLine}>{line}</span>
              ))}
            </h2>
          </div>

          <div className={`sdoc-container ${styles.featuresGrid}`}>
            {[
              { icon: Users, key: "collab" },
              { icon: WifiOff, key: "offline" },
              { icon: Download, key: "export" },
              { icon: Shield, key: "security" },
              { icon: Clock, key: "version" },
              { icon: Flag, key: "dian" },
            ].map(({ icon: Icon, key }) => (
              <article key={key} className={styles.featureCard}>
                <span className={styles.featureIcon}>
                  <Icon width={22} height={22} />
                </span>
                <h3 className={styles.featureTitle}>{t(`feature.${key}.title`)}</h3>
                <p className={styles.featureDesc}>{t(`feature.${key}.desc`)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* === PRICING === */}
        <PricingSection />

        {/* === FINAL CTA === */}
        <section className={styles.finalCta}>
          <div className="sdoc-container-narrow" style={{ textAlign: "center" }}>
            <h2 className={styles.sectionTitle}>Lo siguiente que escribas,<br />que sea en SDOC.</h2>
            <p className={styles.finalCtaSub}>{t("hero.subtitle")}</p>
            <div style={{ display: "inline-flex", gap: "0.75rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
              <Link to="/register">
                <Button variant="primary" size="lg" iconEnd={<Arrow width={18} height={18} />}>
                  {t("hero.cta.primary")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`sdoc-container ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <Logo variant="wordmark" size={28} />
            <p className={styles.footerTagline}>{t("brand.tagline")}.</p>
          </div>

          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <h4>{t("footer.product")}</h4>
              <a href="#features">{t("footer.features")}</a>
              <a href="#pricing">{t("footer.pricing")}</a>
              <a href="#docs">{t("footer.changelog")}</a>
            </div>
            <div className={styles.footerCol}>
              <h4>{t("footer.company")}</h4>
              <a href="#">{t("footer.about")}</a>
              <a href="#">{t("footer.blog")}</a>
              <a href="#">{t("footer.careers")}</a>
            </div>
            <div className={styles.footerCol}>
              <h4>{t("footer.legal")}</h4>
              <a href="#">{t("footer.privacy")}</a>
              <a href="#">{t("footer.terms")}</a>
              <a href="#">{t("footer.habeas")}</a>
            </div>
            <div className={styles.footerCol}>
              <h4>{t("footer.support")}</h4>
              <a href="#">{t("footer.contact")}</a>
              <a href="#">{t("footer.status")}</a>
            </div>
          </div>
        </div>

        <div className={`sdoc-container ${styles.footerBottom}`}>
          <p>{t("footer.copyright", { year })}</p>
        </div>
      </footer>
    </>
  );
}
