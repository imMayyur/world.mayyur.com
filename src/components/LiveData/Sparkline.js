// Lightweight, dependency-free trend chart drawn as inline SVG.
// Accessible: exposes a text summary and role="img" with a label.

export default function Sparkline({ series, width = 260, height = 64, label }) {
  if (!series || series.length < 2) return null;

  const values = series.map((p) => p.value);
  const years = series.map((p) => p.year);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (series.length - 1);

  const points = series.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.value - min) / span) * (height - 8) - 4;
    return [x, y];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  const first = values[0];
  const last = values[values.length - 1];
  const up = last >= first;
  const summary = `${label || "Trend"} from ${years[0]} to ${years[years.length - 1]}, ${up ? "rising" : "falling"}.`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={summary}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill="var(--brand)" />
    </svg>
  );
}
