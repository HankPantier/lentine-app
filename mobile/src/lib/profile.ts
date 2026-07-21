import type { OnboardingState } from '@/onboarding/state';
import type { Answer, DoshaKey, Tally } from '@/quiz/types';
import { asAnswers, asTally, isDoshaKey } from './dosha-encoding';
import { asFavorites, type FavoriteEntry, mergeFavorites } from './favorites-encoding';
import { type ProfileName, splitName } from './name';
import { type NotificationPrefs, normalizePrefs } from './notification-prefs';
import { supabase } from './supabase';

/**
 * Read the signed-in member's name from their profile `display_name` (RLS scopes it to their own
 * row). Returns null when there's no usable name — caller then leaves local name state untouched.
 */
export async function fetchProfileName(userId: string): Promise<ProfileName | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data?.display_name) return null;
  const name = splitName(data.display_name as string);
  return name.firstName ? name : null;
}

/**
 * Read the member's notification preferences from their profile (RLS scopes it to their own row).
 * Returns null on error / no row so the caller keeps whatever is already local; a present-but-empty
 * `notification_prefs` normalizes to the opted-in default.
 */
export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return normalizePrefs(data.notification_prefs);
}

/**
 * Persist the member's notification preferences. RLS ("profiles: update own") allows a signed-in
 * user to write their own row only. Best-effort — returns the error message for the caller to show.
 */
export async function persistNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

/**
 * Read the member's favorites from their profile (RLS scopes it to their own row). Returns
 * null on error / no row so the caller keeps whatever is already local; malformed entries in
 * the stored array are dropped by asFavorites.
 */
export async function fetchFavorites(userId: string): Promise<FavoriteEntry[] | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('favorites')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return asFavorites(data.favorites);
}

/**
 * Persist the member's favorites (whole array — the list is personal-sized). RLS
 * ("profiles: update own") allows a signed-in user to write their own row only.
 * Best-effort — returns the error message for the caller to log.
 */
export async function persistFavorites(
  userId: string,
  favorites: FavoriteEntry[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ favorites })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

/**
 * Reconcile local favorites with the server after auth resolves. Unlike the dosha (where the
 * server wins), favorites merge as a UNION — hearts tapped while signed out, or on another
 * device, must both survive the sign-in. The merged list is written back to both sides.
 * Best-effort: any failure leaves local state intact and is surfaced to the console only.
 */
export async function syncFavoritesOnAuth(
  userId: string,
  local: FavoriteEntry[],
  update: (patch: Partial<OnboardingState>) => void,
): Promise<void> {
  try {
    const server = await fetchFavorites(userId);
    const merged = mergeFavorites(server ?? [], local);
    update({ favorites: merged });
    // Skip the write when nothing changed server-side (common case: same list both sides).
    if (JSON.stringify(merged) !== JSON.stringify(server ?? [])) {
      const { error } = await persistFavorites(userId, merged);
      if (error) console.warn('[favorites] back-fill failed:', error);
    }
  } catch (e) {
    console.warn('[favorites] sync failed:', e);
  }
}

/** The Dosha result as stored on the member's profile row. */
export interface ProfileDosha {
  primary: DoshaKey;
  scores: Tally | null;
  takenAt: string | null;
  /** Per-question answers behind the result; null on rows written before 0004. */
  answers: Answer[] | null;
}

/**
 * Read the signed-in member's stored Dosha (RLS scopes it to their own row). Returns null
 * when the row has no dosha yet — e.g. a member who hasn't taken the quiz. Mirrors the
 * select pattern in lib/subscription.ts.
 */
export async function fetchProfileDosha(userId: string): Promise<ProfileDosha | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('primary_dosha, dosha_scores, dosha_taken_at, dosha_answers')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || !isDoshaKey(data.primary_dosha)) return null;

  return {
    primary: data.primary_dosha,
    scores: asTally(data.dosha_scores),
    takenAt: (data.dosha_taken_at as string | null) ?? null,
    answers: asAnswers(data.dosha_answers),
  };
}

/**
 * Persist the member's Dosha result to their profile. RLS ("profiles: update own") allows a
 * signed-in user to write their own row only. The profile row already exists (created by the
 * handle_new_user trigger on sign-up, or by the migration loader), so this is a plain update.
 */
export async function persistDosha(
  userId: string,
  primary: DoshaKey,
  scores: Tally,
  takenAt: string,
  answers: Answer[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      primary_dosha: primary,
      dosha_scores: scores,
      dosha_taken_at: takenAt,
      dosha_answers: answers,
    })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

/**
 * Reconcile the local Dosha with the server after auth resolves. One source of truth lives
 * in Supabase, but the quiz can be taken before a session exists (e.g. email-confirmation on)
 * — so:
 *   - server has a dosha  → hydrate it locally (restores it across devices / reinstalls);
 *   - server has none but local does → back-fill the server.
 * Best-effort: any failure leaves local state intact and is surfaced to the console only.
 */
export async function syncDoshaOnAuth(
  userId: string,
  local: Pick<OnboardingState, 'dosha' | 'doshaScores' | 'doshaTakenAt' | 'answers'>,
  update: (patch: Partial<OnboardingState>) => void,
): Promise<OnboardingState['dosha']> {
  try {
    const server = await fetchProfileDosha(userId);
    if (server) {
      update({
        dosha: server.primary,
        doshaScores: server.scores,
        doshaTakenAt: server.takenAt,
        // Older rows (pre-0004) have no answers — keep whatever is already local.
        ...(server.answers ? { answers: server.answers } : {}),
      });
      return server.primary;
    }
    if (local.dosha && local.doshaScores) {
      const takenAt = local.doshaTakenAt ?? new Date().toISOString();
      const { error } = await persistDosha(userId, local.dosha, local.doshaScores, takenAt, local.answers);
      if (error) console.warn('[dosha] back-fill failed:', error);
      else update({ doshaTakenAt: takenAt });
    }
  } catch (e) {
    console.warn('[dosha] sync failed:', e);
  }
  // The caller may route on the outcome (e.g. skip the quiz offer when a dosha exists).
  return local.dosha ?? null;
}
