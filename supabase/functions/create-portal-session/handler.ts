// create-portal-session handler — pure and dependency-injected so it tests without Stripe/Supabase.
//
// Response contract (all business outcomes are HTTP 200 — supabase.functions.invoke wraps
// non-2xx in FunctionsHttpError whose body is awkward to read cross-platform):
//   { url }                        → open the Stripe Customer Portal here
//   { manageable: false, reason }  → this user's billing can't be managed via Stripe;
//                                    the app shows the "manage on the web" fallback.
// Only auth failures are 401, transport problems 4xx/5xx.
//
// Stripe is the authority on "manageable": rows with a customer id attempt a portal session
// and map `resource_missing` to manageable:false — no heuristics about cut-over state.

export interface PortalDeps {
  /** Resolve a Supabase JWT to the user, or null. */
  getUser: (token: string) => Promise<{ id: string } | null>;
  getSubscriptionRow: (userId: string) => Promise<
    { stripe_customer_id: string | null; stripe_subscription_id: string | null; status: string } | null
  >;
  createPortalSession: (customer: string, returnUrl: string) => Promise<{ url: string }>;
  env: {
    /** Fallback return_url — the portal requires http(s); lentine:// is rejected by Stripe. */
    PORTAL_RETURN_URL: string;
    /** Comma-separated origins allowed to supply their own returnUrl (web builds). */
    PORTAL_RETURN_ORIGINS: string;
  };
}

export interface PortalRequest {
  method: string;
  authHeader: string | null;
  body: { returnUrl?: string };
}

export interface PortalResponse {
  status: number;
  body: Record<string, unknown>;
}

/** The caller's returnUrl when its origin is allowlisted, else the configured fallback. */
export function resolveReturnUrl(requested: string | undefined, env: PortalDeps['env']): string {
  if (requested) {
    try {
      const origin = new URL(requested).origin;
      const allowed = env.PORTAL_RETURN_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
      if (allowed.includes(origin)) return requested;
    } catch {
      // malformed URL — fall through to the fallback
    }
  }
  return env.PORTAL_RETURN_URL;
}

export async function handlePortalRequest(req: PortalRequest, deps: PortalDeps): Promise<PortalResponse> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method not allowed' } };

  const token = req.authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return { status: 401, body: { error: 'authentication required' } };
  const user = await deps.getUser(token);
  if (!user) return { status: 401, body: { error: 'invalid token' } };

  const row = await deps.getSubscriptionRow(user.id);
  if (!row) return { status: 200, body: { manageable: false, reason: 'no_subscription' } };
  if (!row.stripe_customer_id) {
    return { status: 200, body: { manageable: false, reason: 'no_stripe_customer' } };
  }

  const returnUrl = resolveReturnUrl(req.body.returnUrl, deps.env);
  try {
    const session = await deps.createPortalSession(row.stripe_customer_id, returnUrl);
    return { status: 200, body: { url: session.url } };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'resource_missing') {
      // Customer id from the WooPayments era — not in our Stripe account (yet).
      return { status: 200, body: { manageable: false, reason: 'not_in_stripe' } };
    }
    console.error(`create-portal-session: stripe error: ${(err as Error).message}`);
    return { status: 200, body: { manageable: false, reason: 'stripe_error' } };
  }
}
