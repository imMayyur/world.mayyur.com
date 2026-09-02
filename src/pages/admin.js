import { useEffect, useState } from "react";
import Layout from "../components/Layout/Layout";
import { Card, SectionTitle } from "../components/ui/UI";
import { formatFull } from "../lib/format";
import styles from "../styles/Admin.module.css";

export default function Admin() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | ready | error
  const [diff, setDiff] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  // Remember the code for this browser session only (never persisted to disk).
  useEffect(() => {
    const saved = sessionStorage.getItem("we.admin.code");
    if (saved) setCode(saved);
  }, []);

  async function runDiff(e) {
    if (e) e.preventDefault();
    if (!code.trim()) return;
    setStatus("checking");
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/diff`, { headers: { "x-admin-code": code } });
      const j = await r.json();
      if (!r.ok) {
        setStatus("error");
        setMessage(j.error || "Request failed");
        return;
      }
      sessionStorage.setItem("we.admin.code", code);
      setDiff(j);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  async function refreshCache(redeploy) {
    setBusy(true);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-code": code },
        body: JSON.stringify({ redeploy }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.error || "Refresh failed");
      } else {
        const parts = [`Cleared ${j.clearedCacheEntries} cached entries.`];
        if (j.redeploy) parts.push(`Redeploy: ${j.redeploy}`);
        setMessage(parts.join(" "));
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Admin · Data" canonicalPath="/admin">
      <SectionTitle eyebrow="Maintenance">Data admin</SectionTitle>

      {status !== "ready" && (
        <Card className={styles.gate}>
          <p className={styles.gateText}>
            Enter your access code to inspect and refresh data. No account needed —
            this single code is the only credential.
          </p>
          <form onSubmit={runDiff} className={styles.gateForm}>
            <input
              type="password"
              className={styles.input}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              aria-label="Admin access code"
              autoComplete="off"
            />
            <button className={styles.primary} type="submit" disabled={status === "checking"}>
              {status === "checking" ? "Checking…" : "Unlock"}
            </button>
          </form>
          {status === "error" && <p className={styles.err}>{message}</p>}
        </Card>
      )}

      {status === "ready" && diff && (
        <>
          <div className={styles.summaryRow}>
            <Card className={styles.summary}>
              <div className={styles.big}>{diff.mismatchCount}</div>
              <div className={styles.small}>population mismatches (&gt; {diff.threshold})</div>
            </Card>
            <Card className={styles.summary}>
              <div className={styles.big}>{diff.comparedCountries}</div>
              <div className={styles.small}>countries compared</div>
            </Card>
            <Card className={styles.summary}>
              <div className={styles.big}>{diff.sourceYear || "—"}</div>
              <div className={styles.small}>latest World Bank year</div>
            </Card>
          </div>

          <Card className={styles.actions}>
            <div>
              <h3 className={styles.h3}>Refresh live data</h3>
              <p className={styles.muted}>
                Clears the server's cached World Bank / exchange-rate responses so the
                next visitors immediately get fresh figures. Takes effect right away.
              </p>
            </div>
            <button className={styles.primary} onClick={() => refreshCache(false)} disabled={busy}>
              {busy ? "Working…" : "Clear live cache"}
            </button>
          </Card>

          <Card className={styles.actions}>
            <div>
              <h3 className={styles.h3}>Rebuild bundled dataset</h3>
              <p className={styles.muted}>
                Permanently regenerating the bundled reference data (names, flags,
                populations, map shapes) must happen at build time. If a deploy hook is
                configured on the server, this button triggers a full rebuild &amp;
                redeploy. Otherwise, run this locally:
              </p>
              <code className={styles.code}>npm run data:refresh &amp;&amp; npm run map</code>
            </div>
            <button className={styles.secondary} onClick={() => refreshCache(true)} disabled={busy}>
              {busy ? "Working…" : "Trigger rebuild"}
            </button>
          </Card>

          {message && <Card className={styles.msg}>{message}</Card>}

          <SectionTitle eyebrow="Stored vs live">
            Population mismatches ({diff.mismatchCount})
          </SectionTitle>
          {diff.mismatches.length === 0 ? (
            <Card className={styles.msg}>Bundled populations are within {diff.threshold} of live World Bank figures. No refresh needed.</Card>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Country</th>
                    <th className={styles.num}>Stored</th>
                    <th className={styles.num}>Live (WB)</th>
                    <th className={styles.num}>Year</th>
                    <th className={styles.num}>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.mismatches.map((m) => (
                    <tr key={m.cca3}>
                      <td>{m.name} <span className={styles.iso}>{m.cca3}</span></td>
                      <td className={styles.num}>{formatFull(m.stored)}</td>
                      <td className={styles.num}>{formatFull(m.live)}</td>
                      <td className={styles.num}>{m.liveYear}</td>
                      <td className={`${styles.num} ${styles.delta}`}>{m.deltaPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
