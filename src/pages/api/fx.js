// Live exchange rates via open.er-api.com (free, no key).
// Returns rates relative to a base currency (default USD).

import { cacheGet } from "../../lib/serverCache";

const TTL_MS = 1000 * 60 * 60; // 1h — rates update roughly daily

export default async function handler(req, res) {
  const base = String(req.query.base || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(base)) {
    return res.status(400).json({ error: "Invalid base currency" });
  }

  const cacheKey = `fx:${base}`;
  const force = req.query.refresh === "1";
  const cached = force ? null : cacheGet(cacheKey, TTL_MS);
  if (cached) {
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
    return res.status(200).json(cached);
  }

  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!r.ok) throw new Error(`FX upstream ${r.status}`);
    const j = await r.json();
    if (j.result !== "success") throw new Error("FX upstream error");
    const data = {
      base,
      rates: j.rates || {},
      updated: j.time_last_update_utc || null,
      source: "open.er-api.com",
    };
    cacheSet(cacheKey, data);
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: "Exchange rates temporarily unavailable" });
  }
}
