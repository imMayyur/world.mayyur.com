import Link from "next/link";
import Layout from "../components/Layout/Layout";
import { Card, FlagImg, SectionTitle } from "../components/ui/UI";
import { countryOfTheDay, getCountryBySlug } from "../lib/countries";
import { formatArea, formatCompact } from "../lib/format";
import styles from "../styles/Play.module.css";

const GAMES = [
  { href: "/game", icon: "🗺️", title: "Where in the World?", desc: "Find a country on the map. Scored by how close you click." },
  { href: "/quiz", icon: "🚩", title: "Guess the Flag", desc: "Identify countries from their flags. Track your streak." },
  { href: "/battle", icon: "⚔️", title: "Country Battle", desc: "Pit two countries against each other, metric by metric." },
  { href: "/lab", icon: "🧪", title: "What-if Lab", desc: "How many Belgiums fit in Brazil? Data-driven experiments." },
  { href: "/borders", icon: "🧭", title: "Border Explorer", desc: "Find the shortest land route between any two countries." },
  { href: "/map", icon: "🌈", title: "Data Map", desc: "Shade the world by population, area or density." },
];

export default function Play({ daily }) {
  const country = getCountryBySlug(daily.slug);
  return (
    <Layout title="Play & explore" description="Geography games and data experiments: flag quiz, map game, country battle and more." canonicalPath="/play" wide>
      <SectionTitle eyebrow="Play & explore">Games & experiments</SectionTitle>

      {country && (
        <Card className={styles.daily}>
          <div className={styles.dailyLabel}>🗓️ Country of the day</div>
          <div className={styles.dailyBody}>
            <div className={styles.dailyFlag}>
              <FlagImg country={country} />
            </div>
            <div>
              <Link href={`/country/${country.slug}`} className={styles.dailyName}>{country.name}</Link>
              <div className={styles.dailyMeta}>
                {country.region}
                {country.capital ? ` · ${country.capital}` : ""}
              </div>
              <div className={styles.dailyStats}>
                <span>{formatCompact(country.population)} people</span>
                <span>{formatArea(country.area)}</span>
              </div>
              <Link href={`/country/${country.slug}`} className={styles.dailyCta}>Explore today's country →</Link>
            </div>
          </div>
        </Card>
      )}

      <div className={styles.grid}>
        {GAMES.map((g) => (
          <Link href={g.href} key={g.href} className={styles.gameCard}>
            <div className={styles.gameIcon} aria-hidden="true">{g.icon}</div>
            <div className={styles.gameTitle}>{g.title}</div>
            <div className={styles.gameDesc}>{g.desc}</div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // Deterministic per-day pick; the page is statically generated so we compute
  // for "today" at build time and the client re-derives if needed.
  const daily = countryOfTheDay();
  return { props: { daily: { slug: daily.slug } }, revalidate: 3600 };
}
