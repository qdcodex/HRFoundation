import "server-only";
import type { Types } from "mongoose";
import { generateMemberTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { Member } from "@/lib/db/models/membership";
import { destroyAllMemberSessions } from "./session";

/**
 * Sets a new one-time portal password for a member and signs out all their sessions.
 * The plain password is returned only so it can be shown to staff once and emailed to the member.
 * It is never stored: the notification log and the admin copy of the email have it masked.
 */
export async function issueTemporaryPassword(memberId: Types.ObjectId | string) {
  const password = generateMemberTemporaryPassword();
  await Member.updateOne(
    { _id: memberId },
    {
      $set: {
        "portal.passwordHash": await hashPassword(password),
        "portal.mustChangePassword": true,
        "portal.failedLoginCount": 0,
        "portal.lockedUntil": null,
        "portal.issuedAt": new Date(),
      },
    },
  );
  await destroyAllMemberSessions(memberId);
  return password;
}
