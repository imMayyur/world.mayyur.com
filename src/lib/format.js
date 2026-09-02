// Reusable, consistent formatting utilities.
// Every formatter treats null/undefined as "unavailable" rather than 0.

const UNAVAILABLE = "Data unavailable";

export const isMissing = (v) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

// 1428600000 -> "1.43B"
export function formatCompact(n) {
  if (isMissing(n) || typeof n !== "number" || Number.isNaN(n)) return UNAVAILABLE;
  if (Math.abs(n) < 1000) return String(n);
  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const u of units) {
    if (Math.abs(n) >= u.v) {
      const val = n / u.v;
      const str = val >= 100 ? val.toFixed(0) : val.toFixed(2);
      return `${parseFloat(str)}${u.s}`;
    }
  }
  return String(n);
}

// 1428600000 -> "1,428,600,000"
export function formatFull(n) {
  if (isMissing(n) || typeof n !== "number" || Number.isNaN(n)) return UNAVAILABLE;
  return n.toLocaleString("en-US");
}

// area in km²
export function formatArea(n) {
  if (isMissing(n)) return UNAVAILABLE;
  return `${formatCompact(n)} km²`;
}

export function formatAreaFull(n) {
  if (isMissing(n)) return UNAVAILABLE;
  return `${formatFull(n)} km²`;
}

export function formatPercent(n, digits = 1) {
  if (isMissing(n) || typeof n !== "number") return UNAVAILABLE;
  return `${n.toFixed(digits)}%`;
}

// people per km²
export function density(country) {
  if (!country || isMissing(country.population) || isMissing(country.area)) return null;
  return country.population / country.area;
}

export function formatDensity(country) {
  const d = density(country);
  if (d == null) return UNAVAILABLE;
  return `${d.toFixed(1)} /km²`;
}

export function formatLatLng(latlng) {
  if (isMissing(latlng) || latlng.length < 2) return UNAVAILABLE;
  const [lat, lng] = latlng;
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

export function displayOrUnavailable(v) {
  return isMissing(v) ? UNAVAILABLE : v;
}

export { UNAVAILABLE };
