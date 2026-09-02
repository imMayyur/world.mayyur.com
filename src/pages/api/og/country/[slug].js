// Dynamic Open Graph image for country pages, rendered with next/og
// (ImageResponse). Runs on the edge runtime. No external image assets needed.
import { ImageResponse } from "next/og";
import countries from "../../../../data/countries.json";

export const config = { runtime: "edge" };

// Build a slug -> minimal record map once per instance.
function findBySlug(slug) {
  const s = String(slug || "").replace(/\.png$/, "").toLowerCase();
  return countries.find((c) => c.slug === s) || null;
}

function compact(n) {
  if (n == null) return "—";
  const u = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [v, s] of u) if (Math.abs(n) >= v) return `${parseFloat((n / v).toFixed(1))}${s}`;
  return String(n);
}

export default function handler(req) {
  const { searchParams, pathname } = new URL(req.url);
  const slugParam = searchParams.get("slug") || pathname.split("/").pop();
  const country = findBySlug(slugParam);

  const name = country ? country.name : "Atlas";
  const region = country ? country.region || "" : "Country Intelligence Explorer";
  const capital = country && country.capital ? country.capital : "";
  const pop = country ? compact(country.population) : "";
  const area = country && country.area ? `${compact(country.area)} km²` : "";
  const flag = country && country.cca2 ? `https://flagcdn.com/w320/${country.cca2.toLowerCase()}.png` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(120deg, #4f46e5 0%, #06b6d4 100%)",
          color: "white",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700, opacity: 0.9 }}>
          🌍 Atlas
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          {flag && (
            <img src={flag} width={280} height={187} style={{ borderRadius: 16, objectFit: "cover" }} alt="" />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 32, opacity: 0.9, marginTop: 8 }}>
              {[region, capital].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "48px", fontSize: 34 }}>
          {pop && <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 22, opacity: 0.8 }}>Population</span><b>{pop}</b></div>}
          {area && <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 22, opacity: 0.8 }}>Area</span><b>{area}</b></div>}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
