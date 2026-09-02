import { useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Bar, Card, SectionTitle } from "../components/ui/UI";
import { getAllCountries, getCountryByCode } from "../lib/countries";
import { density, formatArea, formatCompact, formatFull } from "../lib/format";
import styles from "../styles/Lab.module.css";

function Picker({ list, value, onChange, label }) {
  return (
    <label className={styles.picker}>
      <span>{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Select…</option>
        {list.map((c) => (
          <option key={c.cca3} value={c.cca3}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}

export default function Lab({ list }) {
  const [aCode, setA] = useState("USA");
  const [bCode, setB] = useState("IND");
  const a = aCode ? getCountryByCode(aCode) : null;
  const b = bCode ? getCountryByCode(bCode) : null;

  const experiments = useMemo(() => {
    if (!a || !b || a.cca3 === b.cca3) return null;
    const out = {};
    // How many A's fit inside B by area?
    if (a.area && b.area) {
      out.fit = {
        big: b.area >= a.area ? b : a,
        small: b.area >= a.area ? a : b,
        times: Math.max(a.area, b.area) / Math.min(a.area, b.area),
      };
    }
    // What if A had B's population density?
    const da = density(a);
    const db = density(b);
    if (a.area && db != null) {
      out.densitySwap = {
        subject: a,
        source: b,
        newPop: db * a.area,
        actualPop: a.population,
      };
    }
    // Population ratio
    if (a.population && b.population) {
      out.popRatio = {
        big: a.population >= b.population ? a : b,
        small: a.population >= b.population ? b : a,
        times: Math.max(a.population, b.population) / Math.min(a.population, b.population),
      };
    }
    return out;
  }, [a, b]);

  return (
    <Layout
      title="Country Lab"
      description="Hypothetical, data-driven experiments: how many countries fit inside another, density swaps and more."
      canonicalPath="/lab"
    >
      <SectionTitle eyebrow="Country Lab">What if?</SectionTitle>
      <p className={styles.intro}>
        Data-driven thought experiments computed live from real figures. Nothing here is a prediction — just
        the maths of comparing two countries.
      </p>

      <div className={styles.pickers}>
        <Picker list={list} value={aCode} onChange={setA} label="Country A" />
        <Picker list={list} value={bCode} onChange={setB} label="Country B" />
      </div>

      {!experiments && <Card className={styles.hint}>Pick two different countries to run the experiments.</Card>}

      {experiments && (
        <div className={styles.grid}>
          {experiments.fit && (
            <Card className={styles.exp}>
              <div className={styles.expIcon}>📐</div>
              <h3>How many fit inside?</h3>
              <p className={styles.big}>
                ~{experiments.fit.times.toFixed(1)}×
              </p>
              <p className={styles.expText}>
                About <strong>{experiments.fit.times.toFixed(1)} {experiments.fit.small.name}</strong>
                {experiments.fit.times >= 2 ? "s" : ""} could fit inside{" "}
                <strong>{experiments.fit.big.name}</strong> by land area.
              </p>
              <div className={styles.tiles} aria-hidden="true">
                {Array.from({ length: Math.min(24, Math.round(experiments.fit.times)) }).map((_, i) => (
                  <span key={i} className={styles.tile} />
                ))}
                {experiments.fit.times > 24 && <span className={styles.more}>+{Math.round(experiments.fit.times) - 24}</span>}
              </div>
            </Card>
          )}

          {experiments.densitySwap && (
            <Card className={styles.exp}>
              <div className={styles.expIcon}>👥</div>
              <h3>Density swap</h3>
              <p className={styles.expText}>
                If <strong>{experiments.densitySwap.subject.name}</strong> had{" "}
                <strong>{experiments.densitySwap.source.name}</strong>'s population density, it would hold about:
              </p>
              <p className={styles.big}>{formatCompact(experiments.densitySwap.newPop)}</p>
              <Bar
                label="Actual"
                valueText={formatCompact(experiments.densitySwap.actualPop)}
                pct={(experiments.densitySwap.actualPop / Math.max(experiments.densitySwap.actualPop, experiments.densitySwap.newPop)) * 100}
                tone="brand"
              />
              <Bar
                label="Hypothetical"
                valueText={formatCompact(experiments.densitySwap.newPop)}
                pct={(experiments.densitySwap.newPop / Math.max(experiments.densitySwap.actualPop, experiments.densitySwap.newPop)) * 100}
                tone="accent"
              />
            </Card>
          )}

          {experiments.popRatio && (
            <Card className={styles.exp}>
              <div className={styles.expIcon}>🧮</div>
              <h3>Population multiple</h3>
              <p className={styles.big}>~{experiments.popRatio.times.toFixed(1)}×</p>
              <p className={styles.expText}>
                <strong>{experiments.popRatio.big.name}</strong> has about{" "}
                {experiments.popRatio.times.toFixed(1)}× the population of{" "}
                <strong>{experiments.popRatio.small.name}</strong> (
                {formatFull(experiments.popRatio.big.population)} vs {formatFull(experiments.popRatio.small.population)}).
              </p>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
}

export async function getStaticProps() {
  const list = getAllCountries()
    .filter((c) => c.area || c.population)
    .map((c) => ({ name: c.name, cca3: c.cca3 }));
  return { props: { list } };
}
