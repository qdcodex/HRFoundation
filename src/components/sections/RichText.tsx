import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders the small, safe markup used by CMS text (no HTML is ever injected):
 * "## Heading", "### Subheading", "- item" lists, blank-line paragraphs, **bold**, [text](/path or https://…).
 */
export function RichText({ text, className = "prose-site" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) return <h3 key={i}>{inline(block.slice(4))}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{inline(block.slice(3))}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else {
      const href = m[3];
      if (href.startsWith("/")) out.push(<Link key={k++} href={href}>{m[2]}</Link>);
      else if (/^https:\/\//.test(href))
        out.push(
          <a key={k++} href={href} target="_blank" rel="noopener noreferrer">
            {m[2]}
          </a>,
        );
      else out.push(m[2]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
