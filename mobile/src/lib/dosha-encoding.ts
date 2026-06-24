import { DOSHA_ORDER } from '@/quiz/scoring';
import type { DoshaKey, Tally } from '@/quiz/types';

// Pure encode/decode helpers for the Dosha columns on profiles. Kept free of any I/O so the
// storage contract (what we read back out of jsonb) is unit-testable without a Supabase client.

export function isDoshaKey(v: unknown): v is DoshaKey {
  return v === 'vata' || v === 'pitta' || v === 'kapha';
}

/** Coerce a jsonb blob into a Tally, defaulting missing/!numeric counts to 0. */
export function asTally(v: unknown): Tally | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const t: Tally = { vata: 0, pitta: 0, kapha: 0 };
  for (const k of DOSHA_ORDER) {
    if (typeof o[k] === 'number') t[k] = o[k] as number;
  }
  return t;
}
