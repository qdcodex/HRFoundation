/** Money is stored as integer paise. Never use floating-point arithmetic for amounts. */

export function formatPaise(paise: number | null | undefined, opts: { decimals?: boolean } = {}) {
  if (paise === null || paise === undefined) return "—";
  const showDecimals = opts.decimals ?? paise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(paise / 100);
}

/** Parses "2,00,000", "1500.50" or "₹ 750" into integer paise. Returns null when invalid. */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  return rupees * 100 + paise;
}

export function paiseToRupeesInput(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return "";
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return p ? `${r}.${String(p).padStart(2, "0")}` : String(r);
}
