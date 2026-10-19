"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { getAdmin } from "@/lib/auth/dal";
import { dummyVerify, hashPassword, passwordPolicy, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroyCurrentSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connect";
import { AdminUser, PasswordResetToken } from "@/lib/db/models/auth";
import { hit } from "@/lib/server/rate-limit";
import { isEmailConfigured, sendEmail } from "@/lib/server/email";
import { clientIp, randomToken, sha256Hex } from "@/lib/server/request";
import { siteUrl } from "@/content/site";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const GENERIC_FAILURE = "Incorrect email or password.";

const loginSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password"), next: form.get("next") ?? undefined });
  if (!parsed.success) return { error: "Enter your email and password." };
  const { password, next } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  let destination = "/admin";
  try {
    await connectDb();
    const ipKey = (await sha256Hex(await clientIp())).slice(0, 24);
    const emailKey = (await sha256Hex(email)).slice(0, 24);
    const ipOk = await hit(`login:ip:${ipKey}`, 20, LOCK_MINUTES * 60);
    const emailOk = await hit(`login:email:${emailKey}`, 10, LOCK_MINUTES * 60);
    if (!ipOk || !emailOk) return { error: `Too many sign-in attempts. Please wait ${LOCK_MINUTES} minutes and try again.` };

    const user = await AdminUser.findOne({ email }).select("+passwordHash");
    if (!user) {
      await dummyVerify(password);
      return { error: GENERIC_FAILURE };
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { error: `Too many sign-in attempts. Please wait ${LOCK_MINUTES} minutes and try again.` };
    }
    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid || !user.active) {
      const failed = (user.failedLoginCount ?? 0) + 1;
      const lock = failed >= LOCK_AFTER;
      await AdminUser.updateOne(
        { _id: user._id },
        { $set: { failedLoginCount: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil } },
      );
      await audit(
        { id: null, name: "Sign-in", email },
        { action: lock ? "auth.account_locked" : "auth.login_failed", entityType: "AdminUser", entityId: user.id, summary: lock ? `Account locked after ${LOCK_AFTER} failed sign-ins.` : "Failed sign-in attempt." },
      );
      return { error: GENERIC_FAILURE };
    }

    await AdminUser.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await createSession(user._id);
    await audit({ id: user.id, name: user.name, email: user.email }, { action: "auth.login", entityType: "AdminUser", entityId: user.id, summary: "Signed in." });

    if (user.mustChangePassword) destination = "/admin/account?required=1";
    else if (next && /^\/admin(\/[\w\-/]*)?$/.test(next) && !next.startsWith("/admin/login")) destination = next;
  } catch (error) {
    console.error("[login]", error instanceof Error ? error.message : error);
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }
  redirect(destination);
}

/**
 * Ends the session. The client then performs a full page load to /admin/login so no previously
 * viewed admin data remains in the browser's in-memory route cache (important on shared computers).
 */
export async function logoutAction() {
  const admin = await getAdmin();
  await destroyCurrentSession();
  if (admin) await audit(admin, { action: "auth.logout", entityType: "AdminUser", entityId: admin.id, summary: "Signed out." });
  return { ok: true as const };
}

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: "Choose a different password from your current one.", path: ["newPassword"] });

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const parsed = changeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  await connectDb();
  const user = await AdminUser.findById(admin.id).select("+passwordHash");
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { error: "Your current password is incorrect.", fieldErrors: { currentPassword: "Incorrect password." } };
  }
  user.passwordHash = await hashPassword(parsed.data.newPassword);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date();
  await user.save();
  await destroyAllSessions(user._id, true);
  await audit(admin, { action: "auth.password_changed", entityType: "AdminUser", entityId: admin.id, summary: "Changed own password; other sessions signed out." });
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

export async function requestResetAction(_: FormState, form: FormData): Promise<FormState> {
  const genericOk = { ok: true, message: "If an active account uses that email, a reset link has been sent. It expires in 30 minutes." };
  if (!isEmailConfigured()) return { error: "Password reset by email is not configured. Ask a Super Admin to set a temporary password for you." };
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email address." };
  try {
    await connectDb();
    const ipKey = (await sha256Hex(await clientIp())).slice(0, 24);
    if (!(await hit(`reset:ip:${ipKey}`, 5, 3600))) return genericOk;
    const user = await AdminUser.findOne({ email, active: true }).lean();
    if (!user) return genericOk;
    const token = randomToken();
    await PasswordResetToken.deleteMany({ userId: user._id });
    await PasswordResetToken.create({ tokenHash: await sha256Hex(token), userId: user._id, expiresAt: new Date(Date.now() + 30 * 60_000) });
    const link = `${siteUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your H R Foundation admin password",
      text: `A password reset was requested for your H R Foundation admin account.\n\nReset your password (link valid for 30 minutes):\n${link}\n\nIf you did not request this, ignore this email.`,
    });
    await audit({ id: null, name: "Password reset", email: user.email }, { action: "auth.reset_requested", entityType: "AdminUser", entityId: user._id.toString(), summary: "Password reset link requested." });
  } catch (error) {
    console.error("[reset request]", error instanceof Error ? error.message : error);
  }
  return genericOk;
}

const resetSchema = z
  .object({ token: z.string().min(20).max(100), newPassword: passwordPolicy, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: fieldErrors.token ? "This reset link is invalid." : "Please check the highlighted fields.", fieldErrors };
  }
  await connectDb();
  const record = await PasswordResetToken.findOneAndUpdate(
    { tokenHash: await sha256Hex(parsed.data.token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
  if (!record) return { error: "This reset link is invalid or has expired. Request a new one." };
  const user = await AdminUser.findById(record.userId);
  if (!user || !user.active) return { error: "This account cannot be reset. Contact a Super Admin." };
  user.passwordHash = await hashPassword(parsed.data.newPassword);
  user.mustChangePassword = false;
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  user.passwordChangedAt = new Date();
  await user.save();
  await destroyAllSessions(user._id);
  await audit({ id: user.id, name: user.name, email: user.email }, { action: "auth.password_reset", entityType: "AdminUser", entityId: user.id, summary: "Password reset via email link; all sessions signed out." });
  return { ok: true, message: "Your password has been reset. You can now sign in." };
}
