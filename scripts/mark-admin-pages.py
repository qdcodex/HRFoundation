"""Adds `export const instant = false;` to every admin panel page (authenticated, per-request pages)."""
import pathlib, re
root = pathlib.Path("src/app/admin/(panel)")
for p in root.rglob("page.tsx"):
    s = p.read_text(encoding="utf-8")
    if "export const instant" in s:
        continue
    # insert after the last import line
    lines = s.split("\n")
    last = max(i for i, l in enumerate(lines) if l.startswith("import "))
    lines.insert(last + 1, "\n/** Authenticated, per-request page: navigation waits for the server. */\nexport const instant = false;")
    p.write_text("\n".join(lines), encoding="utf-8")
    print("marked", p)
