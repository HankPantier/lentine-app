import type { Article } from './articles';

/**
 * The feed already knows a tapped article's title/image/excerpt/visibility — screens stash it
 * here on card press so the reader paints a full header instantly instead of spinning on a
 * blank screen while the (slow) article fetch resolves. Memory-only and tiny; cold deep links
 * simply miss and fall back to the loading state.
 */
const previews = new Map<string, Article>();

export function setArticlePreview(article: Article): void {
  previews.set(article.slug, article);
}

export function getArticlePreview(slug: string): Article | undefined {
  return previews.get(slug);
}
