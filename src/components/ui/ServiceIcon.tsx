import type { ServiceIcon as IconKey } from "@/content/services";
import { cn } from "@/lib/utils";

/** Custom line icons for each service. Stroke uses currentColor; accents use the gold token. */
export function ServiceIcon({ name, className }: { name: IconKey; className?: string }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("size-12", className),
    "aria-hidden": true,
  };

  switch (name) {
    case "education":
      return (
        <svg {...common}>
          <path d="M14 18a10 10 0 0 1 20 0" stroke="var(--color-gold)" />
          <path d="M24 6v3M13.4 10.4l2 2M34.6 10.4l-2 2" stroke="var(--color-gold)" />
          <path d="M24 25c-4-2.6-9.6-3.5-17-3v18c7.4-.5 13 .4 17 3 4-2.6 9.6-3.5 17-3V22c-7.4-.5-13 .4-17 3Z" />
          <path d="M24 25v18" />
          <path d="M11 28c3.4 0 6.2.5 8.6 1.5M11 33c3.4 0 6.2.5 8.6 1.5" opacity=".55" />
        </svg>
      );
    case "medical":
      return (
        <svg {...common}>
          <path d="M24 41s-15-8.6-15-20.4A8.6 8.6 0 0 1 24 15a8.6 8.6 0 0 1 15 5.6C39 32.4 24 41 24 41Z" />
          <path d="M24 21v10M19 26h10" stroke="var(--color-gold)" strokeWidth={2.2} />
        </svg>
      );
    case "community":
      return (
        <svg {...common}>
          <path d="M6 42V27a6 6 0 0 1 12 0v15M18 42V22a6 6 0 0 1 12 0v20M30 42V27a6 6 0 0 1 12 0v15" />
          <path d="M4 42h40" />
          <path d="M24 13c0-4 3-7 7-7 0 4-3 7-7 7Zm0 0c0-3-2.3-5.4-5.4-5.4 0 3 2.4 5.4 5.4 5.4Z" stroke="var(--color-gold)" />
        </svg>
      );
    case "membership":
      return (
        <svg {...common}>
          <path d="M24 5 9 10.5v11.2C9 31.6 15.4 39.6 24 43c8.6-3.4 15-11.4 15-21.3V10.5L24 5Z" />
          <circle cx="24" cy="20" r="4.2" stroke="var(--color-gold)" />
          <path d="M16.5 32.5c1.6-3.6 4.4-5.5 7.5-5.5s5.9 1.9 7.5 5.5" stroke="var(--color-gold)" />
        </svg>
      );
  }
}
