/** Display formatting in Indian English / IST. */

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? "UTC" : "Asia/Kolkata" }).format(d);
}

export function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
}

/** Masks a mobile number for roles that may see that a number exists but not the number itself. */
export function maskMobile(mobile: string | null | undefined) {
  if (!mobile) return "—";
  return `${mobile.slice(0, 2)}xxxxxx${mobile.slice(-2)}`;
}
