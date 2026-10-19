import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="bg-ivory py-24 sm:py-32">
      <div className="container-site max-w-2xl text-center">
        <p className="font-display text-8xl font-extrabold tracking-tighter text-transparent [-webkit-text-stroke:2px_var(--color-gold)]">404</p>
        <h1 className="display-md mt-6 text-forest">We couldn&apos;t find that page.</h1>
        <p className="mt-4 text-lg text-muted">The page may have moved, or the link may be incorrect.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" arrow>
            Go to the home page
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            Contact us
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
