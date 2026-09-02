import Head from "next/head";
import { useEffect } from "react";
import { ThemeProvider, themeInitScript } from "../lib/theme";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  // Register the service worker for offline support (production only).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
        {/* Applied before paint to avoid a theme flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </Head>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
}

export default MyApp;
