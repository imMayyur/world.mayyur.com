import data from "../data/countries.json";
import { density } from "./format";

// Single source of truth for the whole app.
export const countries = data;

const byCca3 = new Map(countries.map((c) => [c.cca3, c]));
const bySlug = new Map(countries.map((c) => [c.slug, c]));
const byCca2 = new Map(countries.map((c) => [c.cca2, c]));
// ccn3 (numeric ISO code) -> country. Zero-padded to 3 chars to match the
// world-atlas topojson feature ids used by the interactive map.
const byCcn3 = new Map(countries.filter((c) => c.ccn3).map((c) => [String(c.ccn3).padStart(3, "0"), c]));

export function getCountryByCcn3(ccn3) {
  if (!ccn3) return null;
  return byCcn3.get(String(ccn3).padStart(3, "0")) || null;
}

// Compact lookup for the map: { <ccn3>: { name, slug, population, latlng } }.
export function mapIndex() {
  const out = {};
  for (const [id, c] of byCcn3) {
    out[id] = { name: c.name, slug: c.slug, population: c.population, latlng: c.latlng || null };
  }
  return out;
}

export function getAllCountries() {
  return countries;
}

export function getCountryByCode(code) {
  if (!code) return null;
  return byCca3.get(String(code).toUpperCase()) || null;
}

export function getCountryBySlug(slug) {
  if (!slug) return null;
  return bySlug.get(String(slug).toLowerCase()) || null;
}

// Resolve a border code (cca3) to a lightweight neighbour object.
export function getNeighbours(country) {
  if (!country || !country.borders) return [];
  return country.borders.map((code) => byCca3.get(code)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Similarity engine — "Countries like this".
// Uses measurable attributes only (region, population, area, density). We
// normalise each numeric dimension to a log scale (populations/areas span many
// orders of magnitude) and compute a weighted distance. Same region gives a
// small bonus. We never claim cultural similarity from numbers.
// ---------------------------------------------------------------------------
function logSafe(v) {
  return v && v > 0 ? Math.log10(v) : null;
}

export function similarCountries(country, count = 6) {
  if (!country) return [];
  const target = {
    pop: logSafe(country.population),
    area: logSafe(country.area),
    dens: logSafe(density(country)),
  };

  const scored = countries
    .filter((c) => c.cca3 !== country.cca3)
    .map((c) => {
      const cand = {
        pop: logSafe(c.population),
        area: logSafe(c.area),
        dens: logSafe(density(c)),
      };
      let sumSq = 0;
      let dims = 0;
      const reasons = [];
      const consider = (key, weight, label) => {
        if (target[key] == null || cand[key] == null) return;
        const d = Math.abs(target[key] - cand[key]);
        sumSq += weight * d * d;
        dims += weight;
        if (d < 0.15) reasons.push(label); // within ~40% on a log scale
      };
      consider("pop", 1, "Similar population");
      consider("area", 1, "Similar area");
      consider("dens", 1, "Similar density");
      if (dims === 0) return null;
      let dist = Math.sqrt(sumSq / dims);
      if (c.region && c.region === country.region) {
        dist *= 0.75; // same-region bonus
        reasons.unshift("Same region");
      }
      return { country: c, dist, reasons };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count);

  return scored;
}

// ---------------------------------------------------------------------------
// Border graph — shortest land route between two countries (BFS).
// ---------------------------------------------------------------------------
export function borderPath(fromCca3, toCca3) {
  const start = String(fromCca3 || "").toUpperCase();
  const goal = String(toCca3 || "").toUpperCase();
  if (!byCca3.has(start) || !byCca3.has(goal)) return null;
  if (start === goal) return [byCca3.get(start)];

  const queue = [[start]];
  const seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    const country = byCca3.get(last);
    for (const nb of country.borders || []) {
      if (seen.has(nb) || !byCca3.has(nb)) continue;
      const next = [...path, nb];
      if (nb === goal) return next.map((code) => byCca3.get(code));
      seen.add(nb);
      queue.push(next);
    }
  }
  return null; // no land route (island / separate landmass)
}

const REGIONS = [...new Set(countries.map((c) => c.region).filter(Boolean))].sort();
export function getRegions() {
  return REGIONS;
}

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// ---------------------------------------------------------------------------
// Natural-language query parsing.
// Interprets phrases like "population over 100 million", "largest in asia",
// "smallest in europe", "countries using the euro", "high population density".
// Returns { matched: boolean, label, results } or { matched:false } to fall
// back to plain text search.
// ---------------------------------------------------------------------------
const NUM_WORDS = { million: 1e6, billion: 1e9, thousand: 1e3, m: 1e6, b: 1e9, k: 1e3 };

function parseMagnitude(str) {
  // "100 million", "1.4 billion", "50000000"
  const m = str.match(/([\d.,]+)\s*(million|billion|thousand|m|b|k)?/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(base)) return null;
  const mult = m[2] ? NUM_WORDS[m[2].toLowerCase()] : 1;
  return base * mult;
}

export function smartQuery(rawInput) {
  const q = norm(rawInput);
  if (!q) return { matched: false };

  // population over/above/greater than X
  let m = q.match(/population\s+(over|above|greater than|more than|>)\s+(.+)/);
  if (m) {
    const threshold = parseMagnitude(m[2]);
    if (threshold != null) {
      const results = countries
        .filter((c) => c.population != null && c.population > threshold)
        .sort((a, b) => b.population - a.population);
      return { matched: true, label: `Population over ${m[2].trim()}`, results };
    }
  }

  // population under/below/less than X
  m = q.match(/population\s+(under|below|less than|fewer than|<)\s+(.+)/);
  if (m) {
    const threshold = parseMagnitude(m[2]);
    if (threshold != null) {
      const results = countries
        .filter((c) => c.population != null && c.population < threshold)
        .sort((a, b) => b.population - a.population);
      return { matched: true, label: `Population under ${m[2].trim()}`, results };
    }
  }

  // largest / smallest [countries] [in <region>] [by area|population]
  m = q.match(/(largest|biggest|smallest)\s+countries?(?:\s+in\s+([a-z ]+?))?(?:\s+by\s+(area|population))?$/);
  if (m) {
    const dir = m[1] === "smallest" ? 1 : -1;
    const region = m[2] ? m[2].trim() : null;
    const metric = m[3] === "population" ? "population" : "area";
    let list = countries.filter((c) => c[metric] != null);
    if (region) list = list.filter((c) => norm(c.region) === region || norm(c.subregion) === region);
    list = list.sort((a, b) => (a[metric] - b[metric]) * dir);
    const label = `${m[1][0].toUpperCase() + m[1].slice(1)} countries${region ? ` in ${region}` : ""} by ${metric}`;
    return { matched: true, label, results: list };
  }

  // countries using the <currency>  (euro, dollar, yen, pound, etc.)
  m = q.match(/(?:countries?\s+)?(?:using|with|that use)\s+(?:the\s+)?([a-z ]+?)(?:\s+currency)?$/);
  if (m) {
    const term = m[1].trim();
    const results = countries.filter((c) =>
      c.currencies.some((cur) => norm(cur.name).includes(term) || norm(cur.code) === term),
    );
    if (results.length) {
      return { matched: true, label: `Countries using "${term}"`, results };
    }
  }

  // high / low population density
  m = q.match(/(high|highest|low|lowest)\s+population\s+densit/);
  if (m) {
    const dir = /low/.test(m[1]) ? 1 : -1;
    const results = countries
      .map((c) => ({ c, d: density(c) }))
      .filter((x) => x.d != null)
      .sort((a, b) => (a.d - b.d) * dir)
      .map((x) => x.c);
    return {
      matched: true,
      label: `${/low/.test(m[1]) ? "Lowest" : "Highest"} population density`,
      results,
    };
  }

  return { matched: false };
}

// Plain multi-field text search: name, official, capital, region, subregion,
// ISO codes (cca2/cca3), currency code/name, language.
export function textSearch(rawInput) {
  const q = norm(rawInput);
  if (!q) return countries;
  return countries.filter((c) => {
    if (norm(c.name).includes(q)) return true;
    if (norm(c.capital).includes(q)) return true;
    if (norm(c.region).includes(q)) return true;
    if (norm(c.subregion).includes(q)) return true;
    if (norm(c.cca2) === q || norm(c.cca3) === q) return true;
    if (c.currencies.some((cur) => norm(cur.code) === q || norm(cur.name).includes(q))) return true;
    if (c.languages.some((l) => norm(l.name).includes(q))) return true;
    return false;
  });
}

// Combined entry point used by the homepage search box.
export function search(rawInput) {
  const smart = smartQuery(rawInput);
  if (smart.matched) return smart;
  const results = textSearch(rawInput);
  return { matched: false, label: null, results };
}

// ---------------------------------------------------------------------------
// Aggregate world statistics — all computed from the bundled real data.
// ---------------------------------------------------------------------------
export function worldStats() {
  const withPop = countries.filter((c) => c.population != null);
  const withArea = countries.filter((c) => c.area != null);

  const totalPopulation = withPop.reduce((s, c) => s + c.population, 0);
  const totalArea = withArea.reduce((s, c) => s + c.area, 0);

  const mostPopulated = [...withPop].sort((a, b) => b.population - a.population)[0];
  const leastPopulated = [...withPop].sort((a, b) => a.population - b.population)[0];
  const largest = [...withArea].sort((a, b) => b.area - a.area)[0];
  const smallest = [...withArea].sort((a, b) => a.area - b.area)[0];

  const dense = countries
    .map((c) => ({ c, d: density(c) }))
    .filter((x) => x.d != null)
    .sort((a, b) => b.d - a.d);

  // Currency frequency
  const curCount = {};
  countries.forEach((c) =>
    c.currencies.forEach((cur) => {
      if (cur.code) curCount[cur.code] = (curCount[cur.code] || 0) + 1;
    }),
  );
  const topCurrencies = Object.entries(curCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Language frequency
  const langCount = {};
  countries.forEach((c) =>
    c.languages.forEach((l) => {
      langCount[l.name] = (langCount[l.name] || 0) + 1;
    }),
  );
  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Countries per region
  const regionCount = {};
  countries.forEach((c) => {
    if (c.region) regionCount[c.region] = (regionCount[c.region] || 0) + 1;
  });

  return {
    total: countries.length,
    totalPopulation,
    totalArea,
    mostPopulated,
    leastPopulated,
    largest,
    smallest,
    mostDense: dense[0]?.c || null,
    mostDenseValue: dense[0]?.d || null,
    leastDense: dense[dense.length - 1]?.c || null,
    topCurrencies,
    topLanguages,
    regionCount,
  };
}

// Deterministic "country of the day" — same for everyone on a given date,
// derived from the date so it needs no backend.
export function countryOfTheDay(dateStr) {
  const d = dateStr || new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < d.length; i++) hash = (hash * 31 + d.charCodeAt(i)) >>> 0;
  const withData = countries.filter((c) => c.population != null && c.population > 1_000_000);
  return withData[hash % withData.length];
}

export function topBy(metricFn, count = 10, asc = false) {
  return countries
    .map((c) => ({ c, v: metricFn(c) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (asc ? a.v - b.v : b.v - a.v))
    .slice(0, count)
    .map((x) => x.c);
}

// Deterministic "Did you know?" facts derived entirely from real data.
export function funFacts() {
  const s = worldStats();
  const facts = [];
  if (s.largest)
    facts.push(
      `${s.largest.name} is the largest country by area, covering over ${Math.round((s.largest.area / 1e6) * 10) / 10} million km².`,
    );
  if (s.smallest) facts.push(`${s.smallest.name} is the smallest country by area in this dataset.`);
  if (s.mostPopulated) facts.push(`${s.mostPopulated.name} is the most populated country on record here.`);
  if (s.mostDense && s.mostDenseValue)
    facts.push(
      `${s.mostDense.name} has the highest population density — roughly ${Math.round(s.mostDenseValue).toLocaleString()} people per km².`,
    );
  if (s.topLanguages[0])
    facts.push(
      `${s.topLanguages[0][0]} is the most widely-used official language, appearing in ${s.topLanguages[0][1]} countries.`,
    );
  if (s.topCurrencies[0])
    facts.push(
      `The ${s.topCurrencies[0][0]} is the most widely-used currency code, used by ${s.topCurrencies[0][1]} countries or territories.`,
    );
  return facts;
}
