// Server-side proxy for live World Bank indicators.
//
// Runs on the server so we can (a) fetch many indicators in parallel, (b) cache
// results, and (c) degrade gracefully — one failed indicator never breaks the
// response. The World Bank API is keyless, so no secret is ever involved.

import { INDICATORS } from "../../../lib/indicators";

const WB_BASE = "https://api.worldbank.org/v2";
const RANGE = "2000:2025"; // enough history for trend charts
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

async function fetchIndicator(code, id) {
  const url = `${WB_BASE}/country/${code}/indicator/${id}?format=json&date=${RANGE}&per_page=120`;
  const res = await fetch(url, { headers: { "User-Agent": "atlas" } });
  if (!res.ok) throw new Error(`WB ${id} -> ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
  const meta = Array.isArray(json) ? json[0] : null;

  // Build a clean year->value series (most recent first from the API).
  const series = rows
    .filter((r) => r.value != null)
    .map((r) => ({ year: Number(r.date), value: Number(r.value) }))
    .sort((a, b) => a.year - b.year);

  const latest = series.length ? series[series.length - 1] : null;

  return {
    latest: latest ? latest.value : null,
    year: latest ? latest.year : null,
    series,
    lastUpdated: meta ? meta.lastupdated || null : null,
  };
}

export default async function handler(req, res) {
  const { cca3 } = req.query;
  const code = String(cca3 || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return res.status(400).json({ error: "Invalid country code" });
  }

  const cacheKey = `wb:${code}`;
  const force = req.query.refresh === "1";
  const cached = force ? null : cacheGet(cacheKey, TTL_MS);
  if (cached) {
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).json(cached);
  }

  const results = await Promise.allSettled(INDICATORS.map((ind) => fetchIndicator(code, ind.id)));

  const data = { code, source: "World Bank", indicators: {} };
  let anySuccess = false;

  INDICATORS.forEach((ind, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.latest != null) {
      data.indicators[ind.key] = r.value;
      anySuccess = true;
    } else {
      data.indicators[ind.key] = { latest: null, year: null, series: [], lastUpdated: null };
    }
  });

  if (!anySuccess) {
    // Don't cache a total failure — let the next request retry.
    return res.status(502).json({ error: "Upstream data unavailable", ...data });
  }

  cacheSet(cacheKey, data);
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return res.status(200).json(data);
}
