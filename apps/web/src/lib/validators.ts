/**
 * Validadores — Colombia + internacionales.
 * Cédula, NIT con dígito de verificación DIAN, teléfono +57, RFC email.
 */

/** RFC 5322 simplificado, suficiente para UI. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** 6–10 dígitos. No valida lista oficial Registraduría. */
export function isCedula(value: string): boolean {
  const clean = value.replace(/[\s.-]/g, "");
  return /^\d{6,10}$/.test(clean);
}

/**
 * NIT Colombia con dígito de verificación (DIAN).
 * Acepta "900123456-7" o "900123456".
 * Si llega el dígito, lo valida con módulo 11 oficial.
 */
export function isNit(value: string): boolean {
  const clean = value.replace(/[\s.]/g, "");
  const match = clean.match(/^(\d{9,10})-?(\d)?$/);
  if (!match) return false;
  const base = match[1];
  const dv = match[2];
  if (dv === undefined) return true; // sin DV: solo formato
  return calcNitDv(base) === Number(dv);
}

/** Calcula dígito de verificación según DIAN — módulo 11 con pesos fijos. */
export function calcNitDv(nit: string): number {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digits = nit.replace(/\D/g, "").split("").reverse();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const mod = sum % 11;
  return mod < 2 ? mod : 11 - mod;
}

/** Teléfono Colombia móvil: +57 3XX XXX XXXX o local 3XXXXXXXXX. */
export function isPhoneCO(value: string): boolean {
  const clean = value.replace(/[\s()-]/g, "").replace(/^\+57/, "");
  return /^3\d{9}$/.test(clean);
}

/** Teléfono internacional E.164 — al menos 8 dígitos, máximo 15. */
export function isPhoneIntl(value: string): boolean {
  const clean = value.replace(/[\s()-]/g, "");
  return /^\+?\d{8,15}$/.test(clean);
}

/** Formatea teléfono CO para mostrar: "300 123 4567". */
export function formatPhoneCO(value: string): string {
  const clean = value.replace(/\D/g, "").replace(/^57/, "");
  if (clean.length !== 10) return value;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
}

/** Contraseña: 8+ chars, mayúscula, minúscula, número. */
export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
}

/** Score de fortaleza 0-4. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}
