import { INDICATORS, INDICATOR_GROUPS, formatIndicator } from "../../lib/indicators";
import { useFx, useIndicators } from "../../lib/useLiveData";
import { Card, SectionTitle } from "../ui/UI";
import HistoryChart from "./HistoryChart";
import styles from "./LiveData.module.css";
import Sparkline from "./Sparkline";

function IndicatorCard({ meta, data }) {
  const available = data && data.latest != null;
  return (
    <div className={styles.indicator}>
      <div className={styles.indHead}>
        <span className={styles.indLabel}>{meta.label}</span>
        {available && data.year && <span className={styles.indYear}>{data.year}</span>}
      </div>
      <div className={`${styles.indValue} ${available ? "" : styles.indMissing}`}>
        {available ? formatIndicator(meta.kind, data.latest) : "Data unavailable"}
      </div>
      {available && data.series && data.series.length > 1 && (
        <div className={styles.indChart}>
          <Sparkline series={data.series} label={meta.label} />
        </div>
      )}
    </div>
  );
}

function GroupPanel({ group, byKey }) {
  const items = INDICATORS.filter((i) => i.group === group.id);
  const hasAny = items.some((i) => byKey[i.key] && byKey[i.key].latest != null);
  if (!hasAny) return null; // hide groups with nothing to show
  return (
    <Card className={styles.group}>
      <div className={styles.groupHead}>
        <span aria-hidden="true">{group.icon}</span>
        <h3>{group.label}</h3>
      </div>
      <div className={styles.indGrid}>
        {items.map((meta) => (
          <IndicatorCard key={meta.key} meta={meta} data={byKey[meta.key]} />
        ))}
      </div>
    </Card>
  );
}

function Skeletons() {
  return (
    <div className={styles.skeletonWrap} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Card key={i} className={styles.group}>
          <div className={styles.skelTitle} />
          <div className={styles.indGrid}>
            {[0, 1, 2].map((j) => (
              <div key={j} className={styles.skelCard} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function LiveFx({ currency }) {
  const { status, data } = useFx("USD");
  if (!currency || !currency.code) return null;
  const rate = status === "success" && data && data.rates ? data.rates[currency.code] : null;

  return (
    <Card className={styles.fxCard}>
      <div className={styles.fxHead}>
        <SectionTitle eyebrow="Live rate">Exchange rate</SectionTitle>
      </div>
      {status === "loading" && <div className={styles.fxLoading}>Fetching live rate…</div>}
      {status === "error" && <div className={styles.fxUnavailable}>Exchange rate temporarily unavailable.</div>}
      {status === "success" && rate != null && (
        <>
          <div className={styles.fxValue}>
            1 USD ≈ {rate.toLocaleString("en-US", { maximumFractionDigits: 3 })} {currency.code}
          </div>
          <div className={styles.fxSub}>
            {currency.symbol ? `${currency.symbol} ` : ""}
            {currency.name} · updated {data.updated ? new Date(data.updated).toLocaleDateString() : "recently"} ·
            source: {data.source}
          </div>
        </>
      )}
      {status === "success" && rate == null && (
        <div className={styles.fxUnavailable}>No live rate published for {currency.code}.</div>
      )}
    </Card>
  );
}

export default function LiveIndicators({ cca3, currency }) {
  const { status, data, error } = useIndicators(cca3);

  return (
    <section className={styles.wrap}>
      <SectionTitle
        eyebrow="Live · World Bank"
        action={status === "success" ? <span className={styles.liveBadge}>● Live</span> : null}
      >
        Economy, health & development
      </SectionTitle>

      {status === "loading" && <Skeletons />}

      {status === "error" && (
        <Card className={styles.errorCard}>
          <p>Live statistics are temporarily unavailable ({error}).</p>
          <button className={styles.retry} onClick={() => window.location.reload()}>
            Retry
          </button>
        </Card>
      )}

      {status === "success" && (
        <>
          <div className={styles.groups}>
            {INDICATOR_GROUPS.map((g) => (
              <GroupPanel key={g.id} group={g} byKey={data.indicators} />
            ))}
          </div>

          <Card className={styles.historyCard}>
            <h3 className={styles.historyTitle}>Trends over time</h3>
            <HistoryChart indicators={data.indicators} />
          </Card>

          <p className={styles.sourceNote}>
            Source: World Bank open data, fetched live. Each figure is labelled with the year it applies to. Missing
            indicators show “Data unavailable”.
          </p>
        </>
      )}

      <LiveFx currency={currency} />
    </section>
  );
}
