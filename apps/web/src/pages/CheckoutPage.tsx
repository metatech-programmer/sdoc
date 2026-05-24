/**
 * Checkout mock — UI completa de pago Colombia + global.
 * No procesa pagos reales; muestra flujo realista para demo.
 */
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useT, useLocaleStore } from "../lib/i18n";
import { formatCurrency, calcInvoice, type Currency } from "../lib/format";
import { isCedula, isNit, isPhoneCO } from "../lib/validators";
import { AppShell } from "../components/AppShell/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Check, Lock, Arrow, Shield } from "../components/ui/Icon";
import { toast } from "../components/ui/Toast";
import styles from "./CheckoutPage.module.css";

type Method =
  | "pse"
  | "nequi"
  | "daviplata"
  | "bancolombia"
  | "card"
  | "stripe";

const PLAN_PRICES: Record<string, { name: string; monthly: number }> = {
  pro: { name: "SDOC Pro", monthly: 39_000 },
  team: { name: "SDOC Equipo", monthly: 119_000 },
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);

  const planKey = (search.get("plan") || "pro") as keyof typeof PLAN_PRICES;
  const plan = PLAN_PRICES[planKey] ?? PLAN_PRICES.pro;

  const [method, setMethod] = useState<Method>("pse");
  const [currency] = useState<Currency>("COP");
  const [docType, setDocType] = useState<"CC" | "CE" | "NIT">("CC");
  const [docNumber, setDocNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const breakdown = calcInvoice(plan.monthly, currency);

  const methods: { id: Method; label: string; tag: string; sub: string }[] = [
    { id: "pse", label: "PSE", tag: "Recomendado", sub: "Cuenta bancaria · Bancos Colombia" },
    { id: "nequi", label: "Nequi", tag: "Instantáneo", sub: "Paga desde la app Nequi" },
    { id: "daviplata", label: "Daviplata", tag: "Instantáneo", sub: "Paga con tu Daviplata" },
    { id: "bancolombia", label: "Botón Bancolombia", tag: "", sub: "Cuenta Bancolombia directa" },
    { id: "card", label: "Tarjeta crédito/débito", tag: "Visa · MC · Amex", sub: "Procesado por Wompi" },
    { id: "stripe", label: "Pago internacional", tag: "Stripe", sub: "Tarjetas no colombianas" },
  ];

  function validate(): boolean {
    const e: Record<string, string> = {};

    if (["pse", "nequi", "daviplata", "bancolombia"].includes(method)) {
      if (!docNumber) e.docNumber = "Requerido";
      else if (docType === "NIT" ? !isNit(docNumber) : !isCedula(docNumber)) {
        e.docNumber = `${docType} no válido`;
      }
      if (!phone) e.phone = "Requerido";
      else if (!isPhoneCO(phone)) e.phone = "Celular no válido (10 dígitos)";
    } else if (method === "card") {
      if (!/^\d{13,19}$/.test(card.number.replace(/\s/g, ""))) e.cardNumber = "Número no válido";
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = "MM/AA";
      if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = "CVC no válido";
      if (!card.name.trim()) e.name = "Requerido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePay(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // Mock: simula latencia
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    toast.success("¡Pago procesado! (modo demo — no se realizó cobro real)");
    setTimeout(() => navigate("/app"), 1200);
  }

  return (
    <AppShell>
      <div className={`sdoc-container ${styles.wrap}`}>
        <Link to="/" className={styles.backLink}>
          ← Volver
        </Link>

        <div className={styles.grid}>
          <form onSubmit={handlePay} className={styles.form} noValidate>
            <h1 className={styles.title}>{t("pay.method.title")}</h1>
            <p className={styles.subtitle}>
              Pago seguro · Tu información viaja cifrada extremo a extremo.
            </p>

            <fieldset className={styles.methodGroup}>
              <legend className="sr-only">Método de pago</legend>
              {methods.map((m) => (
                <label
                  key={m.id}
                  className={`${styles.method} ${method === m.id ? styles.methodActive : ""}`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    className={styles.methodRadio}
                  />
                  <span className={styles.methodCheck}>
                    {method === m.id && <Check width={14} height={14} />}
                  </span>
                  <span className={styles.methodInfo}>
                    <span className={styles.methodHead}>
                      <strong>{m.label}</strong>
                      {m.tag && <span className={styles.methodTag}>{m.tag}</span>}
                    </span>
                    <span className={styles.methodSub}>{m.sub}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {["pse", "nequi", "daviplata", "bancolombia"].includes(method) && (
              <div className={styles.fields}>
                <div className={styles.fieldsRow}>
                  <div className={styles.docTypeWrap}>
                    <label className={styles.fieldLabel}>Tipo</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className={styles.docTypeSelect}
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="NIT">NIT</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input
                      label={`Número de ${docType === "NIT" ? "NIT" : "documento"}`}
                      placeholder={docType === "NIT" ? "900123456-7" : "1023456789"}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      inputMode="numeric"
                      error={errors.docNumber}
                    />
                  </div>
                </div>

                <Input
                  label="Celular"
                  placeholder="300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  error={errors.phone}
                  hint="Para confirmación del pago"
                />
              </div>
            )}

            {method === "card" && (
              <div className={styles.fields}>
                <Input
                  label="Número de tarjeta"
                  placeholder="4242 4242 4242 4242"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: e.target.value })}
                  inputMode="numeric"
                  error={errors.cardNumber}
                />
                <div className={styles.fieldsRow}>
                  <Input
                    label="Vencimiento"
                    placeholder="MM/AA"
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                    error={errors.expiry}
                  />
                  <Input
                    label="CVC"
                    placeholder="123"
                    value={card.cvc}
                    onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                    error={errors.cvc}
                  />
                </div>
                <Input
                  label="Nombre en la tarjeta"
                  placeholder="MARIA C RESTREPO"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                  error={errors.name}
                />
              </div>
            )}

            {method === "stripe" && (
              <div className={styles.stripeBox}>
                <Lock width={20} height={20} />
                <div>
                  <p>Serás redirigido a Stripe para completar el pago de forma segura.</p>
                  <p className={styles.stripeNote}>(Modo demo — no se realiza cobro real)</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              iconEnd={!loading ? <Arrow width={18} height={18} /> : undefined}
            >
              {loading
                ? "Procesando…"
                : t("pay.button.pay", { amount: formatCurrency(breakdown.total, currency, locale) })}
            </Button>

            <p className={styles.secure}>
              <Shield width={14} height={14} /> {t("pay.secure")}
            </p>
          </form>

          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>{t("pay.summary.title")}</h2>

            <div className={styles.summaryItem}>
              <span className={styles.itemName}>{plan.name}</span>
              <span className={styles.itemSub}>Suscripción mensual</span>
            </div>

            <dl className={styles.totals}>
              <div className={styles.totalRow}>
                <dt>{t("pay.summary.subtotal")}</dt>
                <dd>{formatCurrency(breakdown.subtotal, currency, locale)}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>{t("pay.summary.iva")}</dt>
                <dd>{formatCurrency(breakdown.iva, currency, locale)}</dd>
              </div>
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <dt>{t("pay.summary.total")}</dt>
                <dd>{formatCurrency(breakdown.total, currency, locale)}</dd>
              </div>
            </dl>

            <div className={styles.guarantee}>
              <Check width={16} height={16} />
              <span>Cancela cuando quieras, sin penalizaciones.</span>
            </div>
            <div className={styles.guarantee}>
              <Check width={16} height={16} />
              <span>Factura electrónica DIAN incluida.</span>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
