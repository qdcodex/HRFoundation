import Link from "next/link";
import { Plus } from "lucide-react";
import { ClaimsTable, type ClaimRow } from "@/components/admin/claims/claims-table";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { escapeRegex, flatParams, istDayBoundary, parseList } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Claim, CLAIM_STATUS_LABELS, CLAIM_STATUSES } from "@/lib/db/models/claims";
import { claimSla, slaLabel } from "@/lib/domain/claim-sla";
import { loadSettings } from "@/lib/settings";

export const instant = false;
export const metadata = { title: "Death-benefit claims" };

export default async function ClaimsPage({ searchParams }: PageProps<"/admin/claims">) {
  const { admin, allowed } = await guardPage("claims:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const list = parseList(query, { sortable: ["submittedAt", "status", "updatedAt"], defaultSort: "submittedAt" });
  await connectDb();
  const rules = await loadSettings("membershipRules");

  const filter: Record<string, unknown> = {};
  if (query.status && (CLAIM_STATUSES as readonly string[]).includes(query.status)) filter.status = query.status;
  else if (query.status === "open") filter.status = { $in: ["submitted", "under_review", "info_required"] };
  if (query.assigned === "me") filter.assignedTo = admin.id;
  if (query.assigned === "none") filter.assignedTo = null;
  const from = istDayBoundary(query.from);
  const to = istDayBoundary(query.to, true);
  if (from || to) filter.submittedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    filter.$or = [{ reference: rx }, { membershipId: rx }, { memberName: rx }];
  }

  const [docs, total] = await Promise.all([
    Claim.find(filter).sort({ [list.sort]: list.dir, _id: -1 }).skip(list.skip).limit(list.pageSize).select("-verificationNotes -infoRequests.message -infoRequests.resolutionNote -decision.eligibility").lean(),
    Claim.countDocuments(filter),
  ]);
  const showClaimant = admin.permissions.includes("nominees:read") || admin.permissions.includes("claims:review");
  const rows: ClaimRow[] = docs.map((c) => ({
    id: c._id.toString(),
    reference: c.reference,
    membershipId: c.membershipId,
    memberName: c.memberName,
    claimantName: showClaimant ? c.claimant.name : null,
    submittedAt: c.submittedAt.toISOString(),
    requestedAmountPaise: c.requestedAmountPaise ?? null,
    status: c.status,
    statusLabel: CLAIM_STATUS_LABELS[c.status],
    assignedToName: c.assignedToName ?? null,
    updatedAt: c.updatedAt.toISOString(),
    dateOfDeath: c.dateOfDeath,
    sla: slaLabel(claimSla(c, rules.claimTargetDays)),
    overdue: (() => { const x = claimSla(c, rules.claimTargetDays); return x.kind === "running" && x.daysLeft < 0; })(),
  }));

  return (
    <>
      <PageHeader
        title="Death-benefit claims"
        description={`Claims are submitted online by nominees or recorded by staff. Target: ${rules.claimTargetDays} days from complete documents to payment. Every decision needs an authorised reviewer and is kept in the audit log.`}
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Claims" }]}
        actions={
          admin.permissions.includes("claims:review") && (
            <Button asChild>
              <Link href="/admin/claims/new">
                <Plus aria-hidden /> Record a claim
              </Link>
            </Button>
          )
        }
      />
      {!rules.schemeApproved && (
        <Notice className="mb-4">
          The scheme is marked as <strong>proposed</strong>. Claims can be recorded and reviewed, but approval is blocked until a Super Admin marks the scheme as formally approved in Membership Rules.
        </Notice>
      )}
      <div className="space-y-4">
        <ListFilters
          action="/admin/claims"
          query={query}
          searchPlaceholder="Search claim ref, membership ID or member"
          filters={[
            { type: "select", name: "status", label: "Status", options: [{ value: "open", label: "Open (awaiting review)" }, ...CLAIM_STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABELS[s] }))] },
            {
              type: "select",
              name: "assigned",
              label: "Reviewer",
              options: [
                { value: "me", label: "Assigned to me" },
                { value: "none", label: "Unassigned" },
              ],
            },
            { type: "date", name: "from", label: "Submitted from" },
            { type: "date", name: "to", label: "Submitted to" },
          ]}
        />
        <ClaimsTable rows={rows} total={total} page={list.page} pageSize={list.pageSize} query={query} showClaimant={showClaimant} />
      </div>
    </>
  );
}
