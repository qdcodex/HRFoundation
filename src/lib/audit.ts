import "server-only";
import { connectDb } from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/system";
import { clientIp } from "@/lib/server/request";
import type { AdminContext } from "@/lib/auth/dal";

const SENSITIVE = /password|token|hash|mobile|phone|dateofbirth|address|nominee|email|pan|aadhaar/i;

/** Removes personal and secret values from audit details; keeps field names so the change is still visible. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

export async function audit(
  actor: Pick<AdminContext, "id" | "name" | "email"> | { id: null; name: string; email?: string | null },
  entry: { action: string; entityType: string; entityId?: string | null; summary: string; details?: Record<string, unknown> },
) {
  await connectDb();
  await AuditLog.create({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    summary: entry.summary.slice(0, 500),
    details: entry.details ? (redact(entry.details) as Record<string, unknown>) : null,
    ip: await clientIp().catch(() => null),
  });
}

/** Lists which fields changed between two plain objects (values redacted where sensitive). */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a !== b) changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
  }
  return changes;
}
