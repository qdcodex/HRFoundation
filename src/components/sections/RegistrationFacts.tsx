import { registration } from "@/content/site";
import { cn } from "@/lib/utils";

/** Verified registration details, displayed as a definition list. */
export function RegistrationFacts({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  const items = registration.filter((r) => r.show);
  return (
    <dl className={cn("divide-y", dark ? "divide-ivory/15" : "divide-line", className)}>
      {items.map((item) => (
        <div key={item.label} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6">
          <dt className={cn("text-sm font-medium", dark ? "text-ivory/65" : "text-muted")}>{item.label}</dt>
          <dd className={cn("font-display font-semibold", dark ? "text-ivory" : "text-forest")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
