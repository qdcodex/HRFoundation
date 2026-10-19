import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | H R Foundation" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-[#f4f2ec] text-charcoal">
      {children}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
