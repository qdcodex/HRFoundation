/**
 * Creates the first Super Admin (or resets an existing admin's password).
 *
 *   npm run admin:create -- --email you@example.org --name "Your Name"
 *   npm run admin:create -- --email you@example.org --reset
 *
 * A random temporary password is generated and printed ONCE. The user must change it at first sign-in.
 * There is no default password.
 */
import "./load-env";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { AuditLog } from "@/lib/db/models/system";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.toLowerCase().trim();
  const name = arg("name")?.trim();
  const reset = process.argv.includes("--reset");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Pass a valid --email");

  await connectDb();
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  const existing = await AdminUser.findOne({ email });

  if (existing && !reset) throw new Error(`An admin with ${email} already exists. Use --reset to issue a new temporary password.`);
  if (!existing && !name) throw new Error("Pass --name for a new admin");

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.mustChangePassword = true;
    existing.failedLoginCount = 0;
    existing.lockedUntil = null;
    existing.active = true;
    await existing.save();
    await mongoose.connection.collection("sessions").deleteMany({ userId: existing._id });
  } else {
    await AdminUser.create({ email, name, passwordHash, roles: ["super_admin"], mustChangePassword: true });
  }
  const user = await AdminUser.findOne({ email }).lean();
  await AuditLog.create({
    actorName: "CLI (admin:create)",
    action: existing ? "users.password_reset_cli" : "users.created_cli",
    entityType: "AdminUser",
    entityId: user!._id.toString(),
    summary: existing ? `Temporary password issued via CLI for ${email}.` : `Super Admin ${email} created via CLI.`,
  });

  console.log("\n" + (existing ? "Temporary password reset" : "Super Admin created") + ` for ${email}`);
  console.log("Temporary password (shown once — store it securely):\n");
  console.log("   " + tempPassword + "\n");
  console.log("Sign in at /admin/login. You will be asked to choose a new password.\n");
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
