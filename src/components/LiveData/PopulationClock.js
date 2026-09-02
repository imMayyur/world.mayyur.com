import { useEffect, useRef, useState } from "react";
import styles from "./LiveData.module.css";

// A live-ticking world population ESTIMATE.
//
// We take the bundled total population (sum of real per-country figures) as a
// baseline anchored at its data year, then project forward using a single,
// clearly-stated global growth rate. This is explicitly an estimate for visual
// interest — not a claim of real-time precision. We label it as such.
const GROWTH_RATE = 0.0088; // ~0.88%/yr, current world figure (UN, approx.)
const ANCHOR = new Date("2024-01-01T00:00:00Z").getTime();

export default function PopulationClock({ baseline }) {
  const [value, setValue] = useState(null);
  const raf = useRef(null);

  useEffect(() => {
    if (!baseline) return;
    const tick = () => {
      const yearsElapsed = (Date.now() - ANCHOR) / (365.25 * 24 * 3600 * 1000);
      // Continuous compounding for a smooth counter.
      setValue(baseline * Math.exp(GROWTH_RATE * yearsElapsed));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [baseline]);

  if (value == null) return null;

  const whole = Math.floor(value);
  const str = whole.toLocaleString("en-US");

  return (
    <div className={styles.clock}>
      <div className={styles.clockLabel}>World population — live estimate</div>
      <div className={styles.clockValue}>
        {str.split("").map((ch, i) => (
          <span key={i} className={ch === "," ? styles.clockComma : styles.clockDigit}>{ch}</span>
        ))}
      </div>
      <div className={styles.clockNote}>
        Projected from a {baseline.toLocaleString("en-US")} baseline at ~{(GROWTH_RATE * 100).toFixed(2)}%/yr.
        An estimate for illustration, not a precise real-time count.
      </div>
    </div>
  );
}
