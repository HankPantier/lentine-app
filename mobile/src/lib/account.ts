import { supabase } from './supabase';

/**
 * Permanently delete the signed-in member's account via the delete-account edge function
 * (Apple App Store Guideline 5.1.1(v)). Every failure mode maps to `{ ok: false, reason }`
 * so the caller has exactly two branches: sign out, or show a retry message.
 */

export type DeleteAccountResult = { ok: true } | { ok: false; reason: string };

/** A hung request must surface as an error the UI can retry — never an eternal spinner. */
const REQUEST_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('request timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke('delete-account', { body: {} }));
    if (error) return { ok: false, reason: 'request_failed' };
    if (data?.ok === true) return { ok: true };
    return { ok: false, reason: (data?.reason as string | undefined) ?? 'unknown' };
  } catch (err) {
    console.warn('[account] delete failed:', err instanceof Error ? err.message : err);
    return { ok: false, reason: 'request_failed' };
  }
}
