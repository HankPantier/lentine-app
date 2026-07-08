import { reconcileAuth } from './auth-reconcile';

describe('reconcileAuth', () => {
  it('clears userId and subscription when state has a userId but no session', () => {
    expect(reconcileAuth({ userId: 'stale-user' }, null)).toEqual({
      userId: null,
      subscription: null,
    });
  });

  it('the clearing patch touches exactly userId and subscription (dosha/quiz survive)', () => {
    const patch = reconcileAuth({ userId: 'stale-user' }, null);
    expect(Object.keys(patch ?? {}).sort()).toEqual(['subscription', 'userId']);
  });

  it('returns null when neither state nor session has a user', () => {
    expect(reconcileAuth({ userId: null }, null)).toBeNull();
  });

  it('returns null when the session user matches state.userId (fresh sign-in untouched)', () => {
    expect(reconcileAuth({ userId: 'user-1' }, 'user-1')).toBeNull();
  });

  it('restores userId from a live session when state lost it', () => {
    expect(reconcileAuth({ userId: null }, 'user-1')).toEqual({ userId: 'user-1' });
  });

  it('overwrites a mismatched stale userId with the live session user', () => {
    expect(reconcileAuth({ userId: 'old-user' }, 'new-user')).toEqual({ userId: 'new-user' });
  });
});
