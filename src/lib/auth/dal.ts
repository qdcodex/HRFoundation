import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { permissionsFor, type Permission } from "./permissions";
import { readSession } from "./session";

/**
 * Data Access Layer for authentication and authorisation.
 * Everything that reads or changes admin data must call one of these helpers on the server.
 * Role information is always loaded from the database — never trusted from the browser.
 */

export type AdminContext = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  mustChangePassword: boolean;
};

export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const session = await readSession();
  if (!session) return null;
  await connectDb();
  const user = await AdminUser.findById(session.userId).lean();
  if (!user || !user.active) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    permissions: [...permissionsFor(user.roles, user.extraPermissions)],
    mustChangePassword: user.mustChangePassword,
  };
});

export function can(admin: Pick<AdminContext, "permissions"> | null, permission: Permission) {
  return Boolean(admin?.permissions.includes(permission));
}

/** For pages: redirects to login when signed out, and to the password page when a change is required. */
export async function requireAdmin(options: { allowPasswordChange?: boolean } = {}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword && !options.allowPasswordChange) redirect("/admin/account?required=1");
  return admin;
}

/**
 * For pages: returns { admin, allowed }. Render <AccessDenied /> when not allowed.
 * Pass several permissions to require any one of them.
 */
export async function guardPage(...permissions: Permission[]) {
  const admin = await requireAdmin();
  const allowed = permissions.length === 0 || permissions.some((p) => admin.permissions.includes(p));
  return { admin, allowed };
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

/** For server actions and route handlers: throws AuthError when not signed in or not permitted. */
export async function authorize(...permissions: Permission[]) {
  const admin = await getAdmin();
  if (!admin) throw new AuthError("Your session has ended. Please sign in again.", 401);
  if (admin.mustChangePassword) throw new AuthError("Please change your password before continuing.", 403);
  if (permissions.length && !permissions.some((p) => admin.permissions.includes(p))) {
    throw new AuthError("You do not have permission to do this.", 403);
  }
  return admin;
}
