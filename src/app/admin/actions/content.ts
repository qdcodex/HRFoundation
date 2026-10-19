"use server";

import { Types } from "mongoose";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { ActionError, isDuplicateKey, runAction, type ActionResult } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";
import { CMS_TAGS } from "@/lib/cms";
import { pageDefault } from "@/content/pages";
import { connectDb } from "@/lib/db/connect";
import { Activity, DOCUMENT_CATEGORIES, Media, NewsArticle, PublicDocument, Service, SERVICE_STATUSES, SitePage } from "@/lib/db/models/content";
import { deleteFile, putFile, UploadError, validateUpload } from "@/lib/storage";
import { parseIsoDate } from "@/lib/waiting-period";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid record.");
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only (e.g. health-camp-2026).")
  .max(80);
const isoDate = z.string().refine((v) => parseIsoDate(v) !== null, "Enter a valid date.");
const lines = z
  .string()
  .max(10000)
  .optional()
  .default("")
  .transform((v) => v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
const paragraphs = z
  .string()
  .max(10000)
  .optional()
  .default("")
  .transform((v) => v.split(/\r?\n\s*\r?\n/).map((l) => l.trim()).filter(Boolean));
const optionalId = z
  .string()
  .optional()
  .default("")
  .refine((v) => v === "" || Types.ObjectId.isValid(v), "Invalid image.")
  .transform((v) => (v ? new Types.ObjectId(v) : null));

function bump(tag: string, adminPath: string) {
  updateTag(tag);
  revalidatePath(adminPath, "layout");
}

/* ---------------- Pages ---------------- */

const pageSchema = z.object({
  key: z.string().min(1).max(40),
  title: z.string().trim().min(3, "Enter a title.").max(200),
  intro: z.string().trim().max(600).default(""),
  seoTitle: z.string().trim().min(3, "Enter an SEO title.").max(80, "Keep SEO titles to 80 characters."),
  seoDescription: z.string().trim().min(50, "Write at least 50 characters.").max(200, "Keep descriptions to 200 characters."),
  body: z.string().max(30000).default(""),
  intent: z.enum(["draft", "publish"]),
});

export async function savePage(input: unknown) {
  return runAction("content:manage", pageSchema, input, async (d, admin) => {
    await connectDb();
    const page = await SitePage.findOne({ key: d.key });
    if (!page) throw new ActionError("Page not found.");
    const content = { title: d.title, intro: d.intro, seoTitle: d.seoTitle, seoDescription: d.seoDescription, body: page.hasBody ? d.body : "" };
    const before = page.published ? { ...page.published } : null;
    page.draft = content;
    if (d.intent === "publish") {
      page.published = content;
      page.publishedAt = new Date();
    }
    page.updatedBy = new Types.ObjectId(admin.id);
    page.updatedByName = admin.name;
    await page.save();
    await audit(admin, {
      action: d.intent === "publish" ? "content.page_published" : "content.page_draft_saved",
      entityType: "SitePage",
      entityId: d.key,
      summary: `${d.intent === "publish" ? "Published" : "Saved draft of"} page “${page.label}”.`,
      details: d.intent === "publish" && before ? { changed: Object.keys(diff(before as Record<string, unknown>, content)) } : undefined,
    });
    if (d.intent === "publish") bump(`${CMS_TAGS.pages}:${d.key}`, "/admin/content/pages");
    else revalidatePath("/admin/content/pages", "layout");
    return { ok: true, message: d.intent === "publish" ? "Published. The live page has been updated." : "Draft saved. The live page is unchanged until you publish." };
  });
}

export async function revertPageToDefault(input: unknown) {
  return runAction("content:manage", z.object({ key: z.string().min(1).max(40) }), input, async (d, admin) => {
    await connectDb();
    const def = pageDefault(d.key);
    if (!def) throw new ActionError("Page not found.");
    const content = { title: def.title, intro: def.intro, seoTitle: def.seoTitle, seoDescription: def.seoDescription, body: def.body ?? "" };
    await SitePage.updateOne({ key: d.key }, { $set: { draft: content, published: content, publishedAt: new Date(), updatedBy: new Types.ObjectId(admin.id), updatedByName: admin.name } });
    await audit(admin, { action: "content.page_reverted", entityType: "SitePage", entityId: d.key, summary: `Reverted page “${def.label}” to the original approved text.` });
    bump(`${CMS_TAGS.pages}:${d.key}`, "/admin/content/pages");
    return { ok: true, message: "Page reverted to the original text and published." };
  });
}

/* ---------------- Services ---------------- */

const serviceSchema = z.object({
  slug: z.string().min(1).max(80),
  title: z.string().trim().min(3).max(120),
  shortTitle: z.string().trim().min(2).max(60),
  status: z.enum(SERVICE_STATUSES),
  published: z.boolean(),
  summary: z.string().trim().min(20, "Write a short summary (20+ characters).").max(400),
  seoTitle: z.string().trim().max(70).default(""),
  metaDescription: z.string().trim().min(50, "Write at least 50 characters.").max(200),
  overview: paragraphs,
  objectives: lines,
  approvedActivities: lines,
  potentialInitiatives: lines,
  eligibility: lines,
  enquiry: z.string().trim().max(600).default(""),
  imageId: optionalId,
});

export async function saveService(input: unknown) {
  return runAction("content:manage", serviceSchema, input, async (d, admin) => {
    await connectDb();
    const before = await Service.findOne({ slug: d.slug }).lean();
    if (!before) throw new ActionError("Service not found.");
    if (d.imageId && !(await Media.exists({ _id: d.imageId }))) throw new ActionError("Choose an image from the media library.", { imageId: "Not found." });
    const approved = d.approvedActivities.map((l) => {
      const [title, ...rest] = l.split(" — ");
      return { title: title.trim(), description: rest.join(" — ").trim() };
    });
    const update = {
      title: d.title,
      shortTitle: d.shortTitle,
      status: d.status,
      published: d.published,
      summary: d.summary,
      seoTitle: d.seoTitle,
      metaDescription: d.metaDescription,
      overview: d.overview,
      objectives: d.objectives,
      approvedActivities: approved,
      potentialInitiatives: d.potentialInitiatives,
      eligibility: d.eligibility,
      enquiry: d.enquiry,
      imageId: d.imageId,
      updatedBy: new Types.ObjectId(admin.id),
    };
    await Service.updateOne({ slug: d.slug }, { $set: update });
    await audit(admin, {
      action: "content.service_updated",
      entityType: "Service",
      entityId: d.slug,
      summary: `Updated service “${d.title}”${before.published !== d.published ? (d.published ? " and published it" : " and hid it from the website") : ""}.`,
      details: { changed: Object.keys(diff(before as unknown as Record<string, unknown>, update)) },
    });
    bump(CMS_TAGS.services, "/admin/content/services");
    return { ok: true, message: "Service saved and the website updated." };
  });
}

/* ---------------- Activities ---------------- */

const activitySchema = z.object({
  id: z.string().optional().default(""),
  slug,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10, "Describe the activity.").max(4000),
  date: isoDate,
  location: z.string().trim().max(160).default(""),
  status: z.enum(["planned", "completed"]),
  serviceSlug: z.string().trim().max(80).default(""),
  mediaIds: z.array(z.string().refine((v) => Types.ObjectId.isValid(v))).max(12).default([]),
  published: z.boolean(),
  verifiedCompleted: z.boolean().default(false),
});

export async function saveActivity(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("content:manage", activitySchema, input, async (d, admin) => {
    if (d.status === "completed" && d.published && !d.verifiedCompleted) {
      throw new ActionError("Confirm that this activity has taken place and been verified before publishing it as completed.", { verifiedCompleted: "Required." });
    }
    await connectDb();
    const data = {
      slug: d.slug,
      title: d.title,
      description: d.description,
      date: d.date,
      location: d.location || undefined,
      status: d.status,
      serviceSlug: d.serviceSlug || null,
      mediaIds: d.mediaIds.map((m) => new Types.ObjectId(m)),
      published: d.published,
      updatedBy: new Types.ObjectId(admin.id),
    };
    let id = d.id;
    try {
      if (id) {
        if (!Types.ObjectId.isValid(id)) throw new ActionError("Invalid activity.");
        const before = await Activity.findById(id).lean();
        if (!before) throw new ActionError("Activity not found.");
        await Activity.updateOne({ _id: id }, { $set: { ...data, publishedAt: d.published && !before.published ? new Date() : before.publishedAt } });
      } else {
        id = (await new Activity({ ...data, publishedAt: d.published ? new Date() : null }).save()).id;
      }
    } catch (error) {
      if (isDuplicateKey(error)) throw new ActionError("Another activity already uses this URL slug.", { slug: "Already in use." });
      throw error;
    }
    await audit(admin, { action: d.id ? "content.activity_updated" : "content.activity_created", entityType: "Activity", entityId: id, summary: `${d.id ? "Updated" : "Created"} activity “${d.title}” (${d.published ? "published" : "not published"}).` });
    bump(CMS_TAGS.activities, "/admin/content/activities");
    updateTag(CMS_TAGS.services);
    return { ok: true, message: d.published ? "Saved and published." : "Saved (not published).", data: { id } };
  });
}

export async function deleteActivity(input: unknown) {
  return runAction("content:manage", z.object({ id: objectId }), input, async (d, admin) => {
    await connectDb();
    const doc = await Activity.findByIdAndDelete(d.id).lean();
    if (!doc) throw new ActionError("Activity not found.");
    await audit(admin, { action: "content.activity_deleted", entityType: "Activity", entityId: d.id, summary: `Deleted activity “${doc.title}”.` });
    bump(CMS_TAGS.activities, "/admin/content/activities");
    return { ok: true, message: "Activity deleted." };
  });
}

/* ---------------- News ---------------- */

const newsSchema = z.object({
  id: z.string().optional().default(""),
  slug,
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(400),
  body: z.string().max(30000).default(""),
  category: z.enum(["Announcement", "News", "Notice"]),
  featuredImageId: optionalId,
  publishDate: isoDate,
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(200).default(""),
  status: z.enum(["draft", "published"]),
});

export async function saveNews(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("content:manage", newsSchema, input, async (d, admin) => {
    await connectDb();
    const data = { ...d, id: undefined, updatedBy: new Types.ObjectId(admin.id) };
    delete data.id;
    let id = d.id;
    try {
      if (id) {
        if (!Types.ObjectId.isValid(id)) throw new ActionError("Invalid article.");
        const res = await NewsArticle.updateOne({ _id: id }, { $set: data });
        if (!res.matchedCount) throw new ActionError("Article not found.");
      } else {
        id = (await new NewsArticle(data).save()).id;
      }
    } catch (error) {
      if (isDuplicateKey(error)) throw new ActionError("Another article already uses this URL slug.", { slug: "Already in use." });
      throw error;
    }
    await audit(admin, { action: d.id ? "content.news_updated" : "content.news_created", entityType: "NewsArticle", entityId: id, summary: `${d.id ? "Updated" : "Created"} article “${d.title}” (${d.status}).` });
    bump(CMS_TAGS.news, "/admin/content/news");
    return { ok: true, message: d.status === "published" ? "Saved and published." : "Draft saved.", data: { id } };
  });
}

export async function deleteNews(input: unknown) {
  return runAction("content:manage", z.object({ id: objectId }), input, async (d, admin) => {
    await connectDb();
    const doc = await NewsArticle.findByIdAndDelete(d.id).lean();
    if (!doc) throw new ActionError("Article not found.");
    await audit(admin, { action: "content.news_deleted", entityType: "NewsArticle", entityId: d.id, summary: `Deleted article “${doc.title}”.` });
    bump(CMS_TAGS.news, "/admin/content/news");
    return { ok: true, message: "Article deleted." };
  });
}

/* ---------------- Public documents ---------------- */

/** Create/update a public document (metadata + optional PDF). Publishing requires documents:publish. */
export async function saveDocument(form: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await authorize("documents:manage");
    const schema = z.object({
      id: z.string().default(""),
      title: z.string().trim().min(3, "Enter a title.").max(160),
      description: z.string().trim().min(10, "Describe the document.").max(600),
      category: z.enum(DOCUMENT_CATEGORIES),
      docDate: z.string().trim().max(40).default(""),
      visibility: z.enum(["public", "on_request"]),
      order: z.coerce.number().int().min(0).max(999).default(0),
      removeFile: z.boolean().default(false),
      confirmRedacted: z.boolean().default(false),
    });
    const parsed = schema.safeParse({
      id: String(form.get("id") ?? ""),
      title: form.get("title"),
      description: form.get("description"),
      category: form.get("category"),
      docDate: form.get("docDate") ?? "",
      visibility: form.get("visibility"),
      order: form.get("order") ?? 0,
      removeFile: form.get("removeFile") === "on",
      confirmRedacted: form.get("confirmRedacted") === "on",
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fe };
    }
    const d = parsed.data;
    await connectDb();
    const upload = form.get("file");
    let file: { fileId: Types.ObjectId; name: string; size: number; mime: string } | null | undefined;
    if (upload instanceof File && upload.size > 0) {
      if (!d.confirmRedacted) return { ok: false, error: "Confirm that personal details have been removed from the file.", fieldErrors: { confirmRedacted: "Required." } };
      const v = await validateUpload(upload, { allowed: ["application/pdf"], maxBytes: 10 * 1024 * 1024 });
      const fileId = await putFile("public_files", { bytes: v.bytes, filename: v.filename, mime: v.mime, metadata: { kind: "public-document" } });
      file = { fileId, name: v.filename, size: v.size, mime: v.mime };
    }
    const existing = d.id && Types.ObjectId.isValid(d.id) ? await PublicDocument.findById(d.id) : null;
    if (d.id && !existing) return { ok: false, error: "Document not found." };
    const doc = existing ?? new PublicDocument({ status: "draft" });
    const oldFile = doc.file?.fileId;
    doc.title = d.title;
    doc.description = d.description;
    doc.category = d.category;
    doc.docDate = d.docDate || undefined;
    doc.visibility = d.visibility;
    doc.order = d.order;
    if (file) doc.file = file;
    else if (d.removeFile) doc.file = null;
    doc.updatedBy = new Types.ObjectId(admin.id);
    await doc.save();
    if (oldFile && (file || d.removeFile)) await deleteFile("public_files", oldFile);
    await audit(admin, {
      action: existing ? "content.document_updated" : "content.document_created",
      entityType: "PublicDocument",
      entityId: doc.id,
      summary: `${existing ? "Updated" : "Created"} document “${d.title}”${file ? " with a new file" : ""}.`,
    });
    bump(CMS_TAGS.documents, "/admin/content/documents");
    return { ok: true, message: doc.status === "published" ? "Saved. The public page has been updated." : "Saved as draft.", data: { id: doc.id } };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message, fieldErrors: { file: error.message } };
    if (error instanceof AuthError) return { ok: false, error: error.message };
    console.error("[document save]", error);
    return { ok: false, error: "The document could not be saved." };
  }
}

export async function setDocumentPublished(input: unknown) {
  return runAction("documents:publish", z.object({ id: objectId, publish: z.boolean() }), input, async (d, admin) => {
    await connectDb();
    const doc = await PublicDocument.findByIdAndUpdate(
      d.id,
      { $set: d.publish ? { status: "published", publishedBy: new Types.ObjectId(admin.id), publishedAt: new Date() } : { status: "draft" } },
      { returnDocument: "after" },
    ).lean();
    if (!doc) throw new ActionError("Document not found.");
    await audit(admin, { action: d.publish ? "content.document_published" : "content.document_unpublished", entityType: "PublicDocument", entityId: d.id, summary: `${d.publish ? "Published" : "Unpublished"} document “${doc.title}”.` });
    bump(CMS_TAGS.documents, "/admin/content/documents");
    return { ok: true, message: d.publish ? "Document published." : "Document unpublished." };
  });
}

export async function deleteDocument(input: unknown) {
  return runAction("documents:manage", z.object({ id: objectId }), input, async (d, admin) => {
    await connectDb();
    const doc = await PublicDocument.findById(d.id).lean();
    if (!doc) throw new ActionError("Document not found.");
    if (doc.status === "published" && !admin.permissions.includes("documents:publish")) throw new ActionError("Only users who can publish documents can delete a published one.");
    await PublicDocument.deleteOne({ _id: d.id });
    if (doc.file) await deleteFile("public_files", doc.file.fileId);
    await audit(admin, { action: "content.document_deleted", entityType: "PublicDocument", entityId: d.id, summary: `Deleted document “${doc.title}”.` });
    bump(CMS_TAGS.documents, "/admin/content/documents");
    return { ok: true, message: "Document deleted." };
  });
}

/* ---------------- Media library ---------------- */

export async function uploadMedia(form: FormData): Promise<ActionResult> {
  try {
    const admin = await authorize("content:manage");
    const alt = String(form.get("alt") ?? "").trim();
    if (alt.length < 5) return { ok: false, error: "Describe the image for people who cannot see it (alt text).", fieldErrors: { alt: "At least 5 characters." } };
    if (form.get("approved") !== "on") return { ok: false, error: "Confirm the image is approved for public use.", fieldErrors: { approved: "Required." } };
    const v = await validateUpload(form.get("file") as File, { allowed: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 });
    await connectDb();
    const fileId = await putFile("public_files", { bytes: v.bytes, filename: v.filename, mime: v.mime, metadata: { kind: "media" } });
    const media = await new Media({ fileId, filename: v.filename, mime: v.mime, size: v.size, alt: alt.slice(0, 200), uploadedBy: new Types.ObjectId(admin.id), uploadedByName: admin.name }).save();
    await audit(admin, { action: "content.media_uploaded", entityType: "Media", entityId: media.id, summary: `Uploaded image “${v.filename}”.` });
    revalidatePath("/admin/content/media");
    return { ok: true, message: "Image uploaded." };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message, fieldErrors: { file: error.message } };
    if (error instanceof AuthError) return { ok: false, error: error.message };
    console.error("[media upload]", error);
    return { ok: false, error: "The image could not be uploaded." };
  }
}

export async function updateMediaAlt(input: unknown) {
  return runAction("content:manage", z.object({ id: objectId, alt: z.string().trim().min(5, "At least 5 characters.").max(200) }), input, async (d, admin) => {
    await connectDb();
    const res = await Media.updateOne({ _id: d.id }, { $set: { alt: d.alt } });
    if (!res.matchedCount) throw new ActionError("Image not found.");
    await audit(admin, { action: "content.media_updated", entityType: "Media", entityId: d.id, summary: "Updated image alt text." });
    updateTag(CMS_TAGS.services);
    revalidatePath("/admin/content/media");
    return { ok: true, message: "Alt text saved." };
  });
}

export async function deleteMedia(input: unknown) {
  return runAction("content:manage", z.object({ id: objectId }), input, async (d, admin) => {
    await connectDb();
    const id = new Types.ObjectId(d.id);
    const [svc, act, news] = await Promise.all([Service.exists({ imageId: id }), Activity.exists({ mediaIds: id }), NewsArticle.exists({ featuredImageId: id })]);
    if (svc || act || news) throw new ActionError("This image is used on the website. Remove it from the service, activity or article first.");
    const media = await Media.findByIdAndDelete(id).lean();
    if (!media) throw new ActionError("Image not found.");
    await deleteFile("public_files", media.fileId);
    await audit(admin, { action: "content.media_deleted", entityType: "Media", entityId: d.id, summary: `Deleted image “${media.filename}”.` });
    revalidatePath("/admin/content/media");
    return { ok: true, message: "Image deleted." };
  });
}
