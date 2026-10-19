import { Download, FileLock2, FileText } from "lucide-react";
import Link from "next/link";
import { documentCategories, type FoundationDocument } from "@/content/documents";

/** Lists foundation documents grouped by category. Only approved files get a download link. */
export function DocumentList({ documents }: { documents: FoundationDocument[] }) {
  const groups = Object.entries(documentCategories)
    .map(([key, label]) => ({ key, label, items: documents.filter((d) => d.category === key) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`docs-${group.key}`}>
          <h2 id={`docs-${group.key}`} className="eyebrow text-gold-ink">
            {group.label}
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {group.items.map((doc) => (
              <li key={doc.title} className="grid gap-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-6">
                <span className="grid size-12 place-items-center rounded-xl bg-sage text-forest">
                  {doc.availability === "public" ? <FileText aria-hidden className="size-5" /> : <FileLock2 aria-hidden className="size-5" />}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-forest">{doc.title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{doc.description}</p>
                  {doc.date && <p className="mt-1 text-sm text-muted">Dated {doc.date}</p>}
                </div>
                {doc.availability === "public" && doc.file ? (
                  <a
                    href={doc.file}
                    download
                    className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-ivory hover:bg-forest-soft"
                  >
                    <Download aria-hidden className="size-4" />
                    Download PDF{doc.fileSize && <span className="sr-only">, {doc.fileSize}</span>}
                    <span className="sr-only">: {doc.title}</span>
                  </a>
                ) : (
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-full border border-forest/25 px-5 py-2.5 text-sm font-semibold text-forest hover:bg-sage"
                  >
                    Available on request<span className="sr-only">: {doc.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
