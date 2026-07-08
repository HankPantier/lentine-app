/**
 * Reconciles persisted onboarding auth fields with the REAL Supabase session at app start.
 * Persisted state can outlive a session (sign-out on another device, expired token, dev
 * storage) — the session is the single source of truth for "signed in". Pure module (no
 * supabase import) so the decision table is unit-testable — same pattern as lib/name.ts.
 */

/** Patch to apply to onboarding state, or null when persisted auth already matches. */
export function reconcileAuth(
  persisted: { userId: string | null },
  sessionUserId: string | null,
): { userId: string | null; subscription: null } | { userId: string } | null {
  if (!sessionUserId) {
    // No live session: a persisted userId is stale. Clear the auth fields only — the
    // member's dosha/quiz data is a content preference, not an auth credential.
    return persisted.userId ? { userId: null, subscription: null } : null;
  }
  // Live session: make sure state carries it (restores after reload, fixes a mismatch).
  return persisted.userId === sessionUserId ? null : { userId: sessionUserId };
}
