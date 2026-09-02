import Link from "next/link";
import { useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Chip, CountryCard, EmptyState, SectionTitle } from "../components/ui/UI";
import { getAllCountries, getCountryByCode, search } from "../lib/countries";
import { useRecent } from "../lib/storage";
import styles from "../styles/Home.module.css";

const EXAMPLES = [
  "countries with population over 100 million",
  "largest countries in Asia",
  "smallest countries in Europe",
  "countries using the euro",
  "highest population density",
];

export default function Home({ countries, total }) {
  const [keyword, setKeyword] = useState("");

  const { results, label, matched } = useMemo(() => {
    if (!keyword.trim()) return { results: countries, label: null, matched: false };
    return search(keyword);
  }, [keyword, countries]);

  const recentCodes = useRecent();
  const recent = recentCodes.map(getCountryByCode).filter(Boolean);

  const shown = results.slice(0, 60);

  return (
    <Layout canonicalPath="/">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <h1 className={styles.heroTitle}>Explore the World.</h1>
        <p className={styles.heroSub}>
          Discover countries, compare cultures, understand geography and uncover surprising facts — across {total}{" "}
          countries and territories.
        </p>

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            🔎
          </span>
          <input
            className={styles.search}
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search a country, capital, currency, or try a smart query…"
            aria-label="Search countries"
          />
          {keyword && (
            <button className={styles.clear} onClick={() => setKeyword("")} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} className={styles.example} onClick={() => setKeyword(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </section>

      {recent.length > 0 && !keyword && (
        <section className={styles.block}>
          <SectionTitle eyebrow="Pick up where you left off">Recently explored</SectionTitle>
          <div className={styles.recentRow}>
            {recent.map((c) => (
              <Link href={`/country/${c.slug}`} key={c.cca3} className={styles.recentPill}>
                <img src={c.flag.w160} alt="" aria-hidden="true" />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.block}>
        <SectionTitle
          eyebrow={matched ? "Smart query" : "Browse"}
          action={
            <span className={styles.count}>
              {results.length} {results.length === 1 ? "match" : "matches"}
            </span>
          }
        >
          {label || (keyword ? `Results for “${keyword}”` : "All countries")}
        </SectionTitle>

        {matched && (
          <div className={styles.smartNote}>
            <Chip tone="brand">Interpreted your query</Chip>
            <span>Understood as a filter, not just a text match.</span>
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState title="No countries found">
            Try a country name, a capital city, an ISO code like “IN”, a currency like “USD”, or a smart query such as
            “largest countries in Africa”.
          </EmptyState>
        ) : (
          <>
            <div className={styles.grid}>
              {shown.map((c) => (
                <CountryCard country={c} key={c.cca3} />
              ))}
            </div>
            {results.length > shown.length && (
              <p className={styles.more}>
                Showing {shown.length} of {results.length}. Refine your search to narrow it down.
              </p>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

export async function getStaticProps() {
  const all = getAllCountries();
  // Ship a lightweight list for the initial grid; full records are per-page.
  const countries = all.map((c) => ({
    name: c.name,
    slug: c.slug,
    cca2: c.cca2,
    cca3: c.cca3,
    region: c.region,
    subregion: c.subregion,
    capital: c.capital,
    population: c.population,
    area: c.area,
    currencies: c.currencies,
    languages: c.languages,
    flag: c.flag,
  }));
  return { props: { countries, total: all.length } };
}
