import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "border-line bg-ivory text-charcoal",
      success: "border-emerald/30 bg-sage text-forest",
      warning: "border-gold/50 bg-gold-soft/50 text-gold-ink",
      danger: "border-danger/30 bg-danger/10 text-danger",
      info: "border-sky-200 bg-sky-50 text-sky-800",
      dark: "border-forest bg-forest text-ivory",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

/** Maps domain statuses to badge tones in one place. */
export const STATUS_TONES: Record<string, Tone> = {
  // membership
  draft: "neutral",
  pending_payment: "warning",
  payment_verification: "info",
  pending_approval: "info",
  active: "success",
  rejected: "danger",
  suspended: "danger",
  // payments / donations
  pending: "warning",
  verification_pending: "info",
  verified: "success",
  failed: "danger",
  cancelled: "neutral",
  refunded: "neutral",
  // claims
  submitted: "info",
  under_review: "info",
  info_required: "warning",
  approved: "success",
  payment_pending: "warning",
  paid: "success",
  closed: "neutral",
  // tracker
  in_progress: "info",
  completed: "success",
  not_eligible: "danger",
  inactive: "neutral",
  requires_review: "warning",
  // enquiries / content
  new: "warning",
  responded: "success",
  published: "success",
  issued: "success",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label}</Badge>;
}
