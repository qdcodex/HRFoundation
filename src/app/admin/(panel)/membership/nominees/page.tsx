import { ListFilters } from "@/components/admin/list-filters";
import { NomineesTable, type NomineeRow } from "@/components/admin/membership/nominees-table";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { escapeRegex, flatParams, parseList } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Member, MEMBER_STATUS_LABELS, Nominee } from "@/lib/db/models/membership";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Nominees" };

export default async function NomineesPage({ searchParams }: PageProps<"/admin/membership/nominees">) {
  const { allowed } = await guardPage("nominees:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const list = parseList(query, { sortable: ["name", "updatedAt"], defaultSort: "updatedAt" });
  await connectDb();

  const filter: Record<string, unknown> = {};
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    const memberIds = await Member.find({ $or: [{ fullName: rx }, { membershipId: rx }, { applicationRef: rx }] }).distinct("_id");
    filter.$or = [{ name: rx }, { memberId: { $in: memberIds } }];
  }
  const [docs, total] = await Promise.all([
    Nominee.find(filter).sort({ [list.sort]: list.dir, _id: -1 }).skip(list.skip).limit(list.pageSize).lean(),
    Nominee.countDocuments(filter),
  ]);
  const members = new Map((await Member.find({ _id: { $in: docs.map((d) => d.memberId) } }).select("fullName membershipId applicationRef status").lean()).map((m) => [m._id.toString(), m]));
  const rows: NomineeRow[] = docs.map((n) => {
    const m = members.get(n.memberId.toString());
    return {
      id: n._id.toString(),
      name: n.name,
      relationship: n.relationship === "other" ? (n.relationshipOther ?? "Other") : n.relationship,
      mobile: n.mobile,
      memberId: n.memberId.toString(),
      memberName: m?.fullName ?? "Unknown",
      memberRef: m?.membershipId ?? m?.applicationRef ?? "",
      memberStatus: m?.status ?? "draft",
      memberStatusLabel: m ? MEMBER_STATUS_LABELS[m.status] : "—",
      updatedAt: n.updatedAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title="Nominees"
        description="Confidential. Visible only to roles with nominee access. Edit nominee details from the member's page so the change is recorded with a reason."
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Nominees" }]}
      />
      <div className="space-y-4">
        <ListFilters action="/admin/membership/nominees" query={query} searchPlaceholder="Search nominee or member name / ID" />
        <NomineesTable rows={rows} total={total} page={list.page} pageSize={list.pageSize} query={query} />
      </div>
    </>
  );
}
