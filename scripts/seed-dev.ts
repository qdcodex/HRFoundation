/**
 * DEVELOPMENT ONLY — creates one test administrator per role on a LOCAL database.
 * Random passwords are written to .dev-credentials.local (git-ignored), never printed.
 *
 *   npm run dev:seed-demo
 *
 * Refuses to run unless MONGODB_URI points at localhost / 127.0.0.1 and NODE_ENV is not production.
 */
import "./load-env";
import { writeFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { ROLES, type Role } from "@/lib/auth/permissions";

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  if (process.env.NODE_ENV === "production" || !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(uri)) {
    throw new Error("Refusing to seed: dev seeding only runs against a local MongoDB (localhost / 127.0.0.1).");
  }
  await connectDb();
  const lines = ["# Local development test accounts — DO NOT use in production. Regenerate with npm run dev:seed-demo.", ""];
  for (const role of Object.keys(ROLES) as Role[]) {
    const email = `${role.replace(/_/g, ".")}@hrf.test`;
    const password = generateTemporaryPassword();
    await AdminUser.findOneAndUpdate(
      { email },
      {
        $set: { name: `Test ${ROLES[role].label}`, passwordHash: await hashPassword(password), roles: [role], active: true, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
        $setOnInsert: { email, extraPermissions: [] },
      },
      { upsert: true },
    );
    lines.push(`${ROLES[role].label.padEnd(20)} ${email.padEnd(32)} ${password}`);
  }
  writeFileSync(".dev-credentials.local", lines.join("\n") + "\n", { mode: 0o600 });
  console.log("Created/updated test admins for every role. Credentials written to .dev-credentials.local");
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
