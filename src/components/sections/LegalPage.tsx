import type { ReactNode } from "react";
import { PageHero } from "./PageHero";
import { PendingNote } from "@/components/ui/States";
import { RichText } from "./RichText";

export function LegalPage({ title, label, intro, updated, body, children }: { title: string; label: string; intro: string; updated: string; body?: string; children?: ReactNode }) {
  return (
    <>
      <PageHero crumbs={[{ label }]} eyebrow={`Last updated: ${updated}`} title={title} intro={intro} />
      <section className="bg-ivory py-16 sm:py-20">
        <div className="container-site">
          <article className="max-w-3xl">
            <PendingNote className="mb-8">
              This document is a draft prepared for H R Foundation&apos;s review. It should be checked by the foundation and,
              ideally, a legal adviser before the website is launched.
            </PendingNote>
            {body ? <RichText text={body} /> : <div className="prose-site">{children}</div>}
          </article>
        </div>
      </section>
    </>
  );
}
