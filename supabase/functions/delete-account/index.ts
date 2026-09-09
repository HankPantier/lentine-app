// delete-account — permanently delete the signed-in member's account (Apple 5.1.1(v)).
//
// POST with the caller's Supabase JWT →
//   { ok: true }           account + data deleted
//   { ok: false, reason }  nothing deleted → app shows an error
// See handler.ts for the logic and contract.
//
// Deploy with gateway JWT verification ON (the default; the handler verifies the JWT too):
//   supabase functions deploy delete-account
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provisioned in the function runtime.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleDeleteAccount, type DeleteDeps } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

const deps: DeleteDeps = {
  getUser: async (token) => {
    const { data, error } = await adminClient().auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },

  // Remove the member's rows. Tables keyed on the user id; ignore "no rows" but surface real
  // errors so the caller can retry. `profiles` is keyed by `id`, other tables by `user_id`.
  deleteUserData: async (userId) => {
    const admin = adminClient();
    const subs = await admin.from('subscriptions').delete().eq('user_id', userId);
    if (subs.error) throw subs.error;
    const profile = await admin.from('profiles').delete().eq('id', userId);
    if (profile.error) throw profile.error;
  },

  deleteAuthUser: async (userId) => {
    const { error } = await adminClient().auth.admin.deleteUser(userId);
    if (error) throw error;
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'supabase not configured' }, 500);

  const res = await handleDeleteAccount(
    { method: req.method, authHeader: req.headers.get('Authorization') },
    deps,
  );
  return json(res.body, res.status);
});
