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
  const fontText =
    "where are the fresh holds right now?Fresh HoldsFHBratislava bouldering · personal freshness scorefresh-holds.janci.dev";

  const [baloo700, baloo800] = await Promise.all([
    loadGoogleFont("Baloo 2", 700, fontText),
    loadGoogleFont("Baloo 2", 800, fontText),
  ]);

  const dotSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='#1a1a2e' fill-opacity='0.12'><circle cx='0' cy='0' r='1'/><circle cx='40' cy='0' r='1'/><circle cx='0' cy='40' r='1'/><circle cx='40' cy='40' r='1'/><circle cx='20' cy='20' r='1'/></g></svg>`;
  const dotUrl = `data:image/svg+xml;base64,${Buffer.from(dotSvg).toString("base64")}`;

  const background = "#fafaf6";
  const foreground = "#181822";
  const muted = "#5d5e6e";
  const cobalt = "#1d3fc2";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: background,
          backgroundImage: `url(${dotUrl})`,
          backgroundRepeat: "repeat",
          backgroundSize: "40px 40px",
          padding: "80px 96px",
          fontFamily: "Baloo 2",
          color: foreground,
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: foreground,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: cobalt,
              color: background,
              marginRight: 20,
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            FH
          </div>
          Fresh Holds
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 110,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: "-0.025em",
          }}
        >
          <div style={{ display: "flex" }}>where are the</div>
          <div style={{ display: "flex", color: cobalt }}>fresh holds</div>
          <div style={{ display: "flex" }}>right now?</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 30,
            fontWeight: 700,
            color: muted,
          }}
        >
          <span>Bratislava bouldering · personal freshness score</span>
          <span style={{ color: cobalt }}>fresh-holds.janci.dev</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Baloo 2", data: baloo700, weight: 700, style: "normal" },
        { name: "Baloo 2", data: baloo800, weight: 800, style: "normal" },
      ],
    },
  );
}
