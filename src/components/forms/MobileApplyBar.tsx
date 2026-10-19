"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/** Sticky "Apply" bar on phones; hides once the registration form is on screen. */
export function MobileApplyBar({ label }: { label: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const target = document.getElementById("register");
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  if (hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 p-3 backdrop-blur sm:hidden">
      <a
        href="#register"
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest font-display font-semibold text-ivory focus-visible:ring-3 focus-visible:ring-gold/60 focus-visible:outline-none"
      >
        {label}
        <ArrowRight aria-hidden className="size-4" />
      </a>
    </div>
  );
}
