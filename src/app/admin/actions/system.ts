"use server";

import { Types } from "mongoose";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { ActionError, runAction, type ActionResult } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { ALL_PERMISSIONS, permissionsFor, ROLE_KEYS } from "@/lib/auth/permissions";
import { destroyAllSessions } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Enquiry, ENQUIRY_STATUSES, Setting } from "@/lib/db/models/system";
import { parseRupeesToPaise } from "@/lib/money";
import { loadSettings, membershipRulesSchema, NOTIFICATION_EVENTS, notificationSettingsSchema, websiteSettingsSchema } from "@/lib/settings";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid record.");

/* ---------------- Enquiries ---------------- */

export async function updateEnquiry(input: unknown) {
  const schema = z.object({ id: objectId, status: z.enum(ENQUIRY_STATUSES).optional(), assignTo: z.string().optional() });
  return runAction("enquiries:manage", schema, input, async (d, admin) => {
    await connectDb();
    const set: Record<string, unknown> = {};
    if (d.status) set.status = d.status;
    if (d.assignTo !== undefined) {
      if (d.assignTo === "") Object.assign(set, { assignedTo: null, assignedToName: null });
      else {
        const user = await AdminUser.findOne({ _id: d.assignTo, active: true }).lean();
        if (!user || !permissionsFor(user.roles, user.extraPermissions).has("enquiries:read")) throw new ActionError("That user cannot handle enquiries.");
        Object.assign(set, { assignedTo: user._id, assignedToName: user.name });
      }
    }
    const e = await Enquiry.findByIdAndUpdate(d.id, { $set: set }).lean();
    if (!e) throw new ActionError("Enquiry not found.");
    await audit(admin, {
      action: "enquiries.updated",
      entityType: "Enquiry",
      entityId: d.id,
      summary: `Updated enquiry ${e.reference}${d.status ? ` → ${d.status.replace("_", " ")}` : ""}${set.assignedToName ? ` (assigned to ${set.assignedToName})` : ""}.`,
    });
    revalidatePath("/admin/enquiries", "layout");
    return { ok: true, message: "Enquiry updated." };
  });
}

export async function addEnquiryNote(input: unknown) {
  return runAction("enquiries:manage", z.object({ id: objectId, text: z.string().trim().min(2).max(2000) }), input, async (d, admin) => {
    await connectDb();
    const res = await Enquiry.updateOne({ _id: d.id }, { $push: { notes: { text: d.text, by: new Types.ObjectId(admin.id), byName: admin.name, at: new Date() } } });
    if (!res.matchedCount) throw new ActionError("Enquiry not found.");
    await audit(admin, { action: "enquiries.note_added", entityType: "Enquiry", entityId: d.id, summary: "Added an internal note." });
    revalidatePath(`/admin/enquiries/${d.id}`);
    return { ok: true, message: "Note added." };
  });
}

/* ---------------- Users & roles ---------------- */

const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email("Enter a valid email.").max(254),
  roles: z.array(z.enum(ROLE_KEYS)).min(1, "Choose at least one role."),
  extraPermissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).default([]),
});

export async function createUser(input: unknown): Promise<ActionResult<{ id: string; tempPassword: string }>> {
  return runAction("users:manage", userSchema, input, async (d, admin) => {
    await connectDb();
    const email = d.email.toLowerCase();
    if (await AdminUser.exists({ email })) throw new ActionError("An administrator with this email already exists.", { email: "Already exists." });
    const tempPassword = generateTemporaryPassword();
    const user = await new AdminUser({
      name: d.name,
      email,
      roles: d.roles,
      extraPermissions: d.extraPermissions,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      createdBy: new Types.ObjectId(admin.id),
    }).save();
    await audit(admin, { action: "users.created", entityType: "AdminUser", entityId: user.id, summary: `Created administrator ${email} with roles: ${d.roles.join(", ")}.` });
    revalidatePath("/admin/users", "layout");
    return { ok: true, message: "Administrator created. Share the temporary password securely — it is shown only once.", data: { id: user.id, tempPassword } };
  });
}

export async function updateUser(input: unknown) {
  const schema = userSchema.extend({ id: objectId, active: z.boolean() });
  return runAction("users:manage", schema, input, async (d, admin) => {
    await connectDb();
    const before = await AdminUser.findById(d.id).lean();
    if (!before) throw new ActionError("User not found.");
    const email = d.email.toLowerCase();
    if (email !== before.email && (await AdminUser.exists({ email }))) throw new ActionError("Another administrator uses this email.", { email: "Already in use." });
    // Never allow the last active Super Admin to be removed or deactivated.
    const losingSuper = before.roles.includes("super_admin") && (!d.roles.includes("super_admin") || !d.active);
    if (losingSuper && (await AdminUser.countDocuments({ roles: "super_admin", active: true })) <= 1) {
      throw new ActionError("There must always be at least one active Super Admin.");
    }
    if (d.id === admin.id && !d.active) throw new ActionError("You cannot deactivate your own account.");
    const update = { name: d.name, email, roles: d.roles, extraPermissions: d.extraPermissions, active: d.active };
    await AdminUser.updateOne({ _id: d.id }, { $set: update });
    const changes = diff(before as unknown as Record<string, unknown>, update);
    if (!d.active || "roles" in changes || "extraPermissions" in changes) await destroyAllSessions(d.id, d.id === admin.id);
    await audit(admin, {
      action: "users.updated",
      entityType: "AdminUser",
      entityId: d.id,
      summary: `Updated administrator ${email}${!d.active ? " (deactivated)" : ""}.`,
      details: { roles: { from: before.roles, to: d.roles }, extraPermissions: { from: before.extraPermissions, to: d.extraPermissions }, active: { from: before.active, to: d.active } },
    });
    revalidatePath("/admin/users", "layout");
    return { ok: true, message: "Administrator updated. Changed access applies from their next sign-in." };
  });
}

export async function resetUserPassword(input: unknown): Promise<ActionResult<{ tempPassword: string }>> {
  return runAction("users:manage", z.object({ id: objectId }), input, async (d, admin) => {
    await connectDb();
    const tempPassword = generateTemporaryPassword();
    const user = await AdminUser.findByIdAndUpdate(d.id, {
      $set: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
    }).lean();
    if (!user) throw new ActionError("User not found.");
    await destroyAllSessions(d.id, d.id === admin.id);
    await audit(admin, { action: "users.password_reset", entityType: "AdminUser", entityId: d.id, summary: `Issued a temporary password for ${user.email}; their sessions were signed out.` });
    return { ok: true, message: "Temporary password issued. It is shown only once.", data: { tempPassword } };
  });
}

/* ---------------- Settings ---------------- */

async function saveSetting(key: "website" | "membershipRules" | "notifications", value: Record<string, unknown>, admin: { id: string; name: string; email: string }, label: string) {
  await connectDb();
  const before = (await Setting.findById(key).lean())?.value ?? {};
  await Setting.updateOne({ _id: key }, { $set: { value, updatedBy: new Types.ObjectId(admin.id), updatedByName: admin.name } }, { upsert: true });
  const changes = diff(before, value);
  await audit(admin, { action: `settings.${key}_updated`, entityType: "Setting", entityId: key, summary: `Updated ${label}: ${Object.keys(changes).join(", ") || "no changes"}.`, details: { changes } });
}

export async function saveWebsiteSettings(input: unknown) {
  return runAction("settings:manage", websiteSettingsSchema, input, async (d, admin) => {
    await saveSetting("website", d, admin, "website settings");
    updateTag("settings");
    revalidatePath("/admin/settings", "layout");
    return { ok: true, message: "Website settings saved. The public website shows the new details." };
  });
}

const rulesInput = z.object({
  schemeApproved: z.boolean(),
  registrationOpen: z.boolean(),
  fee: z.string().default(""),
  feePeriod: z.string().trim().max(40).default(""),
  waitingPeriodMonths: z.coerce.number().int().min(0).max(60),
  maxBenefit: z.string(),
  benefitAgeLimit: z.coerce.number().int().min(1).max(120),
  minApplicantAge: z.coerce.number().int().min(0).max(120),
  termsVersion: z.string().trim().min(1).max(80),
  approachingDays: z.coerce.number().int().min(1).max(90),
  claimTargetDays: z.coerce.number().int().min(1).max(365),
  confirmApproval: z.boolean().default(false),
});

export async function saveMembershipRules(input: unknown) {
  return runAction("rules:manage", rulesInput, input, async (d, admin) => {
    const before = await loadSettings("membershipRules");
    const feePaise = d.fee.trim() ? parseRupeesToPaise(d.fee) : null;
    if (d.fee.trim() && feePaise === null) throw new ActionError("Enter a valid fee.", { fee: "Invalid amount." });
    const maxBenefitPaise = parseRupeesToPaise(d.maxBenefit);
    if (maxBenefitPaise === null) throw new ActionError("Enter a valid maximum benefit.", { maxBenefit: "Invalid amount." });
    if (d.schemeApproved && !before.schemeApproved && !d.confirmApproval) {
      throw new ActionError("Confirm that the foundation has formally approved the scheme's rules and legal structure.", { confirmApproval: "Required." });
    }
    const value = membershipRulesSchema.parse({ ...d, feePaise, maxBenefitPaise });
    await saveSetting("membershipRules", value, admin, "membership rules");
    updateTag("settings");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Membership rules saved. Waiting periods, eligibility checks and the public pages now use these values." };
  });
}

export async function saveNotificationSettings(input: unknown) {
  const tpl = z.object({ enabled: z.boolean(), subject: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(4000) });
  const schema = z.object({ templates: z.record(z.enum(Object.keys(NOTIFICATION_EVENTS) as [string, ...string[]]), tpl), adminCopy: z.boolean().default(true) });
  return runAction("settings:manage", schema, input, async (d, admin) => {
    const value = notificationSettingsSchema.parse(d);
    await saveSetting("notifications", value, admin, "notification templates");
    revalidatePath("/admin/settings/notifications");
    return { ok: true, message: "Notification templates saved." };
  });
}
