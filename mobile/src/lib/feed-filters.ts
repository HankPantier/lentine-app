import type { DoshaKey } from '@/quiz/types';
import type { Article } from './articles';

/**
 * What the home feed's chip row can express. "Recent" is the default (`all`, newest-first);
 * "Type" opens content-type + dosha values; "Category" opens the feed's real categories.
 * These are FILTERS (mobile chip pattern), not sorts — order stays newest-first throughout.
 */
export type FeedFilter =
  | { kind: 'all' }
  | { kind: 'type'; value: Article['type'] }
  | { kind: 'dosha'; value: DoshaKey }
  | { kind: 'category'; value: string };

/** Pure, order-preserving filter of the merged posts+recipes feed. */
export function applyFeedFilter(list: Article[], filter: FeedFilter): Article[] {
  switch (filter.kind) {
    case 'all':
      return list;
    case 'type':
      return list.filter((a) => a.type === filter.value);
    case 'dosha':
      // Untagged items (posts, old cached payloads) never match a dosha.
      return list.filter((a) => a.dosha?.includes(filter.value));
    case 'category':
      return list.filter((a) => a.category === filter.value);
  }
}

/** The categories actually present in the feed — unique, alphabetical, nulls skipped. */
export function feedCategories(list: Article[]): string[] {
  const seen = new Set<string>();
  for (const a of list) {
    if (a.category) seen.add(a.category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
