import "server-only";
import type { Types } from "mongoose";
import { ActionError, isDuplicateKey } from "@/lib/actions";
import { normaliseTxnRef, TransactionRef } from "@/lib/db/models/membership";

/** Reserves an external transaction reference so it can never be recorded twice (donations + membership payments). */
export async function reserveTxnRef(method: string, ref: string | null | undefined, kind: "donation" | "membership_payment", docId: Types.ObjectId) {
  if (!ref) return null;
  const key = `${method}:${normaliseTxnRef(ref)}`;
  try {
    await TransactionRef.create({ _id: key, kind, docId });
    return key;
  } catch (error) {
    if (isDuplicateKey(error)) {
      const existing = await TransactionRef.findById(key).lean();
      throw new ActionError(
        `This transaction reference is already recorded on another ${existing?.kind === "donation" ? "donation" : "membership payment"}. Duplicate payments cannot be recorded.`,
        { transactionRef: "Duplicate transaction reference." },
      );
    }
    throw error;
  }
}

export async function releaseTxnRef(method: string, ref: string | null | undefined) {
  if (!ref) return;
  await TransactionRef.deleteOne({ _id: `${method}:${normaliseTxnRef(ref)}` });
}
