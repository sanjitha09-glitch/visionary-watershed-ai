import { useSyncExternalStore } from "react";
import type { GeoScope } from "./geo";

export type Period = "12m" | "24m" | "36m" | "all";
type ScopeState = GeoScope & { period: Period };

const KEY = "jd-geo-scope";
let state: ScopeState = { period: "24m" };
if (typeof window !== "undefined") {
  try {
    state = { ...state, ...JSON.parse(sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    /* ignore corrupt cache */
  }
}
const listeners = new Set<() => void>();

/** Shared geographic context (State → District → Block → Watershed) used across modules. */
export function setGeoScope(patch: Partial<ScopeState>) {
  const next = { ...state, ...patch };
  // Changing a parent level clears its descendants.
  if ("stateId" in patch && patch.stateId !== state.stateId) Object.assign(next, { districtId: undefined, blockId: undefined, watershedId: undefined });
  if ("districtId" in patch && patch.districtId !== state.districtId) Object.assign(next, { blockId: undefined, watershedId: undefined });
  if ("blockId" in patch && patch.blockId !== state.blockId) Object.assign(next, { watershedId: undefined });
  state = next;
  sessionStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useGeoScope() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function periodStart(p: Period): Date | null {
  if (p === "all") return null;
  const months = { "12m": 12, "24m": 24, "36m": 36 }[p];
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}
