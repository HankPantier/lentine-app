/**
 * Notification preferences: which categories a member wants to hear about. Persisted on the
 * profile row as `notification_prefs` (jsonb). Kept in its own pure module (no supabase import)
 * so the normalize logic is unit-testable — same pattern as lib/name.ts.
 */
export interface NotificationPrefs {
  rituals: boolean;
  recipes: boolean;
  btf: boolean;
}

/** New members default to opted-in on every category (they explicitly toggle off what they skip). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { rituals: true, recipes: true, btf: true };

/** All categories off — used when a member chooses "Maybe later". */
export const NO_NOTIFICATION_PREFS: NotificationPrefs = { rituals: false, recipes: false, btf: false };

/**
 * Coerce an unknown jsonb value (from the DB or storage) into a well-formed NotificationPrefs.
 * Missing/invalid keys fall back to the default so an old or partial row never breaks the UI.
 */
export function normalizePrefs(raw: unknown): NotificationPrefs {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const pick = (k: keyof NotificationPrefs) =>
    typeof o[k] === 'boolean' ? (o[k] as boolean) : DEFAULT_NOTIFICATION_PREFS[k];
  return { rituals: pick('rituals'), recipes: pick('recipes'), btf: pick('btf') };
}
