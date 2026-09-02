import Link from "next/link";
import { useEffect, useState } from "react";
import Layout from "../components/Layout/Layout";
import { CountryCard, EmptyState, SectionTitle } from "../components/ui/UI";
import { getCountryByCode } from "../lib/countries";
import { useFavorites } from "../lib/storage";
import styles from "../styles/Favorites.module.css";

export default function Favorites() {
  const { favorites, toggle } = useFavorites();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const countries = favorites.map(getCountryByCode).filter(Boolean);

  // Avoid hydration mismatch: localStorage isn't available server-side.
  if (!mounted) {
    return (
      <Layout title="My countries" canonicalPath="/favorites">
        <SectionTitle eyebrow="Saved">My countries</SectionTitle>
      </Layout>
    );
  }

  return (
    <Layout title="My countries" canonicalPath="/favorites">
      <SectionTitle
        eyebrow="Saved"
        action={
          countries.length >= 2 ? (
            <Link href={`/compare?a=${countries[0].cca3}&b=${countries[1].cca3}`} className={styles.compareBtn}>
              Compare first two ⇄
            </Link>
          ) : null
        }
      >
        My countries
      </SectionTitle>

      {countries.length === 0 ? (
        <EmptyState title="No saved countries yet">
          Open any country and tap “☆ Save country” to build your list. It's stored locally in your browser — no account
          needed.
        </EmptyState>
      ) : (
        <div className={styles.grid}>
          {countries.map((c) => (
            <div className={styles.item} key={c.cca3}>
              <CountryCard country={c} />
              <button
                className={styles.remove}
                onClick={() => toggle(c.cca3)}
                aria-label={`Remove ${c.name} from favorites`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
