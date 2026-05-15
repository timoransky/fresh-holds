import type { VisitHistory } from "@/lib/types";

// Date-level set union. Both inputs are immutable; result is a fresh map.
// Empty slug arrays in either input are dropped from the result.
export function unionHistories(a: VisitHistory, b: VisitHistory): VisitHistory {
  const out: VisitHistory = {};
  const slugs = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const slug of slugs) {
    const merged = [...new Set([...(a[slug] ?? []), ...(b[slug] ?? [])])].sort();
    if (merged.length > 0) out[slug] = merged;
  }
  return out;
}

// Structural equality on the {slug → sorted ISO-date list} shape. Inputs
// from this app's writers are always sorted+deduped, so a length+positional
// compare is sufficient.
export function historiesEqual(a: VisitHistory, b: VisitHistory): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const slug of ka) {
    const da = a[slug];
    const db = b[slug];
    if (!db || da.length !== db.length) return false;
    for (let i = 0; i < da.length; i++) {
      if (da[i] !== db[i]) return false;
    }
  }
  return true;
}
