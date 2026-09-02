import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import LiveIndicators from "../../components/LiveData/LiveIndicators";
import LocalTime from "../../components/LocalTime/LocalTime";
import { Card, Chip, FlagImg, SectionTitle } from "../../components/ui/UI";
import { getAllCountries, getCountryBySlug, getNeighbours, mapIndex, similarCountries } from "../../lib/countries";
import {
  UNAVAILABLE,
  displayOrUnavailable,
  formatArea,
  formatAreaFull,
  formatCompact,
  formatDensity,
  formatFull,
  formatLatLng,
  formatPercent,
  isMissing,
} from "../../lib/format";
import { pushRecent, useFavorites } from "../../lib/storage";
import styles from "./Country.module.css";

// Lazy-load the locator map so its bundled SVG path data ships as a separate
// chunk fetched on demand, not in the page's initial payload.
const CountryMap = dynamic(() => import("../../components/CountryMap/CountryMap"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 220 }} aria-hidden="true" />,
});

function Fact({ label, value, title }) {
  const missing = value === UNAVAILABLE || isMissing(value);
  return (
    <div className={styles.fact}>
      <div className={styles.factLabel}>{label}</div>
      <div className={`${styles.factValue} ${missing ? styles.factMissing : ""}`} title={title}>
        {missing ? UNAVAILABLE : value}
      </div>
    </div>
  );
}

export default function Country({ country, neighbours, similar, mapIdx }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(country.cca3);

  useEffect(() => {
    pushRecent(country.cca3);
  }, [country.cca3]);

  const desc = `${country.name}${country.capital ? ` (capital ${country.capital})` : ""}: population ${formatCompact(country.population)}, area ${formatArea(country.area)}, region ${country.region || "—"}. Languages, currency, local time and neighbouring countries.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Country",
    name: country.name,
    alternateName: country.officialName || undefined,
    identifier: country.cca3,
    ...(country.latlng && country.latlng.length === 2
      ? { latitude: country.latlng[0], longitude: country.latlng[1] }
      : {}),
    ...(country.capital ? { containsPlace: { "@type": "City", name: country.capital } } : {}),
  };

  return (
    <Layout
      title={country.name}
      description={desc}
      canonicalPath={`/country/${country.slug}`}
      ogImage={`/api/og/country/${country.slug}.png`}
      jsonLd={jsonLd}
    >
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroFlag}>
          <FlagImg country={country} />
        </div>
        <div className={styles.heroBody}>
          <div className={styles.breadcrumb}>
            <Link href="/">Explore</Link> ›{" "}
            <Link href={`/rankings/population?region=${encodeURIComponent(country.region || "")}`}>
              {country.region || "World"}
            </Link>
          </div>
          <h1 className={styles.name}>{country.name}</h1>
          {country.officialName && country.officialName !== country.name && (
            <div className={styles.official}>{country.officialName}</div>
          )}
          <div className={styles.chips}>
            {country.subregion && <Chip>{country.subregion}</Chip>}
            {country.cca3 && <Chip tone="brand">{country.cca3}</Chip>}
            {country.demonym && <Chip>Demonym: {country.demonym}</Chip>}
          </div>

          <div className={styles.heroActions}>
            <button
              className={fav ? styles.favActive : styles.favBtn}
              onClick={() => toggle(country.cca3)}
              aria-pressed={fav}
            >
              {fav ? "★ Saved" : "☆ Save country"}
            </button>
            <Link href={`/compare?a=${country.cca3}`} className={styles.secondaryBtn}>
              Compare ⇄
            </Link>
          </div>
        </div>
      </section>

      {/* KEY STATS */}
      <section className={styles.keyStats}>
        <Card className={styles.keyStat}>
          <div className={styles.keyLabel}>Population</div>
          <div className={styles.keyValue} title={formatFull(country.population)}>
            {formatCompact(country.population)}
          </div>
          <div className={styles.keySub}>{formatFull(country.population)} people</div>
        </Card>
        <Card className={styles.keyStat}>
          <div className={styles.keyLabel}>Area</div>
          <div className={styles.keyValue} title={formatAreaFull(country.area)}>
            {formatArea(country.area)}
          </div>
          <div className={styles.keySub}>{formatAreaFull(country.area)}</div>
        </Card>
        <Card className={styles.keyStat}>
          <div className={styles.keyLabel}>Density</div>
          <div className={styles.keyValue}>{formatDensity(country)}</div>
          <div className={styles.keySub}>people per km²</div>
        </Card>
        <Card className={styles.keyStat}>
          <div className={styles.keyLabel}>Capital</div>
          <div className={styles.keyValue}>{displayOrUnavailable(country.capital)}</div>
          <div className={styles.keySub}>{country.region || ""}</div>
        </Card>
      </section>

      {/* LOCATOR MAP */}
      <Card className={styles.mapCard}>
        <SectionTitle eyebrow="Where in the world">{country.name} on the map</SectionTitle>
        <CountryMap
          highlights={[{ ccn3: country.ccn3, tone: "a" }]}
          index={mapIdx}
          label={`Interactive world map highlighting ${country.name}`}
        />
      </Card>

      <div className={styles.grid}>
        {/* RIGHT NOW */}
        <Card className={styles.panel}>
          <SectionTitle eyebrow="Right now">Local time in {country.capital || country.name}</SectionTitle>
          <LocalTime timezones={country.timezones} />
        </Card>

        {/* GEOGRAPHY */}
        <Card className={styles.panel}>
          <SectionTitle eyebrow="Geography">Location & land</SectionTitle>
          <div className={styles.facts}>
            <Fact label="Region" value={displayOrUnavailable(country.region)} />
            <Fact label="Subregion" value={displayOrUnavailable(country.subregion)} />
            <Fact label="Coordinates" value={formatLatLng(country.latlng)} />
            <Fact label="Area" value={formatArea(country.area)} title={formatAreaFull(country.area)} />
            <Fact
              label="Neighbours"
              value={country.borders.length ? `${country.borders.length}` : "0 (island / landlocked-isolated)"}
            />
            <Fact
              label="Regional blocs"
              value={country.regionalBlocs.length ? country.regionalBlocs.join(", ") : UNAVAILABLE}
            />
          </div>
          {country.latlng.length === 2 && (
            <a
              className={styles.mapLink}
              href={`https://www.openstreetmap.org/?mlat=${country.latlng[0]}&mlon=${country.latlng[1]}#map=4/${country.latlng[0]}/${country.latlng[1]}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on OpenStreetMap ↗
            </a>
          )}
        </Card>

        {/* ADMINISTRATION */}
        <Card className={styles.panel}>
          <SectionTitle eyebrow="Administration">Codes & identity</SectionTitle>
          <div className={styles.facts}>
            <Fact label="Capital" value={displayOrUnavailable(country.capital)} />
            <Fact label="ISO alpha-2" value={displayOrUnavailable(country.cca2)} />
            <Fact label="ISO alpha-3" value={displayOrUnavailable(country.cca3)} />
            <Fact label="Numeric code" value={displayOrUnavailable(country.ccn3)} />
            <Fact
              label="Calling code"
              value={country.callingCodes.length ? country.callingCodes.join(", ") : UNAVAILABLE}
            />
            <Fact label="Internet TLD" value={country.tld.length ? country.tld.join(", ") : UNAVAILABLE} />
          </div>
        </Card>

        {/* LANGUAGES */}
        <Card className={styles.panel}>
          <SectionTitle eyebrow="Languages">Spoken here</SectionTitle>
          {country.languages.length ? (
            <div className={styles.chipWrap}>
              {country.languages.map((l) => (
                <Chip key={l.name}>
                  {l.name}
                  {l.native && l.native !== l.name ? ` · ${l.native}` : ""}
                </Chip>
              ))}
            </div>
          ) : (
            <p className={styles.missingText}>{UNAVAILABLE}</p>
          )}
        </Card>

        {/* CURRENCY */}
        <Card className={styles.panel}>
          <SectionTitle eyebrow="Currency">Money</SectionTitle>
          {country.currencies.length ? (
            <div className={styles.facts}>
              {country.currencies.map((c) => (
                <Fact
                  key={c.code || c.name}
                  label={c.name || "Currency"}
                  value={`${c.symbol ? c.symbol + " · " : ""}${c.code || ""}`.trim() || UNAVAILABLE}
                />
              ))}
            </div>
          ) : (
            <p className={styles.missingText}>{UNAVAILABLE}</p>
          )}
        </Card>

        {/* INEQUALITY (only if present) */}
        {country.gini != null && (
          <Card className={styles.panel}>
            <SectionTitle eyebrow="Economy">Income inequality</SectionTitle>
            <div className={styles.facts}>
              <Fact label="Gini index" value={formatPercent(country.gini)} />
            </div>
            <p className={styles.note}>Lower is more equal.</p>
          </Card>
        )}
      </div>

      {/* LIVE DATA — World Bank economy/health/development + live FX */}
      <LiveIndicators cca3={country.cca3} currency={country.currencies[0] || null} />

      {/* NEIGHBOURS */}
      {neighbours.length > 0 && (
        <section className={styles.neighbours}>
          <SectionTitle eyebrow="Borders">
            {neighbours.length} neighbouring {neighbours.length === 1 ? "country" : "countries"}
          </SectionTitle>
          <div className={styles.neighbourGrid}>
            {neighbours.map((n) => (
              <Link href={`/country/${n.slug}`} key={n.cca3} className={styles.neighbour}>
                <img src={n.flag.w160} alt={`Flag of ${n.name}`} loading="lazy" />
                <span>{n.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* COUNTRIES LIKE THIS */}
      {similar && similar.length > 0 && (
        <section className={styles.neighbours}>
          <SectionTitle eyebrow="Similarity">Countries like {country.name}</SectionTitle>
          <p className={styles.similarNote}>
            Ranked by measurable attributes only — region, population, area and density. This is not a claim about
            culture or history.
          </p>
          <div className={styles.similarGrid}>
            {similar.map((s) => (
              <Link href={`/country/${s.slug}`} key={s.cca3} className={styles.similarCard}>
                <img src={s.flag.w160} alt={`Flag of ${s.name}`} loading="lazy" />
                <div>
                  <div className={styles.similarName}>{s.name}</div>
                  <div className={styles.similarReasons}>
                    {(s.reasons.length ? s.reasons : ["Comparable profile"]).map((r) => (
                      <span key={r} className={styles.similarChip}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.sourceLine}>
        Base facts: bundled reference dataset (mledoze/countries, MIT). Live statistics: World Bank & open.er-api.com,
        fetched in real time. See <Link href="/sources">data sources</Link>. Missing values are shown as “{UNAVAILABLE}”
        — never fabricated.
      </section>
    </Layout>
  );
}

export async function getStaticPaths() {
  const paths = getAllCountries().map((c) => ({ params: { slug: c.slug } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const country = getCountryBySlug(params.slug);
  if (!country) return { notFound: true };
  const neighbours = getNeighbours(country).map((n) => ({
    name: n.name,
    slug: n.slug,
    cca3: n.cca3,
    flag: n.flag,
  }));
  const similar = similarCountries(country, 6).map((s) => ({
    name: s.country.name,
    slug: s.country.slug,
    cca3: s.country.cca3,
    flag: s.country.flag,
    region: s.country.region,
    reasons: s.reasons,
  }));
  return { props: { country, neighbours, similar, mapIdx: mapIndex() } };
}
