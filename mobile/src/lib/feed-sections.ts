import type { DoshaKey } from '@/quiz/types';
import type { Article } from './articles';
import type { Season } from './season';

/**
 * Partition the feed for the home screen: items tagged with the member's dosha surface in
 * the "For your <Dosha>" section, everything else flows to "More from Lentine". Pure and
 * order-preserving; items without dosha tags (posts, old cached payloads) always land in
 * rest, and a member without a quiz result keeps the whole feed in rest (flat layout).
 */
export function splitByDosha(
  list: Article[],
  dosha: DoshaKey | null,
): { matched: Article[]; rest: Article[] } {
  if (!dosha) {
    return { matched: [], rest: list };
  }
  const matched: Article[] = [];
  const rest: Article[] = [];
  for (const item of list) {
    (item.dosha?.includes(dosha) ? matched : rest).push(item);
  }
  return { matched, rest };
}

/**
 * Stable partition for the season-aware default order: recipes tagged with seasons that
 * exclude the current one sink below everything else. Posts, untagged recipes, and old
 * cached payloads (no `season` field) are never demoted; both partitions keep their
 * relative (newest-first) order.
 */
export function sinkOutOfSeason(list: Article[], season: Season): Article[] {
  const inSeason: Article[] = [];
  const outOfSeason: Article[] = [];
  for (const item of list) {
    (item.season?.length && !item.season.includes(season) ? outOfSeason : inSeason).push(item);
  }
  return [...inSeason, ...outOfSeason];
}
