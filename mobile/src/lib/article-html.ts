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
