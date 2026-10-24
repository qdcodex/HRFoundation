import type { Metadata } from "next";

/** Member portal: personal pages, never indexed by search engines. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MemberLayout({ children }: LayoutProps<"/member">) {
  return children;
}
