import Layout from "../components/Layout/Layout";
import { Card, SectionTitle } from "../components/ui/UI";
import { getAllCountries } from "../lib/countries";
import styles from "../styles/Sources.module.css";

export default function Sources({ total, withPop, withArea }) {
  return (
    <Layout title="Data sources & methodology" canonicalPath="/sources">
      <SectionTitle eyebrow="Transparency">Data sources & methodology</SectionTitle>

      <Card className={styles.panel}>
        <h3>A hybrid model: stable base + live statistics</h3>
        <p>
          Atlas combines two layers. Reference facts that rarely change are bundled for speed and reliability, while
          dynamic statistics are fetched live from authoritative, key-free public APIs. No API keys are ever exposed in
          the browser.
        </p>
        <ul className={styles.list}>
          <li>
            <b>Country facts (bundled)</b> — the open{" "}
            <a href="https://github.com/mledoze/countries" target="_blank" rel="noopener noreferrer">
              mledoze/countries
            </a>{" "}
            dataset (MIT), the same source that powered the REST Countries API. Names, capitals, regions, coordinates,
            borders, languages, currencies, calling codes, TLDs and time zones.
          </li>
          <li>
            <b>Economy, health & development (live)</b> — the{" "}
            <a href="https://data.worldbank.org" target="_blank" rel="noopener noreferrer">
              World Bank Open Data API
            </a>
            . GDP, GDP per capita, GDP growth, inflation, life expectancy, population growth, urban share, internet
            users and CO₂ per capita — each labelled with the exact year it applies to, with historical trend charts.
          </li>
          <li>
            <b>Exchange rates (live)</b> — real-time rates from{" "}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
              open.er-api.com
            </a>
            , refreshed roughly daily.
          </li>
          <li>
            <b>Flag images</b> — served from{" "}
            <a href="https://flagcdn.com" target="_blank" rel="noopener noreferrer">
              flagcdn.com
            </a>
            , keyed by ISO 3166-1 alpha-2 code.
          </li>
          <li>
            <b>Maps</b> — external links open{" "}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">
              OpenStreetMap
            </a>{" "}
            at the country's coordinates.
          </li>
        </ul>
      </Card>

      <Card className={styles.panel}>
        <h3>How “live” actually works</h3>
        <p>
          Live figures are requested through the app's own server-side routes (<code>/api/indicators/[code]</code> and{" "}
          <code>/api/fx</code>), which fetch from the World Bank and exchange-rate APIs, cache the response, and batch
          many indicators into one request. If a source is slow or down, the page still renders every other section and
          shows a friendly notice instead of crashing.
        </p>
      </Card>

      <Card className={styles.panel}>
        <h3>What we never fake</h3>
        <p>
          We only display statistics an authoritative source actually returns. If a country is missing a value, we show{" "}
          <em>“Data unavailable”</em> — never a zero, an estimate, or a guess. Nothing on this site is fabricated.
        </p>
      </Card>

      <Card className={styles.panel}>
        <h3>Coverage & methodology notes</h3>
        <ul className={styles.list}>
          <li>{total} countries and territories are included in the base dataset.</li>
          <li>
            {withPop} have a bundled population figure; {withArea} have an area figure.
          </li>
          <li>Population density is computed as population ÷ area, shown only when both exist.</li>
          <li>“X times larger / more dense” insights are calculated live from the data, not hardcoded.</li>
          <li>
            Local time is derived from each country's primary UTC offset and updates every second in your browser.
          </li>
        </ul>
      </Card>
    </Layout>
  );
}

export async function getStaticProps() {
  const all = getAllCountries();
  return {
    props: {
      total: all.length,
      withPop: all.filter((c) => c.population != null).length,
      withArea: all.filter((c) => c.area != null).length,
    },
  };
}
