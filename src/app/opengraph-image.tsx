import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "H R Foundation logo — People · Opportunity · Healthier Tomorrows. Charitable trust, Telangana, India.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadLogo() {
  "use cache";
  const logo = await readFile(join(process.cwd(), "public/brand/hr-foundation-logo.png"));
  return `data:image/png;base64,${logo.toString("base64")}`;
}

export default async function OpengraphImage() {
  const logoSrc = await loadLogo();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f8f6f0" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 56 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={560} height={379} alt="" />
        </div>
        <div
          style={{
            width: 460,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#153d32",
            color: "#f8f6f0",
            padding: 56,
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 5, color: "#c7a56a", textTransform: "uppercase" }}>Charitable trust</div>
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.05, marginTop: 24, letterSpacing: -1.5 }}>
            A future built on compassion.
          </div>
          <div style={{ fontSize: 24, marginTop: 28, color: "rgba(248,246,240,0.75)" }}>Peddapalli, Telangana, India</div>
        </div>
      </div>
    ),
    size,
  );
}
