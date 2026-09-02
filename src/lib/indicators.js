// Live statistics layer — fetched at runtime from the World Bank API.
//
// The World Bank API is free, requires no key, and sends
// Access-Control-Allow-Origin: *. Every value carries the year it applies to
// and a source, so we can label figures honestly ("GDP · 2023 · World Bank")
// and never imply data is more current than it is.
//
// We deliberately request only indicators the World Bank actually publishes.
// If a country is missing a value, we surface "Data unavailable" rather than
// estimating anything.

export const WB_BASE = "https://api.worldbank.org/v2";

// Curated, human-meaningful indicators. `fmt` runs client-side for display.
export const INDICATORS = [
  { id: "SP.POP.TOTL", key: "population", label: "Population", group: "demographics", unit: "people", kind: "int" },
  { id: "SP.POP.GROW", key: "popGrowth", label: "Population growth", group: "demographics", unit: "%/yr", kind: "percent" },
  { id: "SP.DYN.LE00.IN", key: "lifeExpectancy", label: "Life expectancy", group: "health", unit: "years", kind: "years" },
  { id: "SP.URB.TOTL.IN.ZS", key: "urbanPct", label: "Urban population", group: "demographics", unit: "%", kind: "percent" },
  { id: "NY.GDP.MKTP.CD", key: "gdp", label: "GDP", group: "economy", unit: "USD", kind: "usd" },
  { id: "NY.GDP.PCAP.CD", key: "gdpPerCapita", label: "GDP per capita", group: "economy", unit: "USD", kind: "usdSmall" },
  { id: "NY.GDP.MKTP.KD.ZG", key: "gdpGrowth", label: "GDP growth", group: "economy", unit: "%/yr", kind: "percent" },
  { id: "FP.CPI.TOTL.ZG", key: "inflation", label: "Inflation", group: "economy", unit: "%/yr", kind: "percent" },
  { id: "IT.NET.USER.ZS", key: "internetPct", label: "Internet users", group: "connectivity", unit: "%", kind: "percent" },
  { id: "EN.GHG.CO2.PC.CE.AR5", key: "co2PerCapita", label: "CO₂ per capita", group: "environment", unit: "t", kind: "decimal" },
];

export const INDICATOR_BY_KEY = Object.fromEntries(INDICATORS.map((i) => [i.key, i]));

// Group metadata for the scorecard-style layout.
export const INDICATOR_GROUPS = [
  { id: "economy", label: "Economy", icon: "💰" },
  { id: "demographics", label: "Demographics", icon: "👥" },
  { id: "health", label: "Health", icon: "❤️" },
  { id: "connectivity", label: "Connectivity", icon: "🌐" },
  { id: "environment", label: "Environment", icon: "🌱" },
];

// Semicolon-joined list of indicator ids for the World Bank "source" batch call.
export const INDICATOR_IDS = INDICATORS.map((i) => i.id).join(";");

// Format a live value for display given its `kind`.
export function formatIndicator(kind, value) {
  if (value == null || Number.isNaN(value)) return "Data unavailable";
  switch (kind) {
    case "int":
      return abbr(value);
    case "usd":
      return "$" + abbr(value);
    case "usdSmall":
      return "$" + Math.round(value).toLocaleString("en-US");
    case "percent":
      return `${value.toFixed(1)}%`;
    case "years":
      return `${value.toFixed(1)} yrs`;
    case "decimal":
      return value.toFixed(2);
    default:
      return String(value);
  }
}

function abbr(n) {
  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const u of units) {
    if (Math.abs(n) >= u.v) {
      const val = n / u.v;
      return `${parseFloat(val >= 100 ? val.toFixed(0) : val.toFixed(2))}${u.s}`;
    }
  }
  return String(Math.round(n));
}
