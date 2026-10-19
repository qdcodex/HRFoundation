"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { donation } from "@/content/donation";
import { buttonClasses } from "@/components/ui/Button";

/** UPI donation panel: approved QR code, copyable UPI ID and a deep link for phones. */
export function DonationPanel() {
  const { upi } = donation;
  const [copied, setCopied] = useState(false);

  if (!upi.enabled) return null;

  const upiLink = `upi://pay?pa=${encodeURIComponent(upi.upiId)}&pn=${encodeURIComponent(upi.payeeName)}&cu=INR`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(upi.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_60px_-40px_rgba(14,42,34,0.6)] ring-1 ring-line">
      <div className="flex items-center justify-between bg-forest px-6 py-4 text-ivory">
        <p className="font-display font-bold">Scan & pay with any UPI app</p>
        <span className="rounded-full bg-ivory/10 px-3 py-1 text-xs font-semibold text-gold">UPI</span>
      </div>
      <div className="grid gap-8 p-6 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center sm:p-8">
        <div className="mx-auto w-full max-w-[15rem] overflow-hidden rounded-2xl border border-line bg-white">
          {/* The QR image is shown exactly as supplied by the foundation. */}
          <Image src={upi.qrImage} alt={upi.qrAlt} width={682} height={798} sizes="240px" className="h-auto w-full" priority />
        </div>
        <div>
          <p className="text-sm text-muted">Donating to</p>
          <p className="font-display text-xl font-bold text-forest">{upi.payeeName}</p>
          <p className="mt-4 text-sm text-muted" id="upi-id-label">
            UPI ID
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <code aria-labelledby="upi-id-label" className="rounded-lg bg-sage px-3 py-2 font-mono text-[0.95rem] font-semibold text-forest">
              {upi.upiId}
            </code>
            <button type="button" onClick={copy} className={buttonClasses("outline", "md", "h-10 px-4")}>
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              {copied ? "Copied" : "Copy UPI ID"}
            </button>
          </div>
          <span aria-live="polite" className="sr-only">
            {copied ? "UPI ID copied to clipboard" : ""}
          </span>
          <a href={upiLink} className={buttonClasses("primary", "lg", "mt-6 w-full sm:hidden")}>
            <Smartphone aria-hidden className="size-4" />
            Pay with a UPI app
          </a>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Before you pay, check that the UPI ID in your app is exactly <strong className="font-mono">{upi.upiId}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
