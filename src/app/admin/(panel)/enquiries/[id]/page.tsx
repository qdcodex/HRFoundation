import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { PageHeader } from "@/components/admin/page-header";
import { EnquiryControls, EnquiryNoteForm } from "@/components/admin/system/system-forms";
import { StatusBadge } from "@/components/admin/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, DetailList } from "@/components/admin/ui/card";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { permissionsFor } from "@/lib/auth/permissions";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Enquiry, ENQUIRY_STATUS_LABELS } from "@/lib/db/models/system";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Enquiry" };

export default async function EnquiryPage({ params }: PageProps<"/admin/enquiries/[id]">) {
  const { admin, allowed } = await guardPage("enquiries:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const e = await Enquiry.findById(id).lean();
  if (!e) notFound();
  const canManage = admin.permissions.includes("enquiries:manage");
  const staff = canManage
    ? (await AdminUser.find({ active: true }).select("name roles extraPermissions").lean())
        .filter((u) => permissionsFor(u.roles, u.extraPermissions).has("enquiries:read"))
        .map((u) => ({ id: u._id.toString(), name: u.name }))
    : [];
  return (
    <>
      <PageHeader
        title={e.subject}
        crumbs={[{ label: "Enquiries", href: "/admin/enquiries" }, { label: e.reference }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.status} label={ENQUIRY_STATUS_LABELS[e.status]} />
            <span className="font-mono text-xs">{e.reference}</span>
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.message}</p>
              {e.interests.length > 0 && <p className="mt-3 text-sm text-muted">Interests: {e.interests.join(", ")}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {e.notes.length === 0 ? (
                <p className="text-sm text-muted">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...e.notes].reverse().map((n) => (
                    <li key={n._id.toString()} className="rounded-lg bg-ivory p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1 text-xs text-muted">
                        {n.byName} · {fmtDateTime(n.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {canManage && <EnquiryNoteForm id={id} />}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>From</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Name", value: e.name },
                  { label: "Email", value: e.email ? <a href={`mailto:${e.email}`} className="text-emerald-ink underline">{e.email}</a> : "—" },
                  { label: "Phone", value: e.phone ? <a href={`tel:${e.phone}`} className="text-emerald-ink underline">{e.phone}</a> : "—" },
                  { label: "Organisation", value: e.organisation ?? "—" },
                  { label: "Town / city", value: e.city ?? "—" },
                  { label: "Type", value: <span className="capitalize">{e.kind}</span> },
                  { label: "Received", value: fmtDateTime(e.createdAt) },
                ]}
              />
            </CardContent>
          </Card>
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Handling</CardTitle>
              </CardHeader>
              <CardContent>
                <EnquiryControls id={id} status={e.status} assignedTo={e.assignedTo?.toString() ?? ""} staff={staff} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
