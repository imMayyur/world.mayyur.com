import Link from "next/link";
import { useState } from "react";
import Layout from "../components/Layout/Layout";
import PopulationClock from "../components/LiveData/PopulationClock";
import { Card, SectionTitle, StatCard } from "../components/ui/UI";
import { funFacts, topBy, worldStats } from "../lib/countries";
import { density, formatArea, formatCompact } from "../lib/format";
import styles from "../styles/World.module.css";

const COLLECTIONS = [
  { key: "pop", title: "Top 10 most populated", metric: (c) => c.population, fmt: (v) => `${formatCompact(v)} people` },
  { key: "area", title: "Top 10 largest", metric: (c) => c.area, fmt: (v) => formatArea(v) },
  { key: "small", title: "Top 10 smallest", metric: (c) => c.area, asc: true, fmt: (v) => formatArea(v) },
  { key: "dense", title: "Top 10 most dense", metric: (c) => density(c), fmt: (v) => `${v.toFixed(1)} /km²` },
];

export default function World({ stats, collections, facts }) {
  const [factIndex, setFactIndex] = useState(0);

  return (
    <Layout title="World at a glance" canonicalPath="/world" wide>
      <SectionTitle eyebrow="World at a glance">The planet, in numbers</SectionTitle>

      <PopulationClock baseline={stats.totalPopulation} />

      <div className={styles.statGrid}>
        <StatCard icon="🌍" label="Countries & territories" value={stats.total} />
        <StatCard
          icon="👥"
          label="Total population"
          value={formatCompact(stats.totalPopulation)}
          sub={`${stats.totalPopulation.toLocaleString()} people`}
        />
        <StatCard icon="🗺️" label="Total land area" value={formatArea(stats.totalArea)} />
        <StatCard
          icon="🏆"
          label="Most populated"
          value={stats.mostPopulated.name}
          sub={formatCompact(stats.mostPopulated.population)}
        />
        <StatCard icon="📐" label="Largest by area" value={stats.largest.name} sub={formatArea(stats.largest.area)} />
        <StatCard
          icon="🔬"
          label="Smallest by area"
          value={stats.smallest.name}
          sub={formatArea(stats.smallest.area)}
        />
      </div>

      <Card className={styles.factCard}>
        <div className={styles.factEyebrow}>Did you know?</div>
        <p className={styles.factText}>{facts[factIndex]}</p>
        <button className={styles.factBtn} onClick={() => setFactIndex((i) => (i + 1) % facts.length)}>
          Another fact →
        </button>
      </Card>

      <div className={styles.twoCol}>
        <Card className={styles.panel}>
          <h3 className={styles.panelTitle}>Most common official languages</h3>
          <ul className={styles.freqList}>
            {stats.topLanguages.map(([name, count]) => (
              <li key={name}>
                <span>{name}</span>
                <b>{count}</b>
              </li>
            ))}
          </ul>
        </Card>
        <Card className={styles.panel}>
          <h3 className={styles.panelTitle}>Most common currencies</h3>
          <ul className={styles.freqList}>
            {stats.topCurrencies.map(([code, count]) => (
              <li key={code}>
                <span>{code}</span>
                <b>{count}</b>
              </li>
            ))}
          </ul>
        </Card>
        <Card className={styles.panel}>
          <h3 className={styles.panelTitle}>Countries per region</h3>
          <ul className={styles.freqList}>
            {Object.entries(stats.regionCount)
              .sort((a, b) => b[1] - a[1])
              .map(([r, count]) => (
                <li key={r}>
                  <span>{r}</span>
                  <b>{count}</b>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      {collections.map((col) => (
        <section className={styles.collection} key={col.key}>
          <SectionTitle
            eyebrow="Discover"
            action={
              <Link href="/rankings/population" className={styles.seeAll}>
                See full rankings →
              </Link>
            }
          >
            {col.title}
          </SectionTitle>
          <div className={styles.topRow}>
            {col.items.map((c, i) => (
              <Link href={`/country/${c.slug}`} key={c.cca3} className={styles.topItem}>
                <span className={styles.topRank}>#{i + 1}</span>
                <img src={c.flag} alt="" aria-hidden="true" loading="lazy" />
                <span className={styles.topName}>{c.name}</span>
                <span className={styles.topVal}>{c.valueText}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </Layout>
  );
}

export async function getStaticProps() {
  const raw = worldStats();
  const pick = (c) => ({ name: c.name, slug: c.slug, cca3: c.cca3, population: c.population, area: c.area });
  const stats = {
    total: raw.total,
    totalPopulation: raw.totalPopulation,
    totalArea: raw.totalArea,
    mostPopulated: pick(raw.mostPopulated),
    largest: pick(raw.largest),
    smallest: pick(raw.smallest),
    topLanguages: raw.topLanguages,
    topCurrencies: raw.topCurrencies,
    regionCount: raw.regionCount,
  };

  const collections = COLLECTIONS.map((col) => ({
    key: col.key,
    title: col.title,
    items: topBy(col.metric, 10, !!col.asc).map((c) => ({
      name: c.name,
      slug: c.slug,
      cca3: c.cca3,
      flag: c.flag.w160,
      valueText: col.fmt(col.metric(c)),
    })),
  }));

  return { props: { stats, collections, facts: funFacts() } };
}
