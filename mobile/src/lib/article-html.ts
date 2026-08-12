/**
 * Presentation tidy-up for WordPress article/recipe HTML before it hits RenderHtml.
 * WP's block editor exports recipe steps as `<li><h4>…</h4><p>…</p></li>` — the block
 * elements' top margins push the text below the list marker, leaving "1." floating on its
 * own line — and drops literal `<p>&nbsp;</p>` spacers that render as giant gaps. Pure
 * string transforms (no DOM), unit-tested; inline styles win over tagsStyles in RNRH, so
 * the injected margin-top:0 reliably pins the first block of a list item to its marker.
 */

/** Paragraphs containing only whitespace/&nbsp;/<br> — WP spacer artifacts. */
const EMPTY_P = /<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*/gi;

/** The first block element (h4/p) directly opening a list item. */
const LI_OPENING_BLOCK = /(<li[^>]*>\s*)<(h4|p)(?=[\s>])/gi;

export function tidyArticleHtml(html: string): string {
  return html
    .replace(EMPTY_P, '')
    .replace(LI_OPENING_BLOCK, (_m, liOpen: string, tag: string) => `${liOpen}<${tag} style="margin-top:0"`);
}

/** Start of a recipe section heading — `<h3` followed by a space or `>` (not `<h3x`). */
const H3_SECTION_OPEN = /<h3(?=[\s>])/gi;

/**
 * Wrap each `<h3>` section of an assembled recipe body (the heading plus everything up to the
 * next `<h3>` or the end) in `<div class="recipe-section">`, so the reader can shade each one
 * as a panel via RenderHtml's classesStyles — replicating the site's scannable, boxed recipe
 * layout. Prose before the first `<h3>` (the blog-post intro) is left unwrapped. Bodies with no
 * `<h3>` (plain articles) pass through untouched. Pure string transform, like tidyArticleHtml.
 */
export function boxRecipeSections(html: string): string {
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  H3_SECTION_OPEN.lastIndex = 0;
  while ((m = H3_SECTION_OPEN.exec(html)) !== null) starts.push(m.index);
  if (starts.length === 0) return html;
  let out = html.slice(0, starts[0]); // intro prose, unboxed
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : html.length;
    out += `<div class="recipe-section">${html.slice(starts[i], end)}</div>`;
  }
  return out;
}

/** The assembled recipe body's Ingredients section heading (see la_assemble_recipe_body). */
const INGREDIENTS_H3 = /<h3[^>]*>\s*Ingredients\s*<\/h3>/i;

/**
 * Split a recipe body at its `<h3>Ingredients</h3>` heading so the reader can render the
 * intro and the recipe as separate blocks (the "Jump to Recipe" scroll target sits between
 * them). The heading always opens the recipe part. Returns null when the heading is absent
 * (posts, partial recipes) — callers render the body unchanged.
 */
export function splitAtIngredients(html: string): { intro: string; recipe: string } | null {
  const match = INGREDIENTS_H3.exec(html);
  if (!match) return null;
  return { intro: html.slice(0, match.index), recipe: html.slice(match.index) };
}
