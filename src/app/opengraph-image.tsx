import { ImageResponse } from "next/og";

export const alt = "Fresh Holds — where are the fresh holds right now?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadGoogleFont(family: string, weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`Could not resolve Google Font ${family} ${weight}`);
  return fetch(match[1]).then((res) => res.arrayBuffer());
}

export default async function Image() {
  const fontText = "where are the fresh holds right now?";

  const baloo800 = await loadGoogleFont("Baloo 2", 800, fontText);

  const dotSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='#1a1a2e' fill-opacity='0.12'><circle cx='0' cy='0' r='1'/><circle cx='40' cy='0' r='1'/><circle cx='0' cy='40' r='1'/><circle cx='40' cy='40' r='1'/><circle cx='20' cy='20' r='1'/></g></svg>`;
  const dotUrl = `data:image/svg+xml;base64,${Buffer.from(dotSvg).toString("base64")}`;

  const background = "#fafaf6";
  const foreground = "#181822";
  const cobalt = "#1d3fc2";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: background,
          backgroundImage: `url(${dotUrl})`,
          backgroundRepeat: "repeat",
          backgroundSize: "40px 40px",
          padding: "80px 96px",
          fontFamily: "Baloo 2",
          color: foreground,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 120,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: "-0.025em",
          }}
        >
          <div style={{ display: "flex" }}>where are the</div>
          <div style={{ display: "flex", color: cobalt }}>fresh holds</div>
          <div style={{ display: "flex" }}>right now?</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Baloo 2", data: baloo800, weight: 800, style: "normal" }],
    },
  );
}
