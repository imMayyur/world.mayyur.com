import Link from "next/link";
import { formatCompact } from "../../lib/format";
import styles from "./UI.module.css";

export function FlagImg({ country, size = "w320", className, rounded = true }) {
  if (!country || !country.flag) {
    return <div className={`${styles.flagFallback} ${className || ""}`} aria-hidden="true" />;
  }
  return (
    <img
      src={country.flag[size]}
      srcSet={`${country.flag.w160} 160w, ${country.flag.w320} 320w`}
      sizes="(max-width: 600px) 160px, 320px"
      alt={`Flag of ${country.name}`}
      loading="lazy"
      className={`${rounded ? styles.flagRounded : ""} ${className || ""}`}
    />
  );
}

export function Chip({ children, tone = "default" }) {
  return <span className={`${styles.chip} ${styles[`chip_${tone}`] || ""}`}>{children}</span>;
}

export function Card({ children, className, as: Tag = "div" }) {
  return <Tag className={`${styles.card} ${className || ""}`}>{children}</Tag>;
}

export function StatCard({ icon, label, value, sub }) {
  return (
    <div className={styles.stat}>
      {icon && (
        <div className={styles.statIcon} aria-hidden="true">
          {icon}
        </div>
      )}
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export function SectionTitle({ eyebrow, children, action }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h2 className={styles.sectionTitle}>{children}</h2>
      </div>
      {action}
    </div>
  );
}

// Horizontal bar for comparisons. `pct` is 0..100.
export function Bar({ label, valueText, pct, tone = "brand" }) {
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${styles[`bar_${tone}`] || ""}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      <div className={styles.barValue}>{valueText}</div>
    </div>
  );
}

export function CountryCard({ country }) {
  return (
    <Link href={`/country/${country.slug}`} className={styles.countryCard}>
      <div className={styles.countryFlag}>
        <FlagImg country={country} />
      </div>
      <div className={styles.countryBody}>
        <div className={styles.countryName}>{country.name}</div>
        <div className={styles.countryMeta}>
          {country.region || "—"}
          {country.capital ? ` · ${country.capital}` : ""}
        </div>
        <div className={styles.countryPop}>
          {country.population != null ? `${formatCompact(country.population)} people` : "Population unavailable"}
        </div>
      </div>
    </Link>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden="true">
        🔍
      </div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {children && <p className={styles.emptyText}>{children}</p>}
    </div>
  );
}
