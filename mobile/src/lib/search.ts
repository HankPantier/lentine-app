// Pure helpers for the home screen's full-catalog search.

/** Queries shorter than this (after normalization) don't trigger a search. */
export const MIN_QUERY_LEN = 2;

/** How long to wait after the last keystroke before hitting the edge function. */
export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Normalize raw input into a searchable query: trim, collapse internal whitespace.
 * Returns null when the result is too short to search — the caller's signal to
 * stay in (or return to) normal feed mode.
 */
export function normalizeQuery(raw: string): string | null {
  const q = raw.trim().replace(/\s+/g, ' ');
  return q.length >= MIN_QUERY_LEN ? q : null;
}

/**
 * Whether an already-loaded feed item matches the query (title/excerpt/category,
 * case-insensitive substring). Drives the instant "From the latest" results shown
 * while the full-catalog search is still in flight.
 */
export function matchesQuery(
  a: { title: string; excerpt: string; category: string | null },
  query: string,
): boolean {
  const q = query.toLowerCase();
  return (
    a.title.toLowerCase().includes(q) ||
    a.excerpt.toLowerCase().includes(q) ||
    (a.category ?? '').toLowerCase().includes(q)
  );
}
