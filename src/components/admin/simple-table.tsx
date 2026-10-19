import type { ReactNode } from "react";

/** Lightweight accessible table for short, unpaginated lists (content items, settings). */
export function SimpleTable({ caption, headers, rows, empty = "Nothing here yet." }: { caption: string; headers: string[]; rows: ReactNode[][]; empty?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-ivory/70">
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((cells, i) => (
                <tr key={i} className="hover:bg-ivory/50">
                  {cells.map((c, j) => (
                    <td key={j} className="px-4 py-3 align-middle">
                      {c}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
