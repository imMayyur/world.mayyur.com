import dynamic from "next/dynamic";
import { useState } from "react";
import Layout from "../components/Layout/Layout";
import { Card, SectionTitle } from "../components/ui/UI";
import { getAllCountries } from "../lib/countries";
import { density, formatArea, formatCompact } from "../lib/format";

const WorldChoropleth = dynamic(() => import("../components/CountryMap/WorldChoropleth"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 320 }} aria-hidden="true" />,
});

const METRICS = {
  population: { label: "Population", unit: "people", format: (v) => formatCompact(v) },
  area: { label: "Area", unit: "km²", format: (v) => formatCompact(v) },
  density: { label: "Population density", unit: "/km²", format: (v) => (v == null ? "—" : v.toFixed(1)) },
};

export default function MapExplorer({ datasets }) {
  const [metric, setMetric] = useState("population");
  const values = datasets[metric];

  return (
    <Layout
      title="Data map"
      description="Explore the world as a choropleth — shade every country by population, area or density."
      canonicalPath="/map"
      wide
    >
      <SectionTitle eyebrow="Data explorer">The world, by the numbers</SectionTitle>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {Object.entries(METRICS).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: key === metric ? "var(--brand)" : "var(--surface)",
              color: key === metric ? "#fff" : "var(--text-soft)",
            }}
            aria-pressed={key === metric}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Card style={{ padding: 22 }}>
        <WorldChoropleth values={values} unit={METRICS[metric].unit} format={METRICS[metric].format} />
      </Card>

      <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 16, textAlign: "center" }}>
        Colors use quantile buckets so the scale is spread evenly across countries, not dominated by a few
        outliers. Countries without data are shown in neutral grey.
      </p>
    </Layout>
  );
}

export async function getStaticProps() {
  const all = getAllCountries();
  const build = (fn) => {
    const out = {};
    for (const c of all) {
      if (!c.ccn3) continue;
      out[String(c.ccn3).padStart(3, "0")] = { name: c.name, slug: c.slug, value: fn(c) };
    }
    return out;
  };
  const datasets = {
    population: build((c) => c.population),
    area: build((c) => c.area),
    density: build((c) => density(c)),
  };
  return { props: { datasets } };
}
