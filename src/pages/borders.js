import Link from "next/link";
import { useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Card, FlagImg, SectionTitle } from "../components/ui/UI";
import { borderPath, getAllCountries, getCountryByCode } from "../lib/countries";
import styles from "../styles/Borders.module.css";

export default function Borders({ list }) {
  // Only landlocked-capable countries (those with at least one border) are
  // useful as endpoints for a land route.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const route = useMemo(() => {
    if (!from || !to) return undefined;
    return borderPath(from, to); // array | null
  }, [from, to]);

  const cf = from ? getCountryByCode(from) : null;
  const ct = to ? getCountryByCode(to) : null;

  return (
    <Layout
      title="Border explorer"
      description="Find the shortest land route between any two countries, crossing only shared borders."
      canonicalPath="/borders"
    >
      <SectionTitle eyebrow="Border explorer">Cross the world by land</SectionTitle>
      <p className={styles.intro}>
        Pick two countries and see the shortest chain of shared land borders between them — like planning an
        overland trip without ever taking a boat or plane.
      </p>

      <div className={styles.pickers}>
        <label className={styles.picker}>
          <span>From</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Select…</option>
            {list.map((c) => (
              <option key={c.cca3} value={c.cca3}>{c.name}</option>
            ))}
          </select>
        </label>
        <span className={styles.arrow}>→</span>
        <label className={styles.picker}>
          <span>To</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Select…</option>
            {list.map((c) => (
              <option key={c.cca3} value={c.cca3}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      {from && to && (
        <Card className={styles.result}>
          {route === null && (
            <p className={styles.noRoute}>
              No land route exists between <strong>{cf?.name}</strong> and <strong>{ct?.name}</strong> — at
              least one is an island or on a separate landmass.
            </p>
          )}
          {Array.isArray(route) && (
            <>
              <div className={styles.routeSummary}>
                {route.length === 1
                  ? "Same country."
                  : `${route.length - 1} border crossing${route.length - 1 === 1 ? "" : "s"} · ${route.length} countries`}
              </div>
              <ol className={styles.chain}>
                {route.map((c, i) => (
                  <li key={c.cca3} className={styles.step}>
                    <Link href={`/country/${c.slug}`} className={styles.stepLink}>
                      <FlagImg country={c} rounded />
                      <span>{c.name}</span>
                    </Link>
                    {i < route.length - 1 && <span className={styles.connector} aria-hidden="true">↓</span>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>
      )}
    </Layout>
  );
}

export async function getStaticProps() {
  const list = getAllCountries()
    .filter((c) => c.borders && c.borders.length > 0)
    .map((c) => ({ name: c.name, cca3: c.cca3 }));
  return { props: { list } };
}
