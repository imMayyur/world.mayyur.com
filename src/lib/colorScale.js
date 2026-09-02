// Small, dependency-free sequential color scale + quantile bucketing for the
// choropleth map. Colors interpolate from a light tint to the brand color.

const LIGHT = [224, 231, 255]; // indigo-100-ish
const DARK = [55, 48, 163]; // indigo-800-ish

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

export function colorFor(t) {
  // t in 0..1
  const c = clamp01(t);
  const r = lerp(LIGHT[0], DARK[0], c);
  const g = lerp(LIGHT[1], DARK[1], c);
  const b = lerp(LIGHT[2], DARK[2], c);
  return `rgb(${r},${g},${b})`;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

// Build quantile thresholds so color is spread evenly across countries rather
// than dominated by a few huge outliers (e.g. China/India population).
export function quantileScale(values, buckets = 6) {
  const sorted = values.filter((v) => v != null && !Number.isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return { thresholds: [], bucketOf: () => null, buckets, min: 0, max: 0 };
  const thresholds = [];
  for (let i = 1; i < buckets; i++) {
    const q = sorted[Math.floor((i / buckets) * sorted.length)];
    thresholds.push(q);
  }
  const bucketOf = (v) => {
    if (v == null || Number.isNaN(v)) return null;
    let i = 0;
    while (i < thresholds.length && v >= thresholds[i]) i++;
    return i; // 0..buckets-1
  };
  return { thresholds, bucketOf, buckets, min: sorted[0], max: sorted[sorted.length - 1] };
}
