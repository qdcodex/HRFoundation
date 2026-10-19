import { Suspense } from "react";
import { Topbar } from "@/components/admin/shell/topbar";
import { Sidebar } from "@/components/admin/shell/sidebar";
import { PageSkeleton, Skeleton } from "@/components/admin/ui/feedback";
import { visibleNav } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/dal";
import { ROLES, type Role } from "@/lib/auth/permissions";

/** Authenticated, per-request data: navigations are allowed to wait for the server (no static shell). */
export const instant = false;

/**
 * The admin shell reads the session at request time, so it renders inside a Suspense boundary
 * (required by Cache Components). Each page also checks its own permission on the server.
 */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin({ allowPasswordChange: true });
  const sections = admin.mustChangePassword ? [] : visibleNav(admin.permissions);
  const roleLabels = admin.roles.map((r) => ROLES[r as Role]?.label ?? r);
  return (
    <div className="flex min-h-dvh">
      <Sidebar sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar sections={sections} user={{ name: admin.name, email: admin.email, roleLabels }} />
        <main id="admin-main" className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 bg-forest-deep lg:block" />
      <div className="flex-1">
        <div className="h-16 border-b border-line bg-white" />
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
