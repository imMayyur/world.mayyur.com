import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout/Layout";
import { EmptyState, SectionTitle } from "../../components/ui/UI";
import { getAllCountries, getRegions } from "../../lib/countries";
import { density, formatArea, formatCompact } from "../../lib/format";
import { INDICATORS, formatIndicator } from "../../lib/indicators";
import styles from "../../styles/Rankings.module.css";

// Bundled (static) metrics — instant, no fetch.
const BUNDLED = {
  population: { label: "Population", get: (c) => c.population, fmt: (v) => formatCompact(v) },
  area: { label: "Area", get: (c) => c.area, fmt: (v) => formatArea(v) },
  density: { label: "Density", get: (c) => density(c), fmt: (v) => (v == null ? "—" : `${v.toFixed(1)} /km²`) },
};

// Live metrics come from the World Bank via /api/rank/[key].
const LIVE_KEYS = ["gdp", "gdpPerCapita", "lifeExpectancy", "internetPct", "co2PerCapita", "urbanPct"];
const LIVE = Object.fromEntries(
  LIVE_KEYS.map((k) => {
    const meta = INDICATORS.find((i) => i.key === k);
    return [k, { label: meta.label, kind: meta.kind, live: true, fmt: (v) => formatIndicator(meta.kind, v) }];
  }),
);

const ALL = { ...BUNDLED, ...LIVE };

export default function Rankings({ metric, rows: bundledRows, regions, allMetrics }) {
  const cfg = ALL[metric];
  const isLive = !!cfg.live;
  const [region, setRegion] = useState("");
  const [desc, setDesc] = useState(true);
  const [liveRows, setLiveRows] = useState(null);
  const [liveStatus, setLiveStatus] = useState(isLive ? "loading" : "idle");

  // Fetch live rows when a live metric is active.
  useEffect(() => {
    if (!isLive) return;
    let alive = true;
    setLiveStatus("loading");
    setLiveRows(null);
    fetch(`/api/rank/${metric}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (!alive) return;
        setLiveRows(j.items);
        setLiveStatus("success");
      })
      .catch(() => alive && setLiveStatus("error"));
    return () => {
      alive = false;
    };
  }, [metric, isLive]);

  const rows = isLive ? liveRows || [] : bundledRows;

  const filtered = useMemo(() => {
    let list = rows.filter((r) => r.value != null);
    if (region) list = list.filter((r) => r.region === region);
    list = [...list].sort((a, b) => (desc ? b.value - a.value : a.value - b.value));
    return list;
  }, [rows, region, desc]);

  return (
    <Layout
      title={`${cfg.label} rankings`}
      description={`Every country ranked by ${cfg.label.toLowerCase()}, filterable by region.`}
      canonicalPath={`/rankings/${metric}`}
    >
      <SectionTitle
        eyebrow={isLive ? "World rankings · Live" : "World rankings"}
        action={isLive && liveStatus === "success" ? <span className={styles.liveBadge}>● Live</span> : null}
      >
        Countries by {cfg.label.toLowerCase()}
      </SectionTitle>

      <div className={styles.tabs}>
        {allMetrics.map((m) => (
          <Link href={`/rankings/${m}`} key={m} className={m === metric ? styles.tabActive : styles.tab}>
            {ALL[m].label}
          </Link>
        ))}
      </div>

      <div className={styles.controls}>
        <select
          className={styles.select}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Filter by region"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button className={styles.dirBtn} onClick={() => setDesc((d) => !d)}>
          {desc ? "Highest first ↓" : "Lowest first ↑"}
        </button>
        <span className={styles.count}>{filtered.length} countries</span>
      </div>

      {isLive && liveStatus === "loading" && <div className={styles.loading}>Fetching live World Bank data…</div>}
      {isLive && liveStatus === "error" && (
        <EmptyState title="Live data unavailable">The World Bank service didn't respond. Try again shortly.</EmptyState>
      )}

      {(!isLive || liveStatus === "success") &&
        (filtered.length === 0 ? (
          <EmptyState title="No data for this filter">Try another region.</EmptyState>
        ) : (
          <ol className={styles.list}>
            {filtered.map((r, i) => (
              <li key={r.cca3}>
                <Link href={`/country/${r.slug}`} className={styles.row}>
                  <span className={styles.rank}>{i + 1}</span>
                  <img className={styles.flag} src={r.flag} alt="" aria-hidden="true" loading="lazy" />
                  <span className={styles.name}>{r.name}</span>
                  <span className={styles.region}>{r.region}</span>
                  <span className={styles.value}>
                    {cfg.fmt(r.value)}
                    {isLive && r.year ? <em className={styles.yr}> {r.year}</em> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ))}

      {isLive && (
        <p className={styles.sourceNote}>
          Live from the World Bank. Each value shows the most recent year available per country.
        </p>
      )}
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: Object.keys(ALL).map((metric) => ({ params: { metric } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const metric = params.metric;
  const cfg = ALL[metric];
  if (!cfg) return { notFound: true };
  // Bundled rows only needed for static metrics.
  const rows = cfg.live
    ? []
    : getAllCountries().map((c) => ({
        name: c.name,
        slug: c.slug,
        cca3: c.cca3,
        region: c.region,
        flag: c.flag.w160,
        value: cfg.get(c),
      }));
  return { props: { metric, rows, regions: getRegions(), allMetrics: Object.keys(ALL) } };
}
