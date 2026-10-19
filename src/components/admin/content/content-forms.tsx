"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import {
  deleteActivity,
  deleteDocument,
  deleteMedia,
  deleteNews,
  revertPageToDefault,
  saveActivity,
  saveDocument,
  saveNews,
  savePage,
  saveService,
  setDocumentPublished,
  updateMediaAlt,
  uploadMedia,
} from "@/app/admin/actions/content";
import { useAction } from "@/components/admin/use-action";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { ConfirmDialog } from "@/components/admin/ui/dialog";
import { Checkbox, Field, fieldA11y, Input, NativeSelect, Textarea } from "@/components/admin/ui/form";
import type { ActionResult } from "@/lib/actions";

export type MediaOption = { id: string; filename: string; alt: string };

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={value.length > max ? "text-danger" : "text-muted"}>
      {value.length}/{max}
    </span>
  );
}

/* ---------------- Page editor ---------------- */

export function PageEditor({
  page,
}: {
  page: { key: string; label: string; path: string; hasBody: boolean; draft: { title: string; intro: string; seoTitle: string; seoDescription: string; body: string } };
}) {
  const [v, setV] = useState(page.draft);
  const { run, pending, fieldErrors: fe } = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const submit = (intent: "draft" | "publish") => run(savePage, { ...v, key: page.key, intent });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit("publish");
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Page header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="title" label="Headline" required error={fe.title} hint={page.key === "home" ? "The last two words are highlighted on the home page." : undefined}>
            <Input {...fieldA11y("title", fe.title, page.key === "home")} value={v.title} onChange={set("title")} />
          </Field>
          <Field id="intro" label="Introduction" error={fe.intro} hint={<Counter value={v.intro} max={600} />}>
            <Textarea {...fieldA11y("intro", fe.intro, true)} value={v.intro} onChange={set("intro")} rows={3} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Search engines & sharing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="seoTitle" label="SEO title" required error={fe.seoTitle} hint={<Counter value={v.seoTitle} max={80} />}>
            <Input {...fieldA11y("seoTitle", fe.seoTitle, true)} value={v.seoTitle} onChange={set("seoTitle")} />
          </Field>
          <Field id="seoDescription" label="Meta description" required error={fe.seoDescription} hint={<Counter value={v.seoDescription} max={200} />}>
            <Textarea {...fieldA11y("seoDescription", fe.seoDescription, true)} value={v.seoDescription} onChange={set("seoDescription")} rows={2} />
          </Field>
          <div className="rounded-lg border border-line bg-ivory p-4 text-sm" aria-label="Search result preview">
            <p className="text-xs text-muted">Search result preview</p>
            <p className="mt-1 font-medium text-[#1a0dab]">{v.seoTitle || "—"}</p>
            <p className="text-xs text-emerald-ink">{page.path}</p>
            <p className="mt-1 text-muted">{v.seoDescription || "—"}</p>
          </div>
        </CardContent>
      </Card>
      {page.hasBody && (
        <Card>
          <CardHeader>
            <CardTitle>Page content</CardTitle>
          </CardHeader>
          <CardContent>
            <Field
              id="body"
              label="Body"
              error={fe.body}
              hint="Formatting: ## Heading, ### Subheading, - list item, **bold**, [link text](/path). Leave a blank line between paragraphs."
            >
              <Textarea {...fieldA11y("body", fe.body, true)} value={v.body} onChange={set("body")} rows={22} className="font-mono text-xs" />
            </Field>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Publish
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => void submit("draft")}>
          Save draft
        </Button>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" disabled={pending}>
              Revert to original text
            </Button>
          }
          title="Revert to the original text?"
          description="The page is restored to the text approved at launch and published immediately. Your current draft is replaced."
          confirmLabel="Revert and publish"
          destructive
          onConfirm={() => void run(revertPageToDefault, { key: page.key }).then((r) => r.ok && window.location.reload())}
        />
      </div>
    </form>
  );
}

/* ---------------- Service editor ---------------- */

export function ServiceEditor({
  service,
  media,
}: {
  service: {
    slug: string;
    title: string;
    shortTitle: string;
    status: string;
    published: boolean;
    summary: string;
    seoTitle: string;
    metaDescription: string;
    overview: string;
    objectives: string;
    approvedActivities: string;
    potentialInitiatives: string;
    eligibility: string;
    enquiry: string;
    imageId: string;
  };
  media: MediaOption[];
}) {
  const { run, pending, fieldErrors: fe } = useAction();
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        void run(saveService, { ...data, slug: service.slug, published: data.published === "on" });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="title" label="Title" required error={fe.title}>
            <Input {...f("title")} defaultValue={service.title} />
          </Field>
          <Field id="shortTitle" label="Short title (menus)" required error={fe.shortTitle}>
            <Input {...f("shortTitle")} defaultValue={service.shortTitle} />
          </Field>
          <Field id="status" label="Status label" required error={fe.status} hint="Only use “Registered objective” for objects in the trust's registration.">
            <NativeSelect {...fieldA11y("status", fe.status, true)} name="status" defaultValue={service.status}>
              <option value="registered-objective">Registered objective</option>
              <option value="pending-confirmation">Pending confirmation</option>
              <option value="proposed">Proposed — subject to approval</option>
            </NativeSelect>
          </Field>
          <Field id="imageId" label="Image (optional)" error={fe.imageId}>
            <NativeSelect {...f("imageId")} defaultValue={service.imageId}>
              <option value="">No image</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.filename} — {m.alt}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <Checkbox name="published" defaultChecked={service.published} /> Show this service on the website (unchecked services return “not found”)
          </label>
          <Field id="summary" label="Summary" required error={fe.summary} className="md:col-span-2">
            <Textarea {...f("summary")} defaultValue={service.summary} rows={2} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Page content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="overview" label="Overview" hint="Separate paragraphs with a blank line." error={fe.overview}>
            <Textarea {...f("overview")} defaultValue={service.overview} rows={6} />
          </Field>
          <Field id="objectives" label="Objectives" hint="One per line." error={fe.objectives}>
            <Textarea {...f("objectives")} defaultValue={service.objectives} rows={4} />
          </Field>
          <Field id="approvedActivities" label="Approved activities" hint="Only activities formally approved by the trustees. One per line as: Title — description." error={fe.approvedActivities}>
            <Textarea {...f("approvedActivities")} defaultValue={service.approvedActivities} rows={4} />
          </Field>
          <Field id="potentialInitiatives" label="Ideas under consideration" hint="One per line. Always shown with a “Proposed — not yet operational” label." error={fe.potentialInitiatives}>
            <Textarea {...f("potentialInitiatives")} defaultValue={service.potentialInitiatives} rows={3} />
          </Field>
          <Field id="eligibility" label="Eligibility notes" hint="One per line." error={fe.eligibility}>
            <Textarea {...f("eligibility")} defaultValue={service.eligibility} rows={3} />
          </Field>
          <Field id="enquiry" label="How to enquire" error={fe.enquiry}>
            <Textarea {...f("enquiry")} defaultValue={service.enquiry} rows={3} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="seoTitle" label="SEO title (optional)" error={fe.seoTitle}>
            <Input {...f("seoTitle")} defaultValue={service.seoTitle} />
          </Field>
          <Field id="metaDescription" label="Meta description" required error={fe.metaDescription}>
            <Textarea {...f("metaDescription")} defaultValue={service.metaDescription} rows={2} />
          </Field>
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save service"}
      </Button>
    </form>
  );
}

/* ---------------- Activity editor ---------------- */

export function ActivityEditor({
  activity,
  services,
  media,
}: {
  activity: { id: string; slug: string; title: string; description: string; date: string; location: string; status: string; serviceSlug: string; mediaIds: string[]; published: boolean } | null;
  services: { slug: string; title: string }[];
  media: MediaOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(activity?.status ?? "planned");
  const [selected, setSelected] = useState<string[]>(activity?.mediaIds ?? []);
  const { run, pending, fieldErrors: fe } = useAction<{ id: string }>();
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        void run(
          saveActivity,
          { ...data, id: activity?.id ?? "", mediaIds: selected, published: data.published === "on", verifiedCompleted: data.verifiedCompleted === "on" },
          { onSuccess: (r) => !activity && r.data && router.push(`/admin/content/activities/${r.data.id}`) },
        );
      }}
    >
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="title" label="Title" required error={fe.title} className="md:col-span-2">
            <Input {...f("title")} defaultValue={activity?.title} />
          </Field>
          <Field id="slug" label="URL slug" required error={fe.slug} hint="e.g. school-kits-2026">
            <Input {...f("slug")} defaultValue={activity?.slug} />
          </Field>
          <Field id="date" label="Date" required error={fe.date}>
            <Input {...f("date")} type="date" defaultValue={activity?.date} />
          </Field>
          <Field id="status" label="Status" required>
            <NativeSelect id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
            </NativeSelect>
          </Field>
          <Field id="location" label="Location (only if approved for publication)" error={fe.location}>
            <Input {...f("location")} defaultValue={activity?.location} />
          </Field>
          <Field id="serviceSlug" label="Related service">
            <NativeSelect id="serviceSlug" name="serviceSlug" defaultValue={activity?.serviceSlug ?? ""}>
              <option value="">None</option>
              {services.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="description" label="Description" required error={fe.description} className="md:col-span-2">
            <Textarea {...f("description")} defaultValue={activity?.description} rows={5} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Approved media</CardTitle>
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <p className="text-sm text-muted">Upload approved images in the Media Library first.</p>
          ) : (
            <fieldset>
              <legend className="sr-only">Choose images</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {media.map((m) => (
                  <label key={m.id} className="cursor-pointer rounded-lg border border-line p-2 has-checked:border-forest has-checked:ring-2 has-checked:ring-forest/20">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected.includes(m.id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/media/${m.id}`} alt={m.alt} className="aspect-video w-full rounded object-cover" loading="lazy" />
                    <span className="mt-1 block truncate text-xs">{m.filename}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="published" defaultChecked={activity?.published ?? false} /> Publish on the website
          </label>
          {status === "completed" && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox name="verifiedCompleted" className="mt-0.5" aria-describedby={fe.verifiedCompleted ? "vc-error" : undefined} /> I confirm this activity has taken place and its details have been
              verified.
            </label>
          )}
          {fe.verifiedCompleted && (
            <p id="vc-error" role="alert" className="text-xs font-medium text-danger">
              Required before publishing a completed activity.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save activity"}
        </Button>
        {activity && <DeleteButton label="Delete activity" onConfirm={(r) => r(deleteActivity, { id: activity.id }).then((x) => x.ok && router.push("/admin/content/activities"))} />}
      </div>
    </form>
  );
}

function DeleteButton({ label, onConfirm }: { label: string; onConfirm: (run: ReturnType<typeof useAction>["run"]) => Promise<unknown> }) {
  const { run, pending } = useAction();
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="ghost" disabled={pending}>
          <Trash2 aria-hidden /> {label}
        </Button>
      }
      title={`${label}?`}
      description="This cannot be undone. The change is recorded in the audit log."
      confirmLabel="Delete"
      destructive
      onConfirm={() => void onConfirm(run)}
    />
  );
}

/* ---------------- News editor ---------------- */

export function NewsEditor({
  article,
  media,
  today,
}: {
  article: { id: string; slug: string; title: string; summary: string; body: string; category: string; featuredImageId: string; publishDate: string; seoTitle: string; seoDescription: string; status: string } | null;
  media: MediaOption[];
  today: string;
}) {
  const router = useRouter();
  const { run, pending, fieldErrors: fe } = useAction<{ id: string }>();
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });
  const save = (form: HTMLFormElement, status: "draft" | "published") => {
    const data = Object.fromEntries(new FormData(form));
    void run(saveNews, { ...data, id: article?.id ?? "", status }, { onSuccess: (r) => !article && r.data && router.push(`/admin/content/news/${r.data.id}`) });
  };
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save(e.currentTarget, "published");
      }}
    >
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="title" label="Title" required error={fe.title} className="md:col-span-2">
            <Input {...f("title")} defaultValue={article?.title} />
          </Field>
          <Field id="slug" label="URL slug" required error={fe.slug} hint="Appears as /news/your-slug">
            <Input {...f("slug")} defaultValue={article?.slug} />
          </Field>
          <Field id="publishDate" label="Publication date" required error={fe.publishDate}>
            <Input {...f("publishDate")} type="date" defaultValue={article?.publishDate ?? today} />
          </Field>
          <Field id="category" label="Category">
            <NativeSelect id="category" name="category" defaultValue={article?.category ?? "News"}>
              <option>Announcement</option>
              <option>News</option>
              <option>Notice</option>
            </NativeSelect>
          </Field>
          <Field id="featuredImageId" label="Featured image (optional)">
            <NativeSelect id="featuredImageId" name="featuredImageId" defaultValue={article?.featuredImageId ?? ""}>
              <option value="">None</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.filename} — {m.alt}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="summary" label="Summary" required error={fe.summary} className="md:col-span-2">
            <Textarea {...f("summary")} defaultValue={article?.summary} rows={2} />
          </Field>
          <Field id="body" label="Article" error={fe.body} className="md:col-span-2" hint="Formatting: ## Heading, - list item, **bold**, [link](/path). Blank line between paragraphs.">
            <Textarea {...fieldA11y("body", fe.body, true)} name="body" defaultValue={article?.body} rows={14} />
          </Field>
          <Field id="seoTitle" label="SEO title (optional)" error={fe.seoTitle}>
            <Input {...f("seoTitle")} defaultValue={article?.seoTitle} />
          </Field>
          <Field id="seoDescription" label="Meta description (optional)" error={fe.seoDescription}>
            <Input {...f("seoDescription")} defaultValue={article?.seoDescription} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {article?.status === "published" ? "Update published article" : "Publish"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => formRef.current && save(formRef.current, "draft")}>
          {article?.status === "published" ? "Unpublish (save as draft)" : "Save draft"}
        </Button>
        {article && <DeleteButton label="Delete article" onConfirm={(r) => r(deleteNews, { id: article.id }).then((x) => x.ok && router.push("/admin/content/news"))} />}
      </div>
    </form>
  );
}

/* ---------------- Document editor ---------------- */

export function DocumentEditor({
  doc,
  canPublish,
}: {
  doc: { id: string; title: string; description: string; category: string; docDate: string; visibility: string; order: number; status: string; fileName: string | null } | null;
  canPublish: boolean;
}) {
  const router = useRouter();
  const { run, pending, fieldErrors: fe } = useAction<{ id: string }>();
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });
  return (
    <div className="space-y-6">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (doc) data.set("id", doc.id);
          void run((() => saveDocument(data)) as (i: unknown) => Promise<ActionResult<{ id: string }>>, null, {
            onSuccess: (r) => !doc && r.data && router.push(`/admin/content/documents/${r.data.id}`),
          });
        }}
      >
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field id="title" label="Title" required error={fe.title} className="md:col-span-2">
              <Input {...f("title")} defaultValue={doc?.title} />
            </Field>
            <Field id="description" label="Description" required error={fe.description} className="md:col-span-2">
              <Textarea {...f("description")} defaultValue={doc?.description} rows={3} />
            </Field>
            <Field id="category" label="Category" required>
              <NativeSelect id="category" name="category" defaultValue={doc?.category ?? "registration"}>
                <option value="registration">Registration</option>
                <option value="tax">Income-tax filings</option>
                <option value="governance">Governance</option>
                <option value="reports">Annual reports & accounts</option>
              </NativeSelect>
            </Field>
            <Field id="docDate" label="Document date (as shown)" error={fe.docDate} hint="e.g. 20 December 2024">
              <Input {...f("docDate")} defaultValue={doc?.docDate} />
            </Field>
            <Field id="visibility" label="Visibility" required hint="“Public download” needs a file and makes it downloadable once published.">
              <NativeSelect id="visibility" name="visibility" defaultValue={doc?.visibility ?? "on_request"}>
                <option value="on_request">Listed — available on request</option>
                <option value="public">Public download</option>
              </NativeSelect>
            </Field>
            <Field id="order" label="Display order" error={fe.order}>
              <Input {...f("order")} type="number" min={0} max={999} defaultValue={doc?.order ?? 0} />
            </Field>
            <Field id="file" label={doc?.fileName ? `Replace file (current: ${doc.fileName})` : "File (PDF, max 10 MB)"} error={fe.file} className="md:col-span-2">
              <Input {...fieldA11y("file", fe.file)} name="file" type="file" accept="application/pdf" className="py-1.5" />
            </Field>
            <label className="flex items-start gap-2 text-sm md:col-span-2">
              <Checkbox name="confirmRedacted" className="mt-0.5" /> I confirm personal details (trustee PAN/Aadhaar, phone numbers, signatures) have been removed from any uploaded file.
            </label>
            {fe.confirmRedacted && (
              <p role="alert" className="text-xs font-medium text-danger md:col-span-2">
                Required when uploading a file.
              </p>
            )}
            {doc?.fileName && (
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <Checkbox name="removeFile" /> Remove the current file
              </label>
            )}
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save document"}
        </Button>
      </form>
      {doc && (
        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              Status: <strong>{doc.status === "published" ? "Published" : "Draft"}</strong>
            </p>
            {canPublish ? (
              <ConfirmDialog
                trigger={<Button variant={doc.status === "published" ? "outline" : "default"}>{doc.status === "published" ? "Unpublish" : "Publish"}</Button>}
                title={doc.status === "published" ? "Unpublish document?" : "Publish document?"}
                description={
                  doc.status === "published"
                    ? "It will no longer appear on the public documents page."
                    : "It will appear on the public documents page. Only publish documents approved by the foundation. Private member and claim documents must never be published."
                }
                confirmLabel={doc.status === "published" ? "Unpublish" : "Publish"}
                onConfirm={() => void run(setDocumentPublished, { id: doc.id, publish: doc.status !== "published" })}
              />
            ) : (
              <p className="text-sm text-muted">Only users with publishing permission can publish documents.</p>
            )}
            <DeleteButton label="Delete document" onConfirm={(r) => r(deleteDocument, { id: doc.id }).then((x) => x.ok && router.push("/admin/content/documents"))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Media library ---------------- */

export function MediaUploader() {
  const formRef = useRef<HTMLFormElement>(null);
  const { run, pending, fieldErrors: fe } = useAction();
  return (
    <form
      ref={formRef}
      className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const r = await run((() => uploadMedia(data)) as (i: unknown) => Promise<ActionResult>, null);
        if (r.ok) formRef.current?.reset();
      }}
    >
      <Field id="file" label="Image (JPG, PNG or WebP, max 5 MB)" error={fe.file}>
        <Input {...fieldA11y("file", fe.file)} name="file" type="file" accept="image/jpeg,image/png,image/webp" className="py-1.5" required />
      </Field>
      <Field id="alt" label="Alt text (describe the image)" error={fe.alt}>
        <Input {...fieldA11y("alt", fe.alt)} name="alt" required />
      </Field>
      <Button type="submit" disabled={pending}>
        <Upload aria-hidden /> {pending ? "Uploading…" : "Upload"}
      </Button>
      <label className="flex items-start gap-2 text-sm md:col-span-3">
        <Checkbox name="approved" className="mt-0.5" /> This image is approved for public use and does not show beneficiaries without documented consent.
      </label>
      {fe.approved && (
        <p role="alert" className="text-xs font-medium text-danger md:col-span-3">
          Required.
        </p>
      )}
    </form>
  );
}

export function MediaItemActions({ id, alt }: { id: string; alt: string }) {
  const [value, setValue] = useState(alt);
  const { run, pending, fieldErrors } = useAction();
  return (
    <div className="space-y-2">
      <label htmlFor={`alt-${id}`} className="sr-only">
        Alt text
      </label>
      <Textarea id={`alt-${id}`} value={value} onChange={(e) => setValue(e.target.value)} rows={2} className="text-xs" aria-invalid={fieldErrors.alt ? true : undefined} />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending || value === alt} onClick={() => run(updateMediaAlt, { id, alt: value })}>
          Save alt
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" disabled={pending}>
              <Trash2 aria-hidden /> Delete
            </Button>
          }
          title="Delete image?"
          description="Images used on the website cannot be deleted until they are removed from the page that uses them."
          confirmLabel="Delete"
          destructive
          onConfirm={() => void run(deleteMedia, { id })}
        />
      </div>
    </div>
  );
}
