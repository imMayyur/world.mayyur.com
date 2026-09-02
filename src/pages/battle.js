import { useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Card, FlagImg, SectionTitle } from "../components/ui/UI";
import { getAllCountries, getCountryByCode } from "../lib/countries";
import { density, formatArea, formatCompact } from "../lib/format";
import styles from "../styles/Battle.module.css";

// Metrics from bundled data only (instant, always available). "higher wins"
// says whether a bigger number is the "winner" for that round — but we make
// clear this is metric-specific, not an overall quality judgement.
const ROUNDS = [
  { key: "population", label: "Population", get: (c) => c.population, fmt: formatCompact, higherWins: true },
  { key: "area", label: "Area", get: (c) => c.area, fmt: formatArea, higherWins: true },
  { key: "density", label: "Density", get: (c) => density(c), fmt: (v) => (v == null ? "—" : `${v.toFixed(1)} /km²`), higherWins: true },
  { key: "neighbours", label: "Neighbours", get: (c) => (c.borders ? c.borders.length : 0), fmt: (v) => `${v}`, higherWins: true },
  { key: "languages", label: "Official languages", get: (c) => c.languages.length, fmt: (v) => `${v}`, higherWins: true },
];

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

export default function Battle({ list }) {
  const [aCode, setA] = useState("IND");
  const [bCode, setB] = useState("USA");
  const [revealed, setRevealed] = useState(0);

  const a = aCode ? getCountryByCode(aCode) : null;
  const b = bCode ? getCountryByCode(bCode) : null;
  const ready = a && b && a.cca3 !== b.cca3;

  const scored = useMemo(() => {
    if (!ready) return [];
    return ROUNDS.map((r) => {
      const va = r.get(a);
      const vb = r.get(b);
      let winner = null;
      if (va != null && vb != null && va !== vb) winner = (va > vb) === r.higherWins ? "a" : "b";
      return { ...r, va, vb, winner };
    });
  }, [a, b, ready]);

  const tally = useMemo(() => {
    const shown = scored.slice(0, revealed);
    return {
      a: shown.filter((r) => r.winner === "a").length,
      b: shown.filter((r) => r.winner === "b").length,
    };
  }, [scored, revealed]);

  const start = () => setRevealed(0);
  const next = () => setRevealed((r) => Math.min(ROUNDS.length, r + 1));
  const allRevealed = revealed >= ROUNDS.length;

  return (
    <Layout title="Country Battle" description="Pit two countries against each other across metrics, revealed round by round." canonicalPath="/battle" wide>
      <SectionTitle eyebrow="Country Battle">🌍 Head to head</SectionTitle>

      <div className={styles.pickers}>
        <Picker list={list} value={aCode} onChange={(v) => { setA(v); setRevealed(0); }} label="Fighter A" />
        <span className={styles.vs}>VS</span>
        <Picker list={list} value={bCode} onChange={(v) => { setB(v); setRevealed(0); }} label="Fighter B" />
      </div>

      {!ready && <Card className={styles.hint}>Pick two different countries to start the battle.</Card>}

      {ready && (
        <>
          <div className={styles.arena}>
            <div className={`${styles.corner} ${tally.a > tally.b && allRevealed ? styles.leading : ""}`}>
              <FlagImg country={a} />
              <div className={styles.cornerName}>{a.name}</div>
              <div className={styles.cornerScore}>{tally.a}</div>
            </div>
            <div className={styles.corner + " " + styles.middle}>
              <div className={styles.roundInfo}>{revealed}/{ROUNDS.length} rounds</div>
              {revealed === 0 ? (
                <button className={styles.primary} onClick={next}>Start battle</button>
              ) : allRevealed ? (
                <button className={styles.secondary} onClick={start}>Reset</button>
              ) : (
                <button className={styles.primary} onClick={next}>Next round →</button>
              )}
            </div>
            <div className={`${styles.corner} ${tally.b > tally.a && allRevealed ? styles.leading : ""}`}>
              <FlagImg country={b} />
              <div className={styles.cornerName}>{b.name}</div>
              <div className={styles.cornerScore}>{tally.b}</div>
            </div>
          </div>

          <div className={styles.rounds}>
            {scored.slice(0, revealed).map((r) => (
              <Card key={r.key} className={styles.round}>
                <div className={`${styles.side} ${r.winner === "a" ? styles.win : ""}`}>
                  {r.fmt(r.va)} {r.winner === "a" && <span aria-hidden="true">🏆</span>}
                </div>
                <div className={styles.metric}>{r.label}</div>
                <div className={`${styles.side} ${styles.right} ${r.winner === "b" ? styles.win : ""}`}>
                  {r.winner === "b" && <span aria-hidden="true">🏆</span>} {r.fmt(r.vb)}
                </div>
              </Card>
            ))}
          </div>

          {allRevealed && (
            <Card className={styles.verdict}>
              {tally.a === tally.b ? (
                <h3>It's a tie — {tally.a} each.</h3>
              ) : (
                <h3>🏆 {tally.a > tally.b ? a.name : b.name} wins {Math.max(tally.a, tally.b)}–{Math.min(tally.a, tally.b)}</h3>
              )}
              <p className={styles.disclaimer}>
                "Winner" here means winning more individual metrics — it is not a judgement that one country is
                better than another. Every metric is a separate, real data point.
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
  return { props: { list } };
}
