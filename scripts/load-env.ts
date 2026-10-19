/**
 * Loads environment files for CLI scripts (Next.js does this automatically for the app).
 *
 * Default:        .env.local, then .env            (local development database)
 * With --live:    .env.production.local, then .env.production, then .env   (live database)
 *
 * Variables already set in the shell always win.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const live = process.argv.includes("--live");
const files = live ? [".env.production.local", ".env.production", ".env"] : [".env.local", ".env"];

if (live && !existsSync(resolve(process.cwd(), ".env.production.local")) && !process.env.MONGODB_URI) {
  console.error("--live was given but .env.production.local was not found.");
  process.exit(1);
}

for (const file of files) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
}

const host = /@([^/?]+)/.exec(process.env.MONGODB_URI ?? "")?.[1] ?? /\/\/([^/?]+)/.exec(process.env.MONGODB_URI ?? "")?.[1] ?? "not set";
console.log(`Database: ${host}${live ? " (LIVE)" : ""}`);
