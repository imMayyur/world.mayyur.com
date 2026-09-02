import { useEffect, useState } from "react";

// Small client cache so navigating back to a country doesn't refetch.
const memo = new Map();

export function useIndicators(cca3) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    if (!cca3) return;
    let alive = true;

    if (memo.has(cca3)) {
      setState({ status: "success", data: memo.get(cca3), error: null });
      return;
    }

    setState({ status: "loading", data: null, error: null });
    fetch(`/api/indicators/${cca3}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        memo.set(cca3, data);
        setState({ status: "success", data, error: null });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ status: "error", data: null, error: err.message });
      });

    return () => {
      alive = false;
    };
  }, [cca3]);

  return state;
}

const fxMemo = new Map();

export function useFx(base) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    if (!base) return;
    let alive = true;

    if (fxMemo.has(base)) {
      setState({ status: "success", data: fxMemo.get(base) });
      return;
    }

    setState({ status: "loading", data: null });
    fetch(`/api/fx?base=${base}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        fxMemo.set(base, data);
        setState({ status: "success", data });
      })
      .catch(() => {
        if (!alive) return;
        setState({ status: "error", data: null });
      });

    return () => {
      alive = false;
    };
  }, [base]);

  return state;
}
