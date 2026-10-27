import { authorize, AuthError } from "@/lib/auth/dal";
import { loadSettings } from "@/lib/settings";
import { getFile } from "@/lib/storage";

/** Lets staff view the uploaded 12A/80G certificate. */
export async function GET(_: Request, { params }: RouteContext<"/admin/api/tax-certificates/[kind]">) {
  try {
    await authorize("settings:manage", "receipts:manage");
    const { kind } = await params;
    if (kind !== "reg12A" && kind !== "reg80G") return new Response("Not found", { status: 404 });
    const t = await loadSettings("taxExemption");
    const fileId = t[kind].fileId;
    const file = fileId ? await getFile("private_files", fileId) : null;
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(file.bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${kind === "reg12A" ? "12A" : "80G"}-certificate.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: error.status });
    console.error("[tax certificate]", error);
    return new Response("Error", { status: 500 });
  }
}
