import { deleteAccount } from './account';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const invoke = supabase.functions.invoke as jest.Mock;

describe('deleteAccount', () => {
  beforeEach(() => invoke.mockReset());

  it('invokes the delete-account edge function', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await deleteAccount();
    expect(invoke).toHaveBeenCalledWith('delete-account', { body: {} });
  });

  it('returns ok on a successful delete', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await deleteAccount()).toEqual({ ok: true });
  });

  it('maps a transport error to request_failed', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('boom') });
    expect(await deleteAccount()).toEqual({ ok: false, reason: 'request_failed' });
  });

  it('surfaces the server reason when the delete did not succeed', async () => {
    invoke.mockResolvedValue({ data: { ok: false, reason: 'delete_failed' }, error: null });
    expect(await deleteAccount()).toEqual({ ok: false, reason: 'delete_failed' });
  });

  it('maps a thrown/rejected invoke to request_failed', async () => {
    invoke.mockRejectedValue(new Error('network'));
    expect(await deleteAccount()).toEqual({ ok: false, reason: 'request_failed' });
  });
});
