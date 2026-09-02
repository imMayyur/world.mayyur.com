import { getAllCountries } from "../lib/countries";
import { SITE_URL } from "../lib/site";

// Static top-level routes worth indexing.
const STATIC_PATHS = [
  "/",
  "/map",
  "/compare",
  "/world",
  "/lab",
  "/battle",
  "/borders",
  "/play",
  "/game",
  "/quiz",
  "/favorites",
  "/sources",
  "/rankings/population",
  "/rankings/area",
  "/rankings/density",
  "/rankings/gdp",
  "/rankings/gdpPerCapita",
  "/rankings/lifeExpectancy",
];

function url(loc, priority, changefreq) {
  return `  <url><loc>${SITE_URL}${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const entries = [
    ...STATIC_PATHS.map((p) => url(p, p === "/" ? "1.0" : "0.7", "weekly")),
    ...getAllCountries().map((c) => url(`/country/${c.slug}`, "0.8", "monthly")),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default SiteMap;
