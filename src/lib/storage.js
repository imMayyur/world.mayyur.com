import { useCallback, useEffect, useState } from "react";

const FAV_KEY = "we.favorites";
const RECENT_KEY = "we.recent";
const MAX_RECENT = 8;

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Notify same-tab listeners (the native `storage` event only fires cross-tab).
    window.dispatchEvent(new CustomEvent("we-storage", { detail: { key } }));
  } catch {
    /* storage full or unavailable — fail silently */
  }
}

// Favorites: array of cca3 codes.
export function useFavorites() {
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    setCodes(read(FAV_KEY, []));
    const onChange = (e) => {
      if (!e.detail || e.detail.key === FAV_KEY) setCodes(read(FAV_KEY, []));
    };
    window.addEventListener("we-storage", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("we-storage", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((code) => {
    const current = read(FAV_KEY, []);
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    write(FAV_KEY, next);
    setCodes(next);
  }, []);

  const isFavorite = useCallback((code) => codes.includes(code), [codes]);

  return { favorites: codes, toggle, isFavorite };
}

// Recently viewed: array of cca3 codes, most-recent first.
export function pushRecent(code) {
  if (!code) return;
  const current = read(RECENT_KEY, []).filter((c) => c !== code);
  current.unshift(code);
  write(RECENT_KEY, current.slice(0, MAX_RECENT));
}

export function useRecent() {
  const [codes, setCodes] = useState([]);
  useEffect(() => {
    setCodes(read(RECENT_KEY, []));
    const onChange = (e) => {
      if (!e.detail || e.detail.key === RECENT_KEY) setCodes(read(RECENT_KEY, []));
    };
    window.addEventListener("we-storage", onChange);
    return () => window.removeEventListener("we-storage", onChange);
  }, []);
  return codes;
}
