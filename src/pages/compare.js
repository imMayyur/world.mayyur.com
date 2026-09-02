import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Bar, Card, FlagImg, SectionTitle } from "../components/ui/UI";
import { getAllCountries, getCountryByCode, mapIndex } from "../lib/countries";
import { UNAVAILABLE, density, formatArea, formatCompact, formatFull } from "../lib/format";
import styles from "../styles/Compare.module.css";

// Lazy-loaded so the bundled map path data isn't in the initial payload.
const CountryMap = dynamic(() => import("../components/CountryMap/CountryMap"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 220 }} aria-hidden="true" />,
});

const METRICS = [
  {
    key: "population",
    label: "Population",
    get: (c) => c.population,
    fmt: (v) => formatCompact(v),
    full: (v) => `${formatFull(v)} people`,
  },
  { key: "area", label: "Area", get: (c) => c.area, fmt: (v) => formatArea(v) },
  {
    key: "density",
    label: "Density",
    get: (c) => density(c),
    fmt: (v) => (v == null ? UNAVAILABLE : `${v.toFixed(1)} /km²`),
  },
];

function Picker({ list, value, onChange, label }) {
  return (
    <label className={styles.picker}>
      <span className={styles.pickerLabel}>{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className={styles.select}>
        <option value="">Select a country…</option>
        {list.map((c) => (
          <option key={c.cca3} value={c.cca3}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function times(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function insights(a, b) {
  const out = [];
  const areaRatio = times(a.area, b.area);
  if (areaRatio && Math.abs(areaRatio - 1) > 0.05) {
    const [big, small, r] = areaRatio >= 1 ? [a, b, areaRatio] : [b, a, 1 / areaRatio];
    out.push(`${big.name} is about ${r.toFixed(1)}× larger than ${small.name} by area.`);
  }
  const popRatio = times(a.population, b.population);
  if (popRatio && Math.abs(popRatio - 1) > 0.05) {
    const [big, small, r] = popRatio >= 1 ? [a, b, popRatio] : [b, a, 1 / popRatio];
    out.push(`${big.name} has about ${r.toFixed(1)}× the population of ${small.name}.`);
  }
  const da = density(a),
    db = density(b);
  const dRatio = times(da, db);
  if (dRatio && Math.abs(dRatio - 1) > 0.05) {
    const [big, small, r] = dRatio >= 1 ? [a, b, dRatio] : [b, a, 1 / dRatio];
    out.push(`${big.name} is about ${r.toFixed(1)}× more densely populated than ${small.name}.`);
  }
  return out;
}

export default function Compare({ list, mapIdx }) {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);

  // Seed from query (?a=IND&b=USA) once router is ready.
  const aCode = a ?? (typeof router.query.a === "string" ? router.query.a : null);
  const bCode = b ?? (typeof router.query.b === "string" ? router.query.b : null);

  const ca = aCode ? getCountryByCode(aCode) : null;
  const cb = bCode ? getCountryByCode(bCode) : null;

  const ready = ca && cb;
  const sameCountry = ca && cb && ca.cca3 === cb.cca3;

  const tips = useMemo(() => (ready && !sameCountry ? insights(ca, cb) : []), [ca, cb, ready, sameCountry]);

  return (
    <Layout title="Compare countries" canonicalPath="/compare">
      <SectionTitle eyebrow="Side by side">Compare countries</SectionTitle>

      <div className={styles.pickers}>
        <Picker list={list} value={aCode} onChange={setA} label="Country A" />
        <span className={styles.vs}>vs</span>
        <Picker list={list} value={bCode} onChange={setB} label="Country B" />
      </div>

      {!ready && <Card className={styles.hint}>Pick two countries to see a metric-by-metric comparison.</Card>}

      {sameCountry && <Card className={styles.hint}>Choose two different countries to compare.</Card>}

      {ready && !sameCountry && (
        <>
          <div className={styles.headline}>
            {[ca, cb].map((c) => (
              <Link href={`/country/${c.slug}`} key={c.cca3} className={styles.headCard}>
                <div className={styles.headFlag}>
                  <FlagImg country={c} />
                </div>
                <div>
                  <div className={styles.headName}>{c.name}</div>
                  <div className={styles.headMeta}>
                    {c.region || "—"} · {c.capital || "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Card className={styles.mapCard}>
            <SectionTitle eyebrow="On the map">
              <span className={styles.legendA}>{ca.name}</span> vs <span className={styles.legendB}>{cb.name}</span>
            </SectionTitle>
            <CountryMap
              highlights={[
                { ccn3: ca.ccn3, tone: "a" },
                { ccn3: cb.ccn3, tone: "b" },
              ]}
              index={mapIdx}
              label={`Interactive world map highlighting ${ca.name} and ${cb.name}`}
            />
          </Card>

          <Card className={styles.metrics}>
            {METRICS.map((m) => {
              const va = m.get(ca);
              const vb = m.get(cb);
              const max = Math.max(va || 0, vb || 0) || 1;
              return (
                <div key={m.key} className={styles.metricBlock}>
                  <h3 className={styles.metricTitle}>{m.label}</h3>
                  <Bar label={ca.name} valueText={m.fmt(va)} pct={((va || 0) / max) * 100} tone="brand" />
                  <Bar label={cb.name} valueText={m.fmt(vb)} pct={((vb || 0) / max) * 100} tone="accent" />
                </div>
              );
            })}
          </Card>

          {tips.length > 0 && (
            <Card className={styles.insights}>
              <h3 className={styles.metricTitle}>Did you notice?</h3>
              <ul className={styles.insightList}>
                {tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className={styles.disclaimer}>
                “Bigger” is metric-specific — there is no single score that makes one country better than another. All
                figures are from real bundled data.
              </p>
            </Card>
          )}
        </>
      )}
    </Layout>
  );
}

export async function getStaticProps() {
  const list = getAllCountries().map((c) => ({ name: c.name, cca3: c.cca3 }));
  return { props: { list, mapIdx: mapIndex() } };
}
