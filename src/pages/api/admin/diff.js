// Admin: compare BUNDLED reference population against LIVE World Bank population.
// Read-only. Requires the admin code. Returns a list of mismatches so you can
// decide whether a data refresh (rebuild) is worthwhile.

import { isAuthorized } from "../../../lib/adminAuth";
import { getAllCountries } from "../../../lib/countries";

const WB_ALL_POP =
  "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400";

// How different values must be (fraction) to count as a mismatch worth showing.
const THRESHOLD = 0.02; // 2%

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized. Provide a valid admin code." });
  }

  let liveByIso3 = new Map();
  let sourceYear = null;
  try {
    const r = await fetch(WB_ALL_POP, { headers: { "User-Agent": "atlas-admin" } });
    if (!r.ok) throw new Error(`World Bank HTTP ${r.status}`);
    const json = await r.json();
    const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
    for (const row of rows) {
      const iso3 = row.countryiso3code;
      if (iso3 && row.value != null) {
        liveByIso3.set(iso3.toUpperCase(), { value: Number(row.value), year: Number(row.date) });
        if (!sourceYear || Number(row.date) > sourceYear) sourceYear = Number(row.date);
      }
    }
  } catch (e) {
    return res.status(502).json({ error: `Could not reach World Bank: ${e.message}` });
  }

  const mismatches = [];
  let compared = 0;
  let missingLive = 0;

  for (const c of getAllCountries()) {
    const live = liveByIso3.get(c.cca3);
    if (!live) {
      missingLive++;
      continue;
    }
    if (c.population == null) continue;
    compared++;
    const diff = Math.abs(live.value - c.population);
    const frac = c.population ? diff / c.population : 1;
    if (frac >= THRESHOLD) {
      mismatches.push({
        name: c.name,
        cca3: c.cca3,
        stored: c.population,
        live: live.value,
        liveYear: live.year,
        deltaPct: Number((frac * 100).toFixed(1)),
      });
    }
  }

  mismatches.sort((a, b) => b.deltaPct - a.deltaPct);

  return res.status(200).json({
    source: "World Bank SP.POP.TOTL (most recent value)",
    sourceYear,
    comparedCountries: compared,
    missingLive,
    mismatchCount: mismatches.length,
    threshold: `${THRESHOLD * 100}%`,
    mismatches,
  });
}
