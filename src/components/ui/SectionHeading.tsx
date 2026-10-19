import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  index?: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "split";
  as?: "h1" | "h2";
  className?: string;
  id?: string;
};

/** Editorial section heading: optional numbered eyebrow, large title and intro. */
export function SectionHeading({ eyebrow, index, title, intro, tone = "light", align = "left", as: Tag = "h2", className, id }: Props) {
  const dark = tone === "dark";
  return (
    <div className={cn(align === "split" ? "grid gap-6 lg:grid-cols-12 lg:items-end" : "max-w-3xl", className)}>
      <div className={align === "split" ? "lg:col-span-7" : undefined}>
        {(eyebrow || index) && (
          <p className={cn("eyebrow mb-5 flex items-center gap-3", dark ? "text-gold" : "text-gold-ink")}>
            {index && <span className="tabular-nums">{index}</span>}
            {index && eyebrow && <span aria-hidden className={cn("h-px w-8", dark ? "bg-gold/60" : "bg-gold")} />}
            {eyebrow}
          </p>
        )}
        <Tag id={id} className={cn("display-lg", dark ? "text-ivory" : "text-forest")}>
          {title}
        </Tag>
      </div>
      {intro && (
        <div
          className={cn(
            align === "split" ? "lg:col-span-5 lg:pb-2" : "mt-6",
            "text-lg leading-relaxed",
            dark ? "text-ivory/80" : "text-muted",
          )}
        >
          {intro}
        </div>
      )}
    </div>
  );
}
