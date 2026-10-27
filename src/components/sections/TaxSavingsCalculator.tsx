"use client";

import { useId, useState } from "react";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const SLABS = [
  { rate: 0.05, label: "5%" },
  { rate: 0.2, label: "20%" },
  { rate: 0.3, label: "30%" },
];
const CESS = 0.04;
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

/**
 * Estimates income tax saved on a donation under section 80G (50% deduction, subject to the
 * qualifying limit of 10% of adjusted gross total income), for the old tax regime.
 * An estimate only: surcharge, rebates and other deductions are ignored.
 */
export function TaxSavingsCalculator({ presets }: { presets: readonly number[] }) {
  const id = useId();
  const [amount, setAmount] = useState(String(presets[1] ?? 1000));
  const [slab, setSlab] = useState(0.3);
  const [income, setIncome] = useState("");

  const donation = Math.max(0, Number(amount) || 0);
  const gti = Math.max(0, Number(income) || 0);
  const limit = gti > 0 ? gti * 0.1 : Infinity;
  const qualifying = Math.min(donation, limit);
  const deduction = qualifying * 0.5;
  const saved = deduction * slab * (1 + CESS);
  const capped = gti > 0 && donation > limit;

  return (
    <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-forest">
        <Calculator aria-hidden className="size-5 text-gold-ink" /> How much tax could you save?
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-amount`} className="mb-2 block font-display text-[0.95rem] font-semibold text-forest">
            Donation amount (₹)
          </label>
          <input
            id={`${id}-amount`}
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="block w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-forest focus:ring-3 focus:ring-gold/40 focus:outline-none"
          />
        </div>
        <fieldset>
          <legend className="mb-2 font-display text-[0.95rem] font-semibold text-forest">Your income-tax slab</legend>
          <div className="flex gap-2">
            {SLABS.map((s) => (
              <button
                key={s.rate}
                type="button"
                aria-pressed={slab === s.rate}
                onClick={() => setSlab(s.rate)}
                className={cn(
                  "h-12 flex-1 rounded-xl border font-display font-semibold transition-colors",
                  slab === s.rate ? "border-forest bg-forest text-ivory" : "border-line bg-white text-forest hover:border-forest",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-income`} className="mb-2 block font-display text-[0.95rem] font-semibold text-forest">
            Annual taxable income before this deduction (₹) <span className="font-sans text-xs font-normal text-muted">optional — applies the 10% limit</span>
          </label>
          <input
            id={`${id}-income`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="e.g. 1200000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="block w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-forest focus:ring-3 focus:ring-gold/40 focus:outline-none"
          />
        </div>
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-3" aria-live="polite">
        <div className="bg-ivory p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">You donate</dt>
          <dd className="mt-1 font-display text-xl font-bold text-forest">{inr(donation)}</dd>
        </div>
        <div className="bg-ivory p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">80G deduction (50%)</dt>
          <dd className="mt-1 font-display text-xl font-bold text-forest">{inr(deduction)}</dd>
        </div>
        <div className="bg-sage p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Estimated tax saved</dt>
          <dd className="mt-1 font-display text-2xl font-extrabold text-emerald-ink">{inr(saved)}</dd>
        </div>
      </dl>
      {capped && (
        <p className="mt-3 text-sm text-gold-ink">
          Only {inr(limit)} of your donation counts (10% of the income you entered); the rest does not reduce your tax.
        </p>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Estimate for the <strong>old tax regime</strong>, including 4% health &amp; education cess; surcharge and other deductions are not included. The
        new tax regime does not allow 80G deductions. Please confirm with your tax adviser.
      </p>
    </div>
  );
}
