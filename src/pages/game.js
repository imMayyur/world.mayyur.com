import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Card, SectionTitle } from "../components/ui/UI";
import { getAllCountries, mapIndex } from "../lib/countries";
import styles from "../styles/Game.module.css";

const GameMap = dynamic(() => import("../components/CountryMap/GameMap"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 320 }} aria-hidden="true" />,
});

const BEST_KEY = "we.game.best";
const ROUNDS = 5;

// Great-circle distance in km between two [lat,lng] points.
function haversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Points: 1000 at 0km, decaying to 0 by ~5000km.
function scoreFor(km) {
  return Math.max(0, Math.round(1000 * Math.exp(-km / 2000)));
}

export default function Game({ pool, index }) {
  const [target, setTarget] = useState(null);
  const [round, setRound] = useState(0);
  const [total, setTotal] = useState(0);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState(null); // { km, points, guessName, guessLatlng }
  const [done, setDone] = useState(false);

  const nextTarget = useCallback(() => {
    const t = pool[Math.floor(Math.random() * pool.length)];
    setTarget(t);
    setResult(null);
  }, [pool]);

  useEffect(() => {
    setBest(Number(typeof window !== "undefined" && localStorage.getItem(BEST_KEY)) || 0);
    nextTarget();
  }, [nextTarget]);

  const onPick = (ccn3, name, latlng) => {
    if (!target || result) return;
    const km = haversine(target.latlng, latlng);
    const points = scoreFor(km);
    setResult({ km, points, guessName: name });
    setTotal((s) => s + points);
  };

  const advance = () => {
    const nextRound = round + 1;
    if (nextRound >= ROUNDS) {
      setDone(true);
      setBest((b) => {
        const nb = Math.max(b, total);
        try { localStorage.setItem(BEST_KEY, String(nb)); } catch {}
        return nb;
      });
    } else {
      setRound(nextRound);
      nextTarget();
    }
  };

  const restart = () => {
    setRound(0);
    setTotal(0);
    setDone(false);
    nextTarget();
  };

  return (
    <Layout title="Where in the World?" description="A geography guessing game: find the country on the map." canonicalPath="/game" wide>
      <div className={styles.header}>
        <div>
          <SectionTitle eyebrow="Geography game">Where in the World?</SectionTitle>
          {!done && target && (
            <p className={styles.prompt}>
              Find <strong>{target.name}</strong> — click where you think it is on the map.
            </p>
          )}
        </div>
        <div className={styles.scoreboard}>
          <div><span>{total}</span>Score</div>
          <div><span>{round + (done ? 0 : 1)}/{ROUNDS}</span>Round</div>
          <div><span>🏆 {best}</span>Best</div>
        </div>
      </div>

      {done ? (
        <Card className={styles.doneCard}>
          <h2 className={styles.doneTitle}>Final score: {total}</h2>
          <p className={styles.doneSub}>
            {total >= 4000 ? "World-class navigator! 🌍" : total >= 2500 ? "Solid geography skills." : "Keep exploring — you'll sharpen your map sense."}
          </p>
          <button className={styles.primary} onClick={restart}>Play again</button>
        </Card>
      ) : (
        <>
          <Card style={{ padding: 18 }}>
            <GameMap index={index} disabled={!!result} onPick={onPick} highlightCcn3={result ? target?.ccn3 : null} />
          </Card>

          {result && (
            <Card className={styles.resultCard}>
              <div className={styles.resultMain}>
                You were <strong>{result.km.toLocaleString()} km</strong> away · +{result.points} points
              </div>
              <div className={styles.resultSub}>The answer was <strong>{target.name}</strong>.</div>
              <button className={styles.primary} onClick={advance}>
                {round + 1 >= ROUNDS ? "See final score →" : "Next round →"}
              </button>
            </Card>
          )}
        </>
      )}
    </Layout>
  );
}

export async function getStaticProps() {
  // Well-known countries with coordinates make a fair game.
  const pool = getAllCountries()
    .filter((c) => c.latlng && c.latlng.length === 2 && c.population != null && c.population > 3_000_000 && c.ccn3)
    .map((c) => ({ name: c.name, ccn3: String(c.ccn3).padStart(3, "0"), latlng: c.latlng }));
  return { props: { pool, index: mapIndex() } };
}
