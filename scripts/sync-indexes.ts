/** Creates/updates all MongoDB indexes (run on deploy; autoIndex is off in production). */
import "./load-env";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import "@/lib/db/models/auth";
import "@/lib/db/models/membership";
import "@/lib/db/models/finance";
import "@/lib/db/models/claims";
import "@/lib/db/models/content";
import "@/lib/db/models/system";

async function main() {
  await connectDb();
  for (const name of mongoose.modelNames()) {
    await mongoose.model(name).syncIndexes();
    console.log(`✓ ${name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
