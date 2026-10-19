import Link from "next/link";
import { CalendarDays, Newspaper } from "lucide-react";
import { formatDate, sortByDateDesc } from "@/content/updates";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink, TextLink } from "@/components/ui/Button";

type Item = { slug: string; title: string; date: string; summary: string; category: string; imageUrl?: string | null };

/** List of published news items with an honest empty state. */
export function UpdatesList({ items, limit, headingLevel = "h3" }: { items: Item[]; limit?: number; headingLevel?: "h2" | "h3" }) {
  const list = sortByDateDesc(items).slice(0, limit ?? items.length);
  const Heading = headingLevel;

  if (list.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        icon={<Newspaper aria-hidden className="size-6" />}
        headingLevel={headingLevel}
        action={
          <>
            <ButtonLink href="/contact" variant="outline">
              Ask us a question
            </ButtonLink>
            <ButtonLink href="/get-involved" variant="primary">
              Get involved
            </ButtonLink>
          </>
        }
      >
        H R Foundation will publish news and announcements here once they are approved. We do not post sample or placeholder stories.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {list.map((item) => (
        <li key={item.slug} className="grid gap-4 py-8 md:grid-cols-[12rem_1fr] md:gap-10">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted md:flex-col md:items-start">
            <span className="eyebrow text-gold-ink">{item.category}</span>
            <span className="flex items-center gap-2">
              <CalendarDays aria-hidden className="size-4" />
              <time dateTime={item.date}>{formatDate(item.date)}</time>
            </span>
          </div>
          <article>
            <Heading className="font-display text-2xl font-bold text-forest">
              <Link href={`/news/${item.slug}`} className="hover:underline">
                {item.title}
              </Link>
            </Heading>
            <p className="mt-3 text-lg leading-relaxed text-muted">{item.summary}</p>
            <TextLink href={`/news/${item.slug}`} className="mt-4">
              Read more<span className="sr-only">: {item.title}</span>
            </TextLink>
          </article>
        </li>
      ))}
    </ul>
  );
}
