import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import mapData from "../../data/country-paths.json";
import { formatCompact } from "../../lib/format";
import styles from "./CountryMap.module.css";

// Precomputed at build time (scripts/build-map.js). Pure SVG — no map libraries
// ship to the browser.
const { width, height, paths } = mapData;

const norm = (code) => String(code || "").padStart(3, "0");
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Interactive world map.
 *
 * @param highlights  Array of { ccn3, tone } (tone: "a" | "b") to pre-fill.
 * @param index       { <ccn3>: { name, slug, population } } for hover/click.
 * @param interactive Enable hover tooltips, click-to-navigate and zoom/pan.
 * @param label       Accessible description.
 */
export default function CountryMap({ highlights = [], index = {}, interactive = true, label }) {
  const router = useRouter();
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // { id, name, population, x, y }
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const highlightMap = useMemo(() => {
    const m = new Map();
    highlights.forEach((h) => {
      if (h && h.ccn3) m.set(norm(h.ccn3), h.tone || "a");
    });
    return m;
  }, [highlights]);

  const anyResolved = highlights.some((h) => h && h.ccn3 && paths[norm(h.ccn3)]);

  // ViewBox reflects zoom + pan.
  const vbW = width / zoom;
  const vbH = height / zoom;
  const vbX = clamp(pan.x, 0, width - vbW);
  const vbY = clamp(pan.y, 0, height - vbH);

  const zoomBy = (factor, cx = width / 2, cy = height / 2) => {
    setZoom((z) => {
      const nz = clamp(z * factor, 1, 8);
      // keep the point under the cursor roughly stable
      setPan((p) => {
        const curW = width / z;
        const curH = height / z;
        const newW = width / nz;
        const newH = height / nz;
        const px = clamp(p.x, 0, width - curW);
        const py = clamp(p.y, 0, height - curH);
        const fx = (cx - px) / curW;
        const fy = (cy - py) / curH;
        return {
          x: clamp(px + (curW - newW) * fx, 0, width - newW),
          y: clamp(py + (curH - newH) * fy, 0, height - newH),
        };
      });
      return nz;
    });
  };

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Convert a pointer event to SVG coordinates.
  const toSvg = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    return { x: vbX + relX * vbW, y: vbY + relY * vbH, rect, relX, relY };
  };

  const onWheel = (e) => {
    if (!interactive) return;
    e.preventDefault();
    const { x, y } = toSvg(e);
    zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, x, y);
  };

  const onPointerDown = (e) => {
    if (!interactive || zoom === 1) return;
    drag.current = { startX: e.clientX, startY: e.clientY, panX: vbX, panY: vbY };
  };
  const onPointerMove = (e) => {
    if (!interactive) return;
    if (drag.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const dx = ((e.clientX - drag.current.startX) / rect.width) * vbW;
      const dy = ((e.clientY - drag.current.startY) / rect.height) * vbH;
      setPan({
        x: clamp(drag.current.panX - dx, 0, width - vbW),
        y: clamp(drag.current.panY - dy, 0, height - vbH),
      });
    }
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const enter = (e, id) => {
    if (!interactive) return;
    const meta = index[id];
    if (!meta) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setHover({
      id,
      name: meta.name,
      population: meta.population,
      slug: meta.slug,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };
  const move = (e) => {
    if (!interactive || !hover) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h));
  };
  const leave = () => setHover(null);

  const activate = (id) => {
    const meta = index[id];
    if (meta && meta.slug) router.push(`/country/${meta.slug}`);
  };

  // Cleanup drag if pointer released outside.
  useEffect(() => {
    const up = () => (drag.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {interactive && (
        <div className={styles.controls}>
          <button type="button" className={styles.ctrl} onClick={() => zoomBy(1.4)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className={styles.ctrl} onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
            −
          </button>
          <button type="button" className={styles.ctrl} onClick={reset} aria-label="Reset view" title="Reset">
            ⤾
          </button>
        </div>
      )}

      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className={`${styles.svg} ${interactive ? styles.interactive : ""} ${zoom > 1 ? styles.grab : ""}`}
        role="img"
        aria-label={label || "World map with the selected country highlighted"}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => {
          onPointerMove(e);
          move(e);
        }}
        onPointerUp={onPointerUp}
        onMouseLeave={leave}
      >
        {Object.entries(paths).map(([id, d]) => {
          const tone = highlightMap.get(id);
          const clickable = interactive && !!index[id];
          const cls = [
            tone === "a" ? styles.hlA : tone === "b" ? styles.hlB : styles.base,
            clickable ? styles.clickable : "",
            hover && hover.id === id ? styles.hovered : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <path
              key={id}
              d={d}
              className={cls}
              onMouseEnter={(e) => enter(e, id)}
              onMouseMove={move}
              onClick={() => clickable && activate(id)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? index[id].name : undefined}
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

      {interactive && hover && (
        <div className={styles.tooltip} style={{ left: hover.x, top: hover.y }} role="status">
          <strong>{hover.name}</strong>
          <span>
            {hover.population != null ? `${formatCompact(hover.population)} people` : "Population unavailable"}
          </span>
          <em>Click to explore →</em>
        </div>
      )}

      {!anyResolved && highlights.length > 0 && (
        <p className={styles.note}>This country is too small to appear at the map's resolution.</p>
      )}

      {interactive && (
        <p className={styles.hint}>Hover a country for details · click to open · scroll to zoom · drag to pan</p>
      )}
    </div>
  );
}
