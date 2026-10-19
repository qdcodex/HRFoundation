import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { statusLabels, type Service } from "@/content/services";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/**
 * Editorial index of services: full-width rows rather than a grid of identical cards.
 * Each row is a single link with a numbered index, icon, status and summary.
 */
export function ServiceIndex({ services, tone = "dark", startIndex = 1 }: { services: Service[]; tone?: "dark" | "light"; startIndex?: number }) {
  const dark = tone === "dark";
  return (
    <ul className={cn("border-t", dark ? "border-ivory/15" : "border-line")}>
      {services.map((service, i) => (
        <li key={service.slug}>
          <Reveal delay={i * 0.05}>
            <ServiceRow service={service} index={startIndex + i} dark={dark} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

function ServiceRow({ service, index, dark }: { service: Service; index: number; dark: boolean }) {
  const status = statusLabels[service.status];
  return (
    <Link
      href={service.href}
      className={cn(
        "group relative grid grid-cols-[auto_1fr_auto] items-start gap-x-5 gap-y-3 border-b px-1 py-8 transition-colors sm:gap-x-8 md:grid-cols-[4rem_4rem_1fr_1.1fr_auto] md:items-center md:px-4 lg:py-10",
        dark ? "border-ivory/15 hover:bg-forest-soft" : "border-line hover:bg-white",
      )}
    >
      <span className={cn("hidden font-display text-sm font-bold tabular-nums md:block", dark ? "text-gold" : "text-gold-ink")}>
        {String(index).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "grid size-14 place-items-center rounded-t-full rounded-b-lg transition-colors md:size-16",
          dark ? "bg-ivory/8 text-ivory group-hover:bg-ivory/12" : "bg-sage text-forest",
        )}
      >
        <ServiceIcon name={service.icon} className="size-9 md:size-10" />
      </span>
      <span className="min-w-0">
        <span className={cn("block font-display text-xl font-bold tracking-tight sm:text-2xl", dark ? "text-ivory" : "text-forest")}>
          {service.title}
        </span>
        <StatusBadge tone={status.tone} onDark={dark} className="mt-3">
          {status.label}
        </StatusBadge>
      </span>
      <span className={cn("col-span-3 text-[0.98rem] leading-relaxed md:col-span-1", dark ? "text-ivory/75" : "text-muted")}>
        {service.summary}
      </span>
      <span
        className={cn(
          "col-start-3 row-start-1 grid size-11 place-items-center rounded-full border transition-all md:col-start-auto md:row-start-auto",
          dark
            ? "border-ivory/25 text-ivory group-hover:border-gold group-hover:bg-gold group-hover:text-forest-deep"
            : "border-forest/25 text-forest group-hover:bg-forest group-hover:text-ivory",
        )}
      >
        <ArrowUpRight aria-hidden className="size-5 transition-transform group-hover:rotate-45" />
        <span className="sr-only">Learn more about {service.title}</span>
      </span>
    </Link>
  );
}
