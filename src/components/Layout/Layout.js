import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SITE_URL } from "../../lib/site";
import { useTheme } from "../../lib/theme";
import styles from "./Layout.module.css";

const SITE = "Atlas — Country Intelligence Explorer";
const DEFAULT_DESC =
  "Explore, compare and understand every country on Earth. Population, geography, languages, currencies, live local time, rankings and more.";

const NAV = [
  { href: "/", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/rankings/population", label: "Rankings" },
  { href: "/compare", label: "Compare" },
  { href: "/world", label: "World" },
  { href: "/lab", label: "Lab" },
  { href: "/play", label: "Play" },
  { href: "/favorites", label: "Favorites" },
];

function Logo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="url(#g)" strokeWidth="2" />
        <path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" stroke="url(#g)" strokeWidth="1.6" fill="none" />
        <defs>
          <linearGradient id="g" x1="2" y1="2" x2="22" y2="22">
            <stop stopColor="#4f46e5" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <b>Atlas</b>
    </span>
  );
}

export default function Layout({
  children,
  title,
  description = DEFAULT_DESC,
  canonicalPath,
  ogImage,
  jsonLd,
  wide = false,
}) {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pageTitle = title ? `${title} · Atlas` : SITE;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;
  const image = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${SITE_URL}${ogImage}`
    : `${SITE_URL}/api/og/default`;

  const isActive = (href) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href.split("/").slice(0, 2).join("/"));

  return (
    <div className={styles.shell}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:site_name" content="Atlas" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={image} />
        {canonical && <meta property="og:url" content={canonical} />}
        {canonical && <link rel="canonical" href={canonical} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#4f46e5" />
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      </Head>

      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" aria-label="Atlas home">
            {Logo()}
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            {NAV.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className={isActive(item.href) ? styles.navActive : styles.navLink}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            className={styles.themeBtn}
            onClick={toggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            title="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main id="main" className={wide ? styles.mainWide : styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>
            Data:{" "}
            <Link href="/sources" className={styles.footerLink}>
              sources & methodology
            </Link>
          </span>
          <span>Built by Mayur · live data from World Bank & open.er-api.com</span>
        </div>
      </footer>
    </div>
  );
}
