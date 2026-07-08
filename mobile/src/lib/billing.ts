import { Platform } from 'react-native';
import { SITE_URL } from '@/onboarding/pricing';
import { supabase } from './supabase';

/**
 * Billing management rides on Stripe's hosted Customer Portal: the create-portal-session
 * edge function returns a portal URL for the signed-in member, or `manageable: false` when
 * their billing isn't in our Stripe account (pre-cut-over WooPayments subscribers) — the
 * account screen then falls back to "manage on the web".
 */

export type PortalResult = { ok: true; url: string } | { ok: false; reason: string };

/** Where the site manages memberships today — the fallback when Stripe can't. */
export const MANAGE_ON_WEB_URL = `${SITE_URL}/my-account/`;

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

/**
 * The portal's return_url must be http(s) — Stripe rejects the lentine:// scheme. Web builds
 * return to the account screen; native sends nothing (the function falls back to its
 * configured PORTAL_RETURN_URL) and the app refreshes when the browser sheet closes.
 */
export function manageReturnUrl(): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/account`;
  }
  return undefined;
}

/**
 * Ask the edge function for a Stripe Customer Portal session. Every failure mode maps to
 * `{ ok: false, reason }` so the caller has exactly two branches: open the URL, or show
 * the web fallback.
 */
export async function openManageSubscription(returnUrl?: string): Promise<PortalResult> {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('create-portal-session', { body: { returnUrl } }),
    );
    if (error) return { ok: false, reason: 'request_failed' };
    if (typeof data?.url === 'string') return { ok: true, url: data.url };
    return { ok: false, reason: (data?.reason as string | undefined) ?? 'not_manageable' };
  } catch (err) {
    console.warn('[billing] portal session failed:', err instanceof Error ? err.message : err);
    return { ok: false, reason: 'request_failed' };
  }
}
