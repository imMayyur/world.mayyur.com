import { useMemo, useRef, useState } from "react";
import { INDICATORS, formatIndicator } from "../../lib/indicators";
import styles from "./LiveData.module.css";

const W = 720;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 30, left: 56 };

// Indicators that have enough history to be worth charting.
const CHARTABLE = ["population", "gdp", "gdpPerCapita", "lifeExpectancy", "urbanPct", "internetPct", "co2PerCapita"];

function niceTicks(min, max, count = 4) {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export default function HistoryChart({ indicators }) {
  // Which indicators actually have a multi-point series?
  const available = useMemo(
    () =>
      CHARTABLE.map((key) => INDICATORS.find((i) => i.key === key)).filter(
        (meta) => meta && indicators[meta.key] && indicators[meta.key].series && indicators[meta.key].series.length > 2,
      ),
    [indicators],
  );

  const [activeKey, setActiveKey] = useState(available[0]?.key || null);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const meta = available.find((m) => m.key === activeKey) || available[0];
  const series = meta ? indicators[meta.key].series : [];

  const geom = useMemo(() => {
    if (!series || series.length < 2) return null;
    const years = series.map((p) => p.year);
    const values = series.map((p) => p.value);
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const padV = (maxV - minV) * 0.08 || 1;
    const lo = minV - padV;
    const hi = maxV + padV;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const sx = (yr) => PAD.left + ((yr - minY) / (maxY - minY || 1)) * plotW;
    const sy = (v) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;
    const pts = series.map((p) => [sx(p.year), sy(p.value)]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${sx(maxY)},${PAD.top + plotH} L${sx(minY)},${PAD.top + plotH} Z`;
    return { minY, maxY, lo, hi, sx, sy, pts, line, area, plotW, plotH };
  }, [series]);

  if (!meta || !geom) return null;

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    // nearest point
    let best = 0;
    let bestD = Infinity;
    geom.pts.forEach(([px], i) => {
      const d = Math.abs(px - x);
      if (d < bestD) { bestD = d; best = i; }
    });
    setHover({ i: best, point: series[best], xy: geom.pts[best] });
  };

  const yTicks = niceTicks(geom.lo, geom.hi, 4);

  return (
    <div className={styles.history}>
      <div className={styles.historyTabs}>
        {available.map((m) => (
          <button
            key={m.key}
            className={m.key === meta.key ? styles.histTabActive : styles.histTab}
            onClick={() => { setActiveKey(m.key); setHover(null); }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={styles.historyChartWrap}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={styles.historySvg}
          role="img"
          aria-label={`${meta.label} from ${geom.minY} to ${geom.maxY}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => {
            const y = geom.sy(v);
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" className={styles.axisText}>
                  {formatIndicator(meta.kind, v).replace(" yrs", "").replace("$", "$")}
                </text>
              </g>
            );
          })}

          {[geom.minY, Math.round((geom.minY + geom.maxY) / 2), geom.maxY].map((yr, i) => (
            <text key={i} x={geom.sx(yr)} y={H - 8} textAnchor="middle" className={styles.axisText}>
              {yr}
            </text>
          ))}

          <path d={geom.area} fill="url(#histFill)" />
          <path d={geom.line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {hover && (
            <g>
              <line x1={hover.xy[0]} y1={PAD.top} x2={hover.xy[0]} y2={PAD.top + geom.plotH} stroke="var(--brand-strong)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hover.xy[0]} cy={hover.xy[1]} r="5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hover && (
          <div className={styles.histTooltip}>
            <strong>{hover.point.year}</strong>
            <span>{formatIndicator(meta.kind, hover.point.value)}</span>
          </div>
        )}
      </div>

      <p className={styles.historyCaption}>
        {meta.label} · {geom.minY}–{geom.maxY} · World Bank. Hover to read exact values.
      </p>
    </div>
  );
}
