import { useRef, useState } from "react";
import mapData from "../../data/country-paths.json";
import styles from "./CountryMap.module.css";

const { width, height, paths } = mapData;

/**
 * Game map: click a country; reports (ccn3, name, latlng) so the game can score
 * by great-circle distance. No labels are shown (that would give it away).
 *
 * @param index         { <ccn3>: { name, latlng } }
 * @param onPick        (ccn3, name, latlng) => void
 * @param disabled      freeze input after a guess
 * @param highlightCcn3 reveal the correct country after guessing
 */
export default function GameMap({ index = {}, onPick, disabled, highlightCcn3 }) {
  const [hoverId, setHoverId] = useState(null);

  const pick = (id) => {
    if (disabled) return;
    const meta = index[id];
    if (!meta || !meta.latlng) return;
    onPick(id, meta.name, meta.latlng);
  };

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${styles.svg} ${styles.interactive}`}
        role="img"
        aria-label="World map — click a country to guess"
        preserveAspectRatio="xMidYMid meet"
      >
        {Object.entries(paths).map(([id, d]) => {
          const isAnswer = highlightCcn3 && id === String(highlightCcn3).padStart(3, "0");
          const cls = [
            isAnswer ? styles.hlA : styles.base,
            !disabled && index[id] ? styles.clickable : "",
            !disabled && hoverId === id ? styles.hovered : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <path
              key={id}
              d={d}
              className={cls}
              onMouseEnter={() => !disabled && setHoverId(id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => pick(id)}
              role={!disabled && index[id] ? "button" : undefined}
              tabIndex={!disabled && index[id] ? 0 : undefined}
              onKeyDown={(e) => {
                if (!disabled && index[id] && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  pick(id);
                }
              }}
            />
          );
        })}
      </svg>
      <p className={styles.hint}>
        {disabled ? "The correct country is highlighted." : "Click the country on the map."}
      </p>
    </div>
  );
}
