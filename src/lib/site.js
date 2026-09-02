// Central place for the canonical site URL. Configured via NEXT_PUBLIC_SITE_URL
// (see .env.local). Falls back to the production domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://world.mayyur.com").replace(/\/$/, "");

export const SITE_NAME = "Atlas — Country Intelligence Explorer";

export function absUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
