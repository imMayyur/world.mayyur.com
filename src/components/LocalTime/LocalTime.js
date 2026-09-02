import { useEffect, useState } from "react";
import styles from "./LocalTime.module.css";

// Parse "UTC+05:30" / "UTC-04:00" / "UTC" into minutes offset.
function parseOffset(tz) {
  if (!tz) return null;
  if (tz === "UTC") return 0;
  const m = tz.match(/UTC([+-])(\d{2}):(\d{2})/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

export default function LocalTime({ timezones }) {
  const [now, setNow] = useState(null);
  const tz = timezones && timezones[0];
  const offset = parseOffset(tz);

  useEffect(() => {
    if (offset == null) return;
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offset]);

  if (offset == null || !now) {
    return (
      <div className={styles.wrap}>
        <div className={styles.time}>—</div>
        <div className={styles.meta}>Local time unavailable</div>
      </div>
    );
  }

  // Convert to the target offset using UTC as the anchor.
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utcMs + offset * 60000);
  const hh = local.getHours();
  const isDay = hh >= 6 && hh < 18;
  const timeStr = local.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = local.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span className={styles.dayIcon} aria-hidden="true">{isDay ? "☀️" : "🌙"}</span>
        <span className={styles.time}>{timeStr}</span>
      </div>
      <div className={styles.meta}>
        {dateStr} · {tz} · {isDay ? "Daytime" : "Night"}
      </div>
      {timezones.length > 1 && (
        <div className={styles.multi}>
          {timezones.length} time zones: {timezones.join(", ")}
        </div>
      )}
    </div>
  );
}
