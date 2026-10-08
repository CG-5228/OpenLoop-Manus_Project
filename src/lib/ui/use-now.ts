"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Current time, refreshed on an interval. Overdue status and relative
 * deadlines depend on it, so they stay correct while the dashboard is open.
 *
 * Built on useSyncExternalStore so the clock is only read in the browser:
 * during prerendering the server snapshot (epoch) is used, which keeps the
 * static shell deterministic under Cache Components.
 */
export function useNow(intervalMs = 30_000) {
  const ts = useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, Math.min(intervalMs, 5_000));
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
  return useMemo(() => new Date(ts), [ts]);
}
