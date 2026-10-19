import type { ReactNode } from "react";

/**
 * Gentle entrance for the hero copy. Uses a CSS animation (not JS) so the headline paints
 * before hydration — important for Largest Contentful Paint. Reduced motion is respected globally.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
