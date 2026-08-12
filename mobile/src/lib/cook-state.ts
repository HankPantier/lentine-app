import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Per-recipe "checked off while cooking" ingredient state. Deliberately kept OUT of the
// onboarding state blob (`la_onb_state_v1`) so it never syncs to Supabase — this is ephemeral
// device-local cooking convenience, not account data. Same pure-helpers + defensive-normalize
// discipline as favorites-encoding: I/O wraps zero-I/O functions so the storage contract is
// unit-testable without AsyncStorage.

const STORAGE_KEY = 'la_cook_checked_v1';

/** A recipe's checked ingredients, mapped slug → list of ingredient keys. */
export type CookState = Record<string, string[]>;

/**
 * A stable identity for one ingredient row: its section + item position in the structured
 * data. Positional (not text-based) — duplicate/blank ingredient names make text keys fragile.
 * The trade-off: if a recipe's ingredients are reordered in WordPress, a check can land on a
 * different row. Acceptable for a client-only convenience feature.
 */
export function ingredientKey(sectionIndex: number, itemIndex: number): string {
  return `${sectionIndex}:${itemIndex}`;
}

/** Add a key when absent, remove it when present. Never mutates the input list. */
export function toggleKey(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
}

/**
 * Coerce a persisted blob into a CookState. Non-object input → {}. Each entry must be an
 * array of strings; a malformed value drops the whole slug, and non-string members are
 * filtered out — a corrupt entry must never crash a read.
 */
export function asCookState(v: unknown): CookState {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: CookState = {};
  for (const [slug, value] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    out[slug] = value.filter((k): k is string => typeof k === 'string');
  }
  return out;
}

async function readState(): Promise<CookState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? asCookState(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Checked ingredient keys for one recipe (empty list if none / on read error). */
export async function loadChecked(slug: string): Promise<string[]> {
  const state = await readState();
  return state[slug] ?? [];
}

/** Persist the checked keys for one recipe, leaving other recipes untouched. */
export async function saveChecked(slug: string, keys: string[]): Promise<void> {
  const state = await readState();
  const next: CookState = { ...state, [slug]: keys };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // fire-and-forget: a failed write must not surface to the cooking UI
  }
}

/** Drop all checked keys for one recipe. */
export async function clearChecked(slug: string): Promise<void> {
  const state = await readState();
  if (!(slug in state)) return;
  const next = { ...state };
  delete next[slug];
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // fire-and-forget
  }
}

/**
 * Reader hook: loads a recipe's checked ingredients on mount and persists on every change.
 * `toggle`/`reset` update local state instantly (optimistic) with a best-effort background
 * write, mirroring the favorites pattern. Guards an undefined slug (cold deep-link open).
 */
export function useCheckedIngredients(slug: string | undefined): {
  checkedKeys: string[];
  toggle: (key: string) => void;
  reset: () => void;
} {
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    loadChecked(slug).then((keys) => {
      if (active) setCheckedKeys(keys);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const toggle = useCallback(
    (key: string) => {
      setCheckedKeys((prev) => {
        const next = toggleKey(prev, key);
        if (slug) saveChecked(slug, next);
        return next;
      });
    },
    [slug],
  );

  const reset = useCallback(() => {
    setCheckedKeys([]);
    if (slug) clearChecked(slug);
  }, [slug]);

  return { checkedKeys, toggle, reset };
}
