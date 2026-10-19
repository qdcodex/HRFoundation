import { MediaItemActions, MediaUploader } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied, EmptyState, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Media } from "@/lib/db/models/content";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Media library" };

export default async function MediaLibrary() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const items = await Media.find().sort({ createdAt: -1 }).lean();
  return (
    <>
      <PageHeader
        title="Media library"
        description="Approved images for services, activities and news. Files are checked by content (JPG, PNG, WebP only; max 5 MB)."
        crumbs={[{ label: "Website" }, { label: "Media" }]}
      />
      <Notice className="mb-4">Images in the library can be viewed by anyone who has the link. Never upload identity documents, medical records or photographs of beneficiaries without documented consent.</Notice>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload an image</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUploader />
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <EmptyState title="No images yet">Uploaded images will appear here.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => (
            <li key={m._id.toString()} className="overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${m._id}`} alt={m.alt} className="aspect-video w-full bg-ivory object-cover" loading="lazy" />
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-semibold">{m.filename}</p>
                <p className="text-xs text-muted">
                  {Math.round(m.size / 1024)} KB · {m.uploadedByName} · {fmtDateTime(m.createdAt)}
                </p>
                <MediaItemActions id={m._id.toString()} alt={m.alt} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
