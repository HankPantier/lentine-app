import type { OnboardingState } from '@/onboarding/state';
import type { Answer, DoshaKey, Tally } from '@/quiz/types';
import { asAnswers, asTally, isDoshaKey } from './dosha-encoding';
import { type ProfileName, splitName } from './name';
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
): Promise<void> {
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
      return;
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
}
