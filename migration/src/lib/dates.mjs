// WooCommerce stores subscription schedule dates as UTC datetime strings
// ('YYYY-MM-DD HH:MM:SS'). Normalise to ISO-8601 (Z), or null when absent/zero.

const ZERO = '0000-00-00 00:00:00';

/** 'YYYY-MM-DD HH:MM:SS' (UTC) → '2026-11-03T00:00:00.000Z', or null. */
export function wcDateToIso(value) {
  if (value == null) return null;
  // mysql2 may hand back a JS Date for DATETIME columns; pass those straight through.
  if (value instanceof Date) return isNaN(value) ? null : value.toISOString();
  const s = String(value).trim();
  if (!s || s === ZERO || s.startsWith('0000-00-00')) return null;
  const iso = s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
