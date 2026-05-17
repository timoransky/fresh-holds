import type { VisitHistory } from "./types";

// Pure reconciliation logic — the load-bearing piece of the Visit log.
// Given the local and remote histories, returns what (if anything) needs
// to be applied locally and what (if anything) needs to be pushed to the
// server. nulls mean "no change needed."
//
// Extracted as a pure function so it can be tested without mocking React
// effects, localStorage, or the network. The hook calls this once per
// session after pulling from the server.
export type ReconcileResult = {
  applyLocal: VisitHistory | null;
  push: VisitHistory | null;
};

export function reconcile(local: VisitHistory, remote: VisitHistory): ReconcileResult {
  const union = unionHistories(local, remote);
  return {
    applyLocal: historiesEqual(union, local) ? null : union,
    push: historiesEqual(union, remote) ? null : union,
  };
}

function unionHistories(a: VisitHistory, b: VisitHistory): VisitHistory {
  const out: VisitHistory = {};
  const slugs = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const slug of slugs) {
    const merged = [...new Set([...(a[slug] ?? []), ...(b[slug] ?? [])])].sort();
    if (merged.length > 0) out[slug] = merged;
  }
  return out;
}

function historiesEqual(a: VisitHistory, b: VisitHistory): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const slug of aKeys) {
    const av = a[slug];
    const bv = b[slug];
    if (!bv || av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i++) {
      if (av[i] !== bv[i]) return false;
    }
  }
  return true;
}
