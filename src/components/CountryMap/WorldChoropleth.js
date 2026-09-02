import { useRouter } from "next/router";
import { useMemo, useRef, useState } from "react";
import mapData from "../../data/country-paths.json";
import { colorFor, quantileScale } from "../../lib/colorScale";
import styles from "./CountryMap.module.css";

const { width, height, paths } = mapData;
const norm = (code) => String(code || "").padStart(3, "0");

/**
 * Choropleth world map — shades every country by a chosen metric.
 *
 * @param values  { <ccn3>: { name, slug, value } }  numeric value per country
 * @param unit    string label for the legend (e.g. "people", "km²", "/km²")
 * @param format  fn(value) -> display string for the tooltip/legend
 */
export default function WorldChoropleth({ values = {}, unit = "", format = (v) => v, buckets = 6 }) {
  const router = useRouter();
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);

  const scale = useMemo(
    () => quantileScale(Object.values(values).map((v) => v && v.value), buckets),
    [values, buckets],
  );

  const legend = useMemo(() => {
    const items = [];
    for (let i = 0; i < scale.buckets; i++) {
      const t = scale.buckets > 1 ? i / (scale.buckets - 1) : 0;
      const lo = i === 0 ? scale.min : scale.thresholds[i - 1];
      const hi = i < scale.thresholds.length ? scale.thresholds[i] : scale.max;
      items.push({ color: colorFor(t), lo, hi });
    }
    return items;
  }, [scale]);

  const enter = (e, id) => {
    const meta = values[id];
    if (!meta) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setHover({ id, ...meta, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const move = (e) => {
    if (!hover) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h));
  };
  const leave = () => setHover(null);
  const activate = (id) => {
    const meta = values[id];
    if (meta && meta.slug) router.push(`/country/${meta.slug}`);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${styles.svg} ${styles.interactive}`}
        role="img"
        aria-label="Choropleth world map shaded by the selected metric"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={leave}
      >
        {Object.entries(paths).map(([id, d]) => {
          const meta = values[id];
          const bucket = meta ? scale.bucketOf(meta.value) : null;
          const t = bucket == null ? null : scale.buckets > 1 ? bucket / (scale.buckets - 1) : 0;
          const fill = t == null ? "var(--surface-2)" : colorFor(t);
          const clickable = !!meta;
          return (
            <path
              key={id}
              d={d}
              fill={fill}
              stroke="var(--surface)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              className={`${clickable ? styles.clickable : ""} ${hover && hover.id === id ? styles.choHover : ""}`}
              onMouseEnter={(e) => enter(e, id)}
              onMouseMove={move}
              onClick={() => clickable && activate(id)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `${meta.name}: ${format(meta.value)} ${unit}` : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  activate(id);
                }
              }}
            />
          );
        })}
      </svg>

      {hover && (
        <div className={styles.tooltip} style={{ left: hover.x, top: hover.y }} role="status">
          <strong>{hover.name}</strong>
          <span>{hover.value != null ? `${format(hover.value)} ${unit}`.trim() : "Data unavailable"}</span>
          <em>Click to explore →</em>
        </div>
      )}

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Low</span>
        {legend.map((b, i) => (
          <span
            key={i}
            className={styles.legendSwatch}
            style={{ background: b.color }}
            title={`${format(b.lo)} – ${format(b.hi)} ${unit}`}
          />
        ))}
        <span className={styles.legendLabel}>High</span>
      </div>
      <p className={styles.hint}>Hover for values · click a country to explore</p>
    </div>
  );
}
