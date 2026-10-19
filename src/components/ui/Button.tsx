import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "outline" | "outline-light" | "ghost";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-ivory hover:bg-forest-soft",
  gold: "bg-gold text-forest-deep hover:bg-gold-soft",
  outline: "border border-forest/30 text-forest hover:border-forest hover:bg-forest hover:text-ivory",
  "outline-light": "border border-ivory/40 text-ivory hover:border-ivory hover:bg-ivory hover:text-forest",
  ghost: "text-forest hover:bg-sage",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[0.95rem]",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "group inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold tracking-tight transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );
}

type LinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  arrow?: boolean;
  children: ReactNode;
};

export function ButtonLink({ variant, size, className, arrow, children, ...props }: LinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
      {arrow && <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
    </Link>
  );
}

export function TextLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("group inline-flex items-center gap-1.5 font-display font-semibold text-emerald-ink hover:text-forest", className)}
      {...props}
    >
      <span className="link-underline">{children}</span>
      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
