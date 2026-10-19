import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "@/components/admin/system/system-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { PERMISSIONS, ROLES } from "@/lib/auth/permissions";
import { connectDb } from "@/lib/db/connect";
import { AdminUser, Session } from "@/lib/db/models/auth";
import { AuditLog } from "@/lib/db/models/system";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Administrator" };

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { admin, allowed } = await guardPage("users:manage");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const [u, sessions, activity] = await Promise.all([
    AdminUser.findById(id).lean(),
    Session.find({ userId: id, expiresAt: { $gt: new Date() } }).sort({ lastSeenAt: -1 }).lean(),
    AuditLog.find({ actorId: id }).sort({ at: -1 }).limit(15).lean(),
  ]);
  if (!u) notFound();
  return (
    <>
      <PageHeader title={u.name} description={u.email} crumbs={[{ label: "Users", href: "/admin/users" }, { label: u.name }]} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <UserForm
            isSelf={id === admin.id}
            user={{ id, name: u.name, email: u.email, roles: u.roles, extraPermissions: u.extraPermissions, active: u.active }}
            roles={Object.entries(ROLES).map(([key, r]) => ({ key, label: r.label, description: r.description }))}
            permissions={Object.entries(PERMISSIONS).map(([key, label]) => ({ key, label }))}
          />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted">Not signed in.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sessions.map((s) => (
                    <li key={s._id.toString()}>
                      Last seen {fmtDateTime(s.lastSeenAt)}
                      <span className="block truncate text-xs text-muted">{s.userAgent}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent actions</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted">No recorded actions.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {activity.map((a) => (
                    <li key={a._id.toString()}>
                      {a.summary}
                      <span className="block text-xs text-muted">{fmtDateTime(a.at)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
