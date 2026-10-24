"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { dummyVerify, hashPassword, memberPasswordPolicy, verifyPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db/connect";
import { Member } from "@/lib/db/models/membership";
import { canSignIn, createMemberSession, destroyAllMemberSessions, destroyMemberSession, getMember } from "@/lib/member-auth/session";
import { hit } from "@/lib/server/rate-limit";
import { clientIp, sha256Hex } from "@/lib/server/request";

export type MemberFormState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const GENERIC_FAILURE = "Incorrect membership ID or password.";

const loginSchema = z.object({
  membershipId: z.string().trim().toUpperCase().min(5).max(30),
  password: z.string().min(1).max(128),
});

export async function memberLoginAction(_: MemberFormState, form: FormData): Promise<MemberFormState> {
  const parsed = loginSchema.safeParse({ membershipId: form.get("membershipId"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter your membership ID and password." };
  const { membershipId, password } = parsed.data;

  let destination = "/member";
  try {
    await connectDb();
    const ipKey = (await sha256Hex(await clientIp())).slice(0, 24);
    const idKey = (await sha256Hex(membershipId)).slice(0, 24);
    const ipOk = await hit(`member-login:ip:${ipKey}`, 20, LOCK_MINUTES * 60);
    const idOk = await hit(`member-login:id:${idKey}`, 10, LOCK_MINUTES * 60);
    if (!ipOk || !idOk) return { error: `Too many sign-in attempts. Please wait ${LOCK_MINUTES} minutes and try again.` };

    const member = await Member.findOne({ membershipId }).select("+portal.passwordHash");
    const hash = member?.portal?.passwordHash;
    if (!member || !hash) {
      await dummyVerify(password);
      return { error: GENERIC_FAILURE };
    }
    if (member.portal?.lockedUntil && member.portal.lockedUntil > new Date()) {
      return { error: `Too many sign-in attempts. Please wait ${LOCK_MINUTES} minutes and try again.` };
    }
    const valid = await verifyPassword(hash, password);
    if (!valid || !canSignIn(member.status)) {
      const failed = (member.portal?.failedLoginCount ?? 0) + 1;
      const lock = failed >= LOCK_AFTER;
      await Member.updateOne(
        { _id: member._id },
        { $set: { "portal.failedLoginCount": lock ? 0 : failed, "portal.lockedUntil": lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null } },
      );
      if (lock) {
        await audit({ id: null, name: `Member portal (${membershipId})` }, { action: "member_portal.locked", entityType: "Member", entityId: member.id, summary: `Member login locked after ${LOCK_AFTER} failed attempts.` });
      }
      return { error: valid ? "This membership cannot sign in. Please contact the foundation." : GENERIC_FAILURE };
    }

    await Member.updateOne({ _id: member._id }, { $set: { "portal.failedLoginCount": 0, "portal.lockedUntil": null, "portal.lastLoginAt": new Date() } });
    await createMemberSession(member._id);
    await audit({ id: null, name: `Member portal (${membershipId})` }, { action: "member_portal.login", entityType: "Member", entityId: member.id, summary: "Member signed in to the portal." });
    if (member.portal?.mustChangePassword) destination = "/member/password?required=1";
  } catch (error) {
    console.error("[member-login]", error instanceof Error ? error.message : error);
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }
  redirect(destination);
}

export async function memberLogoutAction() {
  await destroyMemberSession();
  return { ok: true as const };
}

const changeSchema = z
  .object({
    current: z.string().min(1, "Enter your current password.").max(128),
    password: memberPasswordPolicy,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "The passwords do not match." })
  .refine((d) => d.password !== d.current, { path: ["password"], message: "Choose a password different from the current one." });

export async function memberChangePasswordAction(_: MemberFormState, form: FormData): Promise<MemberFormState> {
  const member = await getMember();
  if (!member) redirect("/member/login");
  const parsed = changeSchema.safeParse({ current: form.get("current"), password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  const full = await Member.findById(member._id).select("+portal.passwordHash");
  if (!full?.portal?.passwordHash || !(await verifyPassword(full.portal.passwordHash, parsed.data.current))) {
    return { error: "Please check the highlighted fields.", fieldErrors: { current: "This is not your current password." } };
  }
  await Member.updateOne(
    { _id: member._id },
    { $set: { "portal.passwordHash": await hashPassword(parsed.data.password), "portal.mustChangePassword": false, "portal.passwordChangedAt": new Date() } },
  );
  await destroyAllMemberSessions(member._id, true);
  await audit({ id: null, name: `Member portal (${member.membershipId})` }, { action: "member_portal.password_changed", entityType: "Member", entityId: member._id.toString(), summary: "Member changed their portal password." });
  redirect("/member?password=changed");
}
