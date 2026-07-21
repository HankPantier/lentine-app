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
