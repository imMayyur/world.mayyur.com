// Admin: clear the server-side live-data cache so the next visitor requests
// fetch fresh World Bank / FX data immediately (instead of waiting for TTL).
//
// Optionally, if a rebuild deploy hook is configured (DEPLOY_HOOK_URL), this can
// also trigger a full redeploy — which re-runs the build-time data scripts and
// permanently regenerates the bundled dataset. That is the only way to make new
// reference data persist on a read-only serverless filesystem.

import { isAuthorized } from "../../../lib/adminAuth";
import { cacheClear, cacheStats } from "../../../lib/serverCache";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized. Provide a valid admin code." });
  }

  const before = cacheStats().entries;
  const cleared = cacheClear(); // clear all live-data cache entries
  const result = { clearedCacheEntries: cleared, cacheEntriesBefore: before };

  // Optional: trigger a full rebuild/redeploy if a deploy hook is configured.
  const wantRedeploy = req.body && req.body.redeploy === true;
  const hook = process.env.DEPLOY_HOOK_URL;
  if (wantRedeploy) {
    if (!hook) {
      result.redeploy = "skipped: DEPLOY_HOOK_URL not configured";
    } else {
      try {
        const r = await fetch(hook, { method: "POST" });
        result.redeploy = r.ok
          ? "triggered: a rebuild is now running; the bundled dataset will refresh on deploy"
          : `failed: deploy hook returned ${r.status}`;
      } catch (e) {
        result.redeploy = `failed: ${e.message}`;
      }
    }
  }

  return res.status(200).json(result);
}
