// delete-account handler — pure and dependency-injected so it tests without Supabase.
//
// Apple App Store Guideline 5.1.1(v): an app that supports account creation must let the
// user delete their account from inside the app. This permanently removes the member's data
// and their auth user.
//
// Response contract:
//   { ok: true }                 → account deleted; the app signs out and returns home
//   { ok: false, reason }        → nothing was deleted; the app shows a retry/error message
// Auth failures are 401; a wrong method is 405; a delete that throws is 500 with ok:false.
//
// Order matters: dependent data is removed first, then the auth user. If data deletion throws
// the auth user still exists, so the member can retry — we never orphan an auth user's data.

export interface DeleteDeps {
  /** Resolve a Supabase JWT to the user, or null. */
  getUser: (token: string) => Promise<{ id: string } | null>;
  /** Delete the member's rows (profile, subscription, etc.). Throws on failure. */
  deleteUserData: (userId: string) => Promise<void>;
  /** Delete the Supabase auth user. Throws on failure. */
  deleteAuthUser: (userId: string) => Promise<void>;
}

export interface DeleteRequest {
  method: string;
  authHeader: string | null;
}

export interface DeleteResponse {
  status: number;
  body: Record<string, unknown>;
}

export async function handleDeleteAccount(req: DeleteRequest, deps: DeleteDeps): Promise<DeleteResponse> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method not allowed' } };

  const token = req.authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { status: 401, body: { error: 'authentication required' } };
  const user = await deps.getUser(token);
  if (!user) return { status: 401, body: { error: 'invalid token' } };

  try {
    await deps.deleteUserData(user.id);
    await deps.deleteAuthUser(user.id);
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error(`delete-account: delete failed for ${user.id}: ${(err as Error).message}`);
    return { status: 500, body: { ok: false, reason: 'delete_failed' } };
  }
}
