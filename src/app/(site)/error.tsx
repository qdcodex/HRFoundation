"use client";

import { ErrorState } from "@/components/ui/States";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-ivory py-24">
      <div className="container-site max-w-xl">
        <ErrorState
          title="This page could not be loaded"
          action={
            <>
              <button type="button" onClick={reset} className={buttonClasses("primary")}>
                Try again
              </button>
              <Link href="/" className={buttonClasses("outline")}>
                Home
              </Link>
            </>
          }
        >
          Something went wrong on our side. Please try again in a moment.
        </ErrorState>
      </div>
    </section>
  );
}
