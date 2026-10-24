import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Official H R Foundation emblem and logo (supplied by the foundation: doc/HR Foundation Community Emblem.png). */
export const brandAssets = {
  emblem: { src: "/brand/hr-foundation-emblem.png", width: 480, height: 319 },
  logo: { src: "/brand/hr-foundation-logo.png", width: 800, height: 542 },
  tagline: "People · Opportunity · Healthier Tomorrows",
} as const;

/** The emblem only (H R monogram). Decorative when shown next to the written name. */
export function BrandMark({ className, priority }: { className?: string; priority?: boolean }) {
  const { emblem } = brandAssets;
  return (
    <Image
      src={emblem.src}
      width={emblem.width}
      height={emblem.height}
      alt=""
      priority={priority}
      sizes="80px"
      className={cn("h-10 w-auto", className)}
    />
  );
}

/** The full logo lockup with name and tagline. Best on light backgrounds. */
export function BrandLogo({ className, sizes = "320px" }: { className?: string; sizes?: string }) {
  const { logo } = brandAssets;
  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt={`H R Foundation logo — ${brandAssets.tagline}`}
      sizes={sizes}
      className={cn("h-auto w-full", className)}
    />
  );
}

export function BrandLink({ tone = "dark", className, onClick }: { tone?: "dark" | "light"; className?: string; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className={cn("flex items-center gap-3 rounded-md", className)}>
      {tone === "dark" ? (
        <BrandMark priority />
      ) : (
        <span className="grid h-12 w-16 place-items-center rounded-xl bg-ivory">
          <BrandMark className="h-9" />
        </span>
      )}
      <span className="flex flex-col leading-none">
        <span className={cn("whitespace-nowrap font-display text-[1.05rem] font-extrabold tracking-tight", tone === "dark" ? "text-forest" : "text-ivory")}>
          H R Foundation
        </span>
        <span className={cn("mt-1 whitespace-nowrap text-[0.68rem] font-medium tracking-[0.14em] uppercase", tone === "dark" ? "text-muted" : "text-ivory/70")}>
          Telangana · India
        </span>
      </span>
    </Link>
  );
}
