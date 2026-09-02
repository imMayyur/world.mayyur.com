/*
 * Build a normalized, self-contained country dataset.
 *
 * Usage:
 *   node scripts/build-data.js            (offline: rebuild from bundled snapshot)
 *   node scripts/build-data.js --fetch    (online: refresh the source snapshot first)
 *
 * Output: src/data/countries.json  (committed to the repo)
 *
 * Why bundle at all? The public restcountries.com API now requires an account +
 * API key, and the legacy restcountries.eu domain is dead. Bundling this
 * reference layer (names, flags, borders, ISO codes) keeps the app fast,
 * key-free and unbreakable. Dynamic stats (GDP, life expectancy, FX, etc.) are
 * NOT bundled — they're fetched live at runtime via /api/indicators and /api/fx.
 * All values here are real; nothing is fabricated.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const SRC = path.join(__dirname, "source-restcountries-v2.json");
const OUT_DIR = path.join(__dirname, "..", "src", "data");
const OUT = path.join(OUT_DIR, "countries.json");

// Open, MIT-licensed source (same dataset REST Countries was built from).
const SOURCE_URL =
  "https://raw.githubusercontent.com/apilayer/restcountries/master/src/main/resources/countriesV2.json";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} fetching source data`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function main() {
  if (process.argv.includes("--fetch")) {
    console.log("Refreshing source snapshot from the open dataset…");
    try {
      await download(SOURCE_URL, SRC);
      console.log("  ✓ source updated:", path.relative(process.cwd(), SRC));
    } catch (e) {
      console.warn(`  ! could not refresh source (${e.message}); using existing snapshot`);
    }
  }
  build();
}

function build() {
  const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));

  // A URL-friendly slug from the common name (e.g. "United States" -> "united-states")
  const slugify = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const clean = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

  const countries = raw
    .map((c) => {
      const cca2 = (c.alpha2Code || "").toLowerCase();
      return {
        name: c.name,
        officialName: c.name, // v2 has no separate official; keep common
        nativeName: c.nativeName || null,
        slug: slugify(c.name),
        cca2: c.alpha2Code || null,
        cca3: c.alpha3Code || null,
        ccn3: c.numericCode || null,
        cioc: c.cioc || null,
        region: c.region || null,
        subregion: c.subregion || null,
        capital: typeof c.capital === "string" ? c.capital : null,
        population: typeof c.population === "number" ? c.population : null,
        area: typeof c.area === "number" && c.area > 0 ? c.area : null,
        latlng: clean(c.latlng),
        timezones: clean(c.timezones),
        borders: clean(c.borders),
        languages: clean(c.languages).map((l) => ({
          code: l.iso639_1 || l.iso639_2 || null,
          name: l.name,
          native: l.nativeName || null,
        })),
        currencies: clean(c.currencies).map((cur) => ({
          code: cur.code || null,
          name: cur.name || null,
          symbol: cur.symbol || null,
        })),
        callingCodes: clean(c.callingCodes)
          .map((x) => (x ? `+${x}` : null))
          .filter(Boolean),
        tld: clean(c.topLevelDomain),
        gini: typeof c.gini === "number" ? c.gini : null,
        demonym: c.demonym || null,
        regionalBlocs: clean(c.regionalBlocs).map((b) => b.name),
        // Flags from flagcdn.com, keyed by ISO alpha-2 (reliable + free).
        flag: cca2
          ? {
              svg: `https://flagcdn.com/${cca2}.svg`,
              w320: `https://flagcdn.com/w320/${cca2}.png`,
              w160: `https://flagcdn.com/w160/${cca2}.png`,
              emoji: null,
            }
          : null,
      };
    })
    // Drop entries without the essentials we rely on for routing/identity.
    .filter((c) => c.cca3 && c.cca2 && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(countries));

  const withPop = countries.filter((c) => c.population != null).length;
  const withArea = countries.filter((c) => c.area != null).length;
  console.log(`Wrote ${countries.length} countries -> ${path.relative(process.cwd(), OUT)}`);
  console.log(`  with population: ${withPop}, with area: ${withArea}`);
}

main();
