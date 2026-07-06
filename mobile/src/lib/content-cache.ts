import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A tiny TTL cache for the content fetchers — deliberately not react-query; three fetch
 * functions don't justify a dependency. Values live in module memory (cleared on sign-in/out
 * because entitlement changes what bodies come back). The home feed additionally persists to
 * AsyncStorage so a cold start paints instantly (stale-while-revalidate: the persisted copy is
 * served once while a background refresh updates the cache for the next visit).
 *
 * Failures are never cached; when a refresh fails, an expired value beats an error screen.
 */

type Entry = { at: number; value: unknown };

/** Storage seam — AsyncStorage in the app, an in-memory fake in tests. */
export interface DiskStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface CachedOptions {
  /** Also persist successful values under this AsyncStorage key. List summaries only — never paid bodies. */
  persistKey?: string;
  /** Storage override for tests. */
  disk?: DiskStore;
}

const mem = new Map<string, Entry>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts: CachedOptions = {},
): Promise<T> {
  const disk = opts.disk ?? AsyncStorage;
  const hit = mem.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  // Cold start with a persisted copy: paint it now, refresh in the background for next time.
  if (!hit && opts.persistKey) {
    const raw = await disk.getItem(opts.persistKey).catch(() => null);
    if (raw != null) {
      try {
        const value = JSON.parse(raw) as T;
        mem.set(key, { at: 0, value }); // stored as already-stale — the next visit revalidates
        refresh(key, fetcher, opts, disk).catch(() => {});
        return value;
      } catch {
        // corrupt persisted copy — fall through to a live fetch
      }
    }
  }

  try {
    return await refresh(key, fetcher, opts, disk);
  } catch (err) {
    if (hit) return hit.value as T; // expired-but-present beats an error state
    throw err;
  }
}

async function refresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedOptions,
  disk: DiskStore,
): Promise<T> {
  const value = await fetcher();
  mem.set(key, { at: Date.now(), value });
  if (opts.persistKey) disk.setItem(opts.persistKey, JSON.stringify(value)).catch(() => {});
  return value;
}

/** Drop every cached value — call on sign-in/out, when entitlement changes. */
export function clearContentCache(): void {
  mem.clear();
}
