-- 0007 — Track pending cancellations on subscriptions
-- Paste this whole file into the Supabase SQL editor (STAGING project) and run it.
-- Additive and safe to re-run.
--
-- Mirrors Stripe's `cancel_at_period_end`: true means the member cancelled in the billing
-- portal but keeps access until current_period_end (the app renders "Cancels <date>" instead
-- of "Renews <date>"). Written only by the stripe-webhook edge function (service role);
-- readable via the existing "subscriptions: read own" policy.

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
