/*
 * Precompute SVG path data for every country from the world-atlas topojson.
 *
 * Run:  node scripts/build-map.js   (or: npm run map)
 *
 * Output: src/data/country-paths.json  ->  { width, height, paths: { <ccn3>: "M..." } }
 *
 * Doing this at build time means the runtime map component ships as plain
 * React + SVG with ZERO map libraries in the browser bundle.
 */
const fs = require("fs");
const path = require("path");
const { geoNaturalEarth1, geoPath } = require("d3-geo");
const { feature } = require("topojson-client");

const WIDTH = 960;
const HEIGHT = 500;

const topo = JSON.parse(fs.readFileSync(path.join(__dirname, "source-world-110m.json"), "utf8"));

const fc = feature(topo, topo.objects.countries);

const projection = geoNaturalEarth1().fitExtent(
  [
    [4, 4],
    [WIDTH - 4, HEIGHT - 4],
  ],
  fc,
);
const pathGen = geoPath(projection);

// Some world-atlas polygons cross the ±180° antimeridian and, once projected,
// produce a single ring that wraps across the ENTIRE map width — a giant blob
// that covers everything (e.g. Fiji, Solomon Islands, Russia's Chukotka).
// We split each path into its sub-rings ("M ... Z") and drop any ring whose
// horizontal span is an implausibly large share of the map. That removes the
// wrap artifact while keeping each country's real landmass.
const MAX_RING_SPAN = WIDTH * 0.6;

function ringXSpan(ring) {
  const nums = ring.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return max - min;
}

function sanitize(d) {
  if (!d) return d;
  // Split into rings, keeping the leading "M". geoPath separates rings with "M".
  const rings = d.split(/(?=M)/g).filter(Boolean);
  const kept = rings.filter((r) => ringXSpan(r) <= MAX_RING_SPAN);
  // If everything was filtered (shouldn't happen), fall back to the original.
  return kept.length ? kept.join("") : d;
}

const paths = {};
let fixed = 0;
for (const f of fc.features) {
  const raw = pathGen(f);
  if (raw && f.id != null) {
    const d = sanitize(raw);
    if (d !== raw) fixed++;
    // Normalize id to a zero-padded 3-char string to match dataset ccn3.
    const id = String(f.id).padStart(3, "0");
    paths[id] = d;
  }
}

const out = { width: WIDTH, height: HEIGHT, paths };
fs.writeFileSync(path.join(__dirname, "..", "src", "data", "country-paths.json"), JSON.stringify(out));
console.log(`Wrote ${Object.keys(paths).length} country paths (${fixed} de-wrapped) -> src/data/country-paths.json`);
