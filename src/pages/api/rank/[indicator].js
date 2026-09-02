// Live ranking data: fetches ONE World Bank indicator's most-recent value for
// ALL countries in a single batched call, then returns a ranked list.
// Used by the live-metric rankings page.

import { INDICATORS } from "../../../lib/indicators";
import { getCountryByCode } from "../../../lib/countries";
import { cacheGet, cacheSet } from "../../../lib/serverCache";

const WB_BASE = "https://api.worldbank.org/v2";
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

export default async function handler(req, res) {
  const key = String(req.query.indicator || "");
  const meta = INDICATORS.find((i) => i.key === key);
  if (!meta) return res.status(400).json({ error: "Unknown indicator" });

  const cacheKey = `rank:${key}`;
  const cached = req.query.refresh === "1" ? null : cacheGet(cacheKey, TTL_MS);
  if (cached) {
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).json(cached);
  }

  try {
    const url = `${WB_BASE}/country/all/indicator/${meta.id}?format=json&mrnev=1&per_page=400`;
    const r = await fetch(url, { headers: { "User-Agent": "atlas" } });
    if (!r.ok) throw new Error(`World Bank HTTP ${r.status}`);
    const json = await r.json();
    const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];

    const items = [];
    for (const row of rows) {
      if (row.value == null) continue;
      const iso3 = row.countryiso3code;
      const country = getCountryByCode(iso3);
      if (!country) continue; // skip aggregates (regions, income groups)
      items.push({
        cca3: country.cca3,
        name: country.name,
        slug: country.slug,
        region: country.region,
        flag: country.flag.w160,
        value: Number(row.value),
        year: Number(row.date),
      });
    }

    const data = {
      indicator: key,
      label: meta.label,
      kind: meta.kind,
      unit: meta.unit,
      source: "World Bank",
      items,
    };
    cacheSet(cacheKey, data);
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: `Live ranking unavailable: ${e.message}` });
  }
}
