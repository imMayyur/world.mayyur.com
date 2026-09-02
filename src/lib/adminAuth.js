// Admin access is a single unique code (no username/password), read from the
// ADMIN_CODE environment variable. It is ONLY ever used server-side — the code
// is never sent to the browser or committed to git.
//
// Set it in your host's env settings (e.g. Vercel → Settings → Environment
// Variables) and locally in a `.env.local` file:  ADMIN_CODE=your-secret-code
//
// If ADMIN_CODE is unset, admin actions are disabled (fail closed).

export function getAdminCode() {
  return process.env.ADMIN_CODE || null;
}

export function isAuthorized(req) {
  const expected = getAdminCode();
  if (!expected) return false; // no code configured => locked
  const provided =
    req.headers["x-admin-code"] ||
    (req.body && req.body.code) ||
    req.query.code ||
    "";
  // Constant-time-ish comparison (length check first to avoid trivial leaks).
  if (typeof provided !== "string" || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
