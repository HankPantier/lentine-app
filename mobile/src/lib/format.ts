const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format an ISO timestamp as e.g. "February 2, 2027". Manual (no Intl/toLocaleDateString)
 * so it renders identically on Hermes (iOS/Android) and web — per the cross-platform rule.
 */
/** Capitalize a lowercased tag for display ("fall" → "Fall", "vata" → "Vata"). */
export function titleCase(label: string): string {
  return label ? label[0].toUpperCase() + label.slice(1) : label;
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
