// deno test — handler tests with injected deps (no real Supabase).
// Run: deno test supabase/functions/delete-account/

import { assertEquals } from 'jsr:@std/assert@1';
import { handleDeleteAccount, type DeleteDeps } from './handler.ts';

function fakeDeps(overrides: Partial<DeleteDeps> = {}) {
  const calls: { data: string[]; auth: string[] } = { data: [], auth: [] };
  const deps: DeleteDeps = {
    getUser: (token) => Promise.resolve(token === 'good-token' ? { id: 'user-1' } : null),
    deleteUserData: (userId) => {
      calls.data.push(userId);
      return Promise.resolve();
    },
    deleteAuthUser: (userId) => {
      calls.auth.push(userId);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { deps, calls };
}

function request(overrides: { method?: string; authHeader?: string | null } = {}) {
  return {
    method: overrides.method ?? 'POST',
    authHeader: 'authHeader' in overrides ? (overrides.authHeader ?? null) : 'Bearer good-token',
  };
}

Deno.test('rejects non-POST', async () => {
  const { deps } = fakeDeps();
  const res = await handleDeleteAccount(request({ method: 'GET' }), deps);
  assertEquals(res.status, 405);
});

Deno.test('401 without a token', async () => {
  const { deps } = fakeDeps();
  const res = await handleDeleteAccount(request({ authHeader: null }), deps);
  assertEquals(res.status, 401);
});

Deno.test('401 on an invalid token', async () => {
  const { deps } = fakeDeps();
  const res = await handleDeleteAccount(request({ authHeader: 'Bearer bad-token' }), deps);
  assertEquals(res.status, 401);
});

Deno.test('happy path deletes data then the auth user', async () => {
  const { deps, calls } = fakeDeps();
  const res = await handleDeleteAccount(request(), deps);
  assertEquals(res.status, 200);
  assertEquals(res.body, { ok: true });
  assertEquals(calls.data, ['user-1']);
  assertEquals(calls.auth, ['user-1']);
});

Deno.test('does not delete the auth user when data deletion fails', async () => {
  const { deps, calls } = fakeDeps({
    deleteUserData: () => Promise.reject(new Error('db down')),
  });
  const res = await handleDeleteAccount(request(), deps);
  assertEquals(res.status, 500);
  assertEquals(res.body, { ok: false, reason: 'delete_failed' });
  assertEquals(calls.auth, []); // auth user untouched → member can retry
});

Deno.test('reports failure when auth-user deletion throws', async () => {
  const { deps } = fakeDeps({
    deleteAuthUser: () => Promise.reject(new Error('admin error')),
  });
  const res = await handleDeleteAccount(request(), deps);
  assertEquals(res.status, 500);
  assertEquals(res.body, { ok: false, reason: 'delete_failed' });
});
