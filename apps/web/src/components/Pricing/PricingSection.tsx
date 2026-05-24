import { useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../../lib/i18n";
import { formatCurrency, convertFromCOP, calcInvoice, type Currency } from "../../lib/format";
import { Button } from "../ui/Button";
import { Check } from "../ui/Icon";
import styles from "./PricingSection.module.css";

type BillingCycle = "monthly" | "yearly";

interface Plan {
  key: "free" | "pro" | "team";
  monthlyCOP: number;
  yearlyCOP: number;
  highlight?: boolean;
  features: number; // count of features in i18n
}

const PLANS: Plan[] = [
  { key: "free", monthlyCOP: 0, yearlyCOP: 0, features: 4 },
  { key: "pro", monthlyCOP: 39_000, yearlyCOP: 374_400, highlight: true, features: 6 },
  { key: "team", monthlyCOP: 119_000, yearlyCOP: 1_142_400, features: 6 },
];

export function PricingSection() {
  const t = useT();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<Currency>("COP");

  return (
    <section id="pricing" className={styles.section}>
      <div className="sdoc-container-narrow" style={{ textAlign: "center" }}>
        <p className="sdoc-eyebrow" style={{ justifyContent: "center" }}>
          {t("pricing.eyebrow")}
        </p>
        <h2 className={styles.title}>
          {t("pricing.title").split("\n").map((line, i) => (
            <span key={i} className={styles.titleLine}>{line}</span>
          ))}
        </h2>
        <p className={styles.subtitle}>{t("pricing.subtitle")}</p>

        <div className={styles.controls}>
          <div className={styles.cycleToggle} role="radiogroup" aria-label="Ciclo">
            <button
              type="button"
              role="radio"
              aria-checked={cycle === "monthly"}
              className={`${styles.cycleBtn} ${cycle === "monthly" ? styles.cycleActive : ""}`}
              onClick={() => setCycle("monthly")}
            >
              {t("pricing.toggle.monthly")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={cycle === "yearly"}
              className={`${styles.cycleBtn} ${cycle === "yearly" ? styles.cycleActive : ""}`}
              onClick={() => setCycle("yearly")}
            >
              {t("pricing.toggle.yearly")}
              <span className={styles.saveTag}>{t("pricing.toggle.save")}</span>
            </button>
          </div>

          <button
            type="button"
            className={styles.currencyBtn}
            onClick={() => setCurrency(currency === "COP" ? "USD" : "COP")}
          >
            {currency === "COP" ? t("pricing.currency.switch") : "Ver en COP"}
          </button>
        </div>
      </div>

      <div className={`sdoc-container ${styles.grid}`}>
        {PLANS.map((plan) => {
          const amountCOP = cycle === "monthly" ? plan.monthlyCOP : plan.yearlyCOP;
          const amount = convertFromCOP(amountCOP, currency);
          const breakdown = amountCOP > 0 ? calcInvoice(amountCOP) : null;
          const period = cycle === "monthly" ? "/mes" : "/año";
          const featureKeys = Array.from({ length: plan.features }, (_, i) => i + 1);

          return (
            <article
              key={plan.key}
              className={`${styles.card} ${plan.highlight ? styles.cardHighlight : ""}`}
            >
              {plan.highlight && (
                <span className={styles.badge}>{t("pricing.most.popular")}</span>
              )}

              <header className={styles.cardHeader}>
                <h3 className={styles.planName}>{t(`plan.${plan.key}.name`)}</h3>
                <p className={styles.planDesc}>{t(`plan.${plan.key}.desc`)}</p>
              </header>

              <div className={styles.price}>
                {amountCOP === 0 ? (
                  <span className={styles.priceAmount}>Gratis</span>
                ) : (
                  <>
                    <span className={styles.priceAmount}>{formatCurrency(amount, currency)}</span>
                    <span className={styles.pricePeriod}>{period}</span>
                  </>
                )}
              </div>

              {breakdown && currency === "COP" && (
                <p className={styles.priceBreakdown}>
                  Subtotal {formatCurrency(breakdown.subtotal, "COP")} + IVA{" "}
                  {formatCurrency(breakdown.iva, "COP")}
                </p>
              )}

              <Link to="/register" className={styles.cta}>
                <Button
                  variant={plan.highlight ? "primary" : "outline"}
                  size="md"
                  fullWidth
                >
                  {t("pricing.cta.start")}
                </Button>
              </Link>

              <ul className={styles.features}>
                {featureKeys.map((i) => (
                  <li key={i} className={styles.featureItem}>
                    <Check width={16} height={16} className={styles.featureCheck} />
                    <span>{t(`plan.${plan.key}.feat.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <div className={`sdoc-container ${styles.payMethods}`}>
        <p className={styles.payMethodsLabel}>Métodos de pago disponibles</p>
        <div className={styles.payList}>
          {["PSE", "Nequi", "Daviplata", "Bancolombia", "Visa", "Mastercard", "Amex", "Stripe"].map((m) => (
            <span key={m} className={styles.payChip}>{m}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
