import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Card } from "../components/ui/UI";
import { getAllCountries } from "../lib/countries";
import styles from "../styles/Quiz.module.css";

const BEST_KEY = "we.quiz.best";

// Difficulty controls the candidate pool (well-known vs. obscure countries).
const DIFFICULTY = {
  easy: { label: "Easy", slice: 60 },
  medium: { label: "Medium", slice: 140 },
  hard: { label: "Hard", slice: 250 },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(pool, all) {
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const distractors = shuffle(all.filter((c) => c.cca3 !== answer.cca3)).slice(0, 3);
  const options = shuffle([answer, ...distractors]);
  return { answer, options };
}

export default function Quiz({ byPop, all }) {
  const [difficulty, setDifficulty] = useState("easy");
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(0);

  const pool = useMemo(() => byPop.slice(0, DIFFICULTY[difficulty].slice), [byPop, difficulty]);

  const next = useCallback(() => {
    setQuestion(makeQuestion(pool, all));
    setPicked(null);
  }, [pool, all]);

  useEffect(() => {
    setBest(Number(typeof window !== "undefined" && localStorage.getItem(BEST_KEY)) || 0);
  }, []);

  useEffect(() => {
    next();
    setScore(0);
    setStreak(0);
    setRound(0);
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (opt) => {
    if (picked) return;
    setPicked(opt);
    setRound((r) => r + 1);
    if (opt.cca3 === question.answer.cca3) {
      const ns = streak + 1;
      const nScore = score + 1;
      setScore(nScore);
      setStreak(ns);
      if (nScore > best) {
        setBest(nScore);
        try {
          localStorage.setItem(BEST_KEY, String(nScore));
        } catch {}
      }
    } else {
      setStreak(0);
    }
  };

  if (!question) {
    return (
      <Layout title="Flag Quiz" canonicalPath="/quiz">
        <Card className={styles.loading}>Loading quiz…</Card>
      </Layout>
    );
  }

  const answered = !!picked;

  return (
    <Layout title="Flag Quiz" canonicalPath="/quiz">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Guess the Flag</h1>
          <p className={styles.sub}>Identify the country from its flag. Real flags, no tricks.</p>
        </div>
        <div className={styles.scoreboard}>
          <div>
            <span>{score}</span>Score
          </div>
          <div>
            <span>🔥 {streak}</span>Streak
          </div>
          <div>
            <span>🏆 {best}</span>Best
          </div>
        </div>
      </div>

      <div className={styles.difficulty} role="group" aria-label="Difficulty">
        {Object.entries(DIFFICULTY).map(([key, cfg]) => (
          <button
            key={key}
            className={key === difficulty ? styles.diffActive : styles.diff}
            onClick={() => setDifficulty(key)}
            aria-pressed={key === difficulty}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <Card className={styles.card}>
        <div className={styles.flagWrap}>
          <img src={question.answer.flag} alt="Flag to identify" className={styles.flag} />
        </div>

        <div className={styles.options}>
          {question.options.map((opt) => {
            let cls = styles.option;
            if (answered) {
              if (opt.cca3 === question.answer.cca3) cls = styles.optionCorrect;
              else if (opt.cca3 === picked.cca3) cls = styles.optionWrong;
              else cls = styles.optionDim;
            }
            return (
              <button key={opt.cca3} className={cls} onClick={() => choose(opt)} disabled={answered}>
                {opt.name}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={styles.feedback}>
            {picked.cca3 === question.answer.cca3 ? (
              <span className={styles.correct}>Correct! 🎉</span>
            ) : (
              <span className={styles.wrong}>
                It was <b>{question.answer.name}</b>.
              </span>
            )}
            <div className={styles.feedbackActions}>
              <Link href={`/country/${question.answer.slug}`} className={styles.learn}>
                Learn about {question.answer.name} →
              </Link>
              <button className={styles.nextBtn} onClick={next} autoFocus>
                Next flag →
              </button>
            </div>
          </div>
        )}
      </Card>

      <p className={styles.roundInfo}>
        Round {round} · Difficulty: {DIFFICULTY[difficulty].label}
      </p>
    </Layout>
  );
}

export async function getStaticProps() {
  const all = getAllCountries();
  const light = (c) => ({ name: c.name, slug: c.slug, cca3: c.cca3, flag: c.flag.w320 });
  const byPop = [...all]
    .filter((c) => c.population != null)
    .sort((a, b) => b.population - a.population)
    .map(light);
  return { props: { byPop, all: all.map(light) } };
}
