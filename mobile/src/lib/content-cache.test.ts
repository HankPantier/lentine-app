import { cached, clearContentCache, type DiskStore } from './content-cache';

/** In-memory AsyncStorage stand-in. */
function fakeDisk(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
  } satisfies DiskStore & { store: Map<string, string> };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('cached', () => {
  let nowSpy: jest.SpyInstance<number, []>;
  let now = 1_000_000;

  beforeEach(() => {
    now = 1_000_000;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    clearContentCache();
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('returns the fetched value and serves it from memory within the TTL', async () => {
    const fetcher = jest.fn().mockResolvedValue(['a']);
    expect(await cached('k', 1000, fetcher)).toEqual(['a']);
    expect(await cached('k', 1000, fetcher)).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL expires', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(['old']).mockResolvedValueOnce(['new']);
    expect(await cached('k', 1000, fetcher)).toEqual(['old']);
    now += 1001;
    expect(await cached('k', 1000, fetcher)).toEqual(['new']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('never caches a failure — the next call tries again', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(['ok']);
    await expect(cached('k', 1000, fetcher)).rejects.toThrow('boom');
    expect(await cached('k', 1000, fetcher)).toEqual(['ok']);
  });

  it('falls back to an expired value when the refresh fails', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(['stale']).mockRejectedValueOnce(new Error('down'));
    await cached('k', 1000, fetcher);
    now += 5000;
    expect(await cached('k', 1000, fetcher)).toEqual(['stale']);
  });

  it('hydrates from disk on a cold start and revalidates in the background', async () => {
    const disk = fakeDisk({ feed: JSON.stringify(['from-disk']) });
    const fetcher = jest.fn().mockResolvedValue(['fresh']);
    expect(await cached('k', 1000, fetcher, { persistKey: 'feed', disk })).toEqual(['from-disk']);
    await flush(); // let the background refresh land
    expect(fetcher).toHaveBeenCalledTimes(1);
    // The refreshed value is what the next caller sees.
    expect(await cached('k', 1000, fetcher, { persistKey: 'feed', disk })).toEqual(['fresh']);
    expect(disk.store.get('feed')).toBe(JSON.stringify(['fresh']));
  });

  it('persists successful values under the persist key', async () => {
    const disk = fakeDisk();
    await cached('k', 1000, async () => ['v'], { persistKey: 'feed', disk });
    await flush();
    expect(disk.store.get('feed')).toBe(JSON.stringify(['v']));
  });

  it('ignores a corrupt persisted copy and fetches live', async () => {
    const disk = fakeDisk({ feed: '{not json' });
    expect(await cached('k', 1000, async () => ['live'], { persistKey: 'feed', disk })).toEqual(['live']);
  });

  it('clearContentCache forces a refetch', async () => {
    const fetcher = jest.fn().mockResolvedValue(['v']);
    await cached('k', 1000, fetcher);
    clearContentCache();
    await cached('k', 1000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
