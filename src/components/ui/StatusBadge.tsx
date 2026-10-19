import type { ReactNode } from "react";
import { CircleCheck, Clock3, FileClock } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  confirmed: { cls: "bg-sage text-forest border-sage-deep", Icon: CircleCheck },
  pending: { cls: "bg-ivory-deep text-gold-ink border-gold/40", Icon: Clock3 },
  proposed: { cls: "bg-gold-soft/60 text-gold-ink border-gold/50", Icon: FileClock },
} as const;

export function StatusBadge({
  tone,
  children,
  className,
  onDark,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
  className?: string;
  onDark?: boolean;
}) {
  const { cls, Icon } = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        onDark ? "border-ivory/25 bg-ivory/10 text-gold" : cls,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}
