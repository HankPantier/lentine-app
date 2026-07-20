import { splitAtIngredients, tidyArticleHtml } from './article-html';

describe('tidyArticleHtml', () => {
  it('strips whitespace-only paragraphs (the WP &nbsp; spacer gaps)', () => {
    expect(tidyArticleHtml('<p>Real.</p><p>&nbsp;</p><p> </p><p><br/></p><p>Also real.</p>')).toBe(
      '<p>Real.</p><p>Also real.</p>',
    );
  });

  it('zeroes the top margin of a heading that opens a list item (marker alignment)', () => {
    expect(tidyArticleHtml('<li>\n<h4>Roast the beets</h4><p>x</p></li>')).toContain(
      '<h4 style="margin-top:0">Roast the beets</h4>',
    );
  });

  it('zeroes the top margin of a paragraph that opens a list item', () => {
    const out = tidyArticleHtml('<li data-start="1"><p data-end="2">Preheat oven.</p></li>');
    expect(out).toContain('<p style="margin-top:0" data-end="2">Preheat oven.</p>');
  });

  it('leaves paragraphs and headings outside list items untouched', () => {
    const html = '<h4>Standalone</h4><p>Body text.</p>';
    expect(tidyArticleHtml(html)).toBe(html);
  });

  it('only restyles the FIRST block in a list item, not the later ones', () => {
    const out = tidyArticleHtml('<li><p>first</p><p>second</p></li>');
    expect(out).toContain('<p style="margin-top:0">first</p>');
    expect(out).toContain('<p>second</p>');
  });

  it('passes plain content through unchanged', () => {
    const html = '<p>Just an article body with <strong>bold</strong>.</p>';
    expect(tidyArticleHtml(html)).toBe(html);
  });
});

describe('splitAtIngredients', () => {
  const recipeBody =
    '<p>An intro story.</p><h3>Recipe Notes</h3><p>Notes.</p><h3>Flavor Notes</h3><ul><li>SWEET</li></ul>' +
    '<h3>Ingredients</h3><ul><li>1 cup oats</li></ul><h3>Instructions</h3><ol><li>Cook.</li></ol>';

  it('splits a recipe body at the Ingredients heading, which leads the recipe part', () => {
    const parts = splitAtIngredients(recipeBody);
    expect(parts).not.toBeNull();
    expect(parts?.intro).toBe(
      '<p>An intro story.</p><h3>Recipe Notes</h3><p>Notes.</p><h3>Flavor Notes</h3><ul><li>SWEET</li></ul>',
    );
    expect(parts?.recipe).toBe('<h3>Ingredients</h3><ul><li>1 cup oats</li></ul><h3>Instructions</h3><ol><li>Cook.</li></ol>');
  });

  it('returns null when there is no Ingredients heading (posts, partial recipes)', () => {
    expect(splitAtIngredients('<p>A plain article.</p><h3>Some Section</h3><p>x</p>')).toBeNull();
  });

  it('tolerates attributes and whitespace on/around the heading', () => {
    const parts = splitAtIngredients('<p>intro</p><h3 class="wp-block"> Ingredients </h3><ul><li>x</li></ul>');
    expect(parts?.intro).toBe('<p>intro</p>');
    expect(parts?.recipe).toBe('<h3 class="wp-block"> Ingredients </h3><ul><li>x</li></ul>');
  });

  it('a body starting with the heading yields an empty intro', () => {
    const parts = splitAtIngredients('<h3>Ingredients</h3><ul><li>x</li></ul>');
    expect(parts?.intro).toBe('');
    expect(parts?.recipe).toBe('<h3>Ingredients</h3><ul><li>x</li></ul>');
  });

  it('keeps Recipe Notes / Flavor Notes headings in the intro', () => {
    const parts = splitAtIngredients(recipeBody);
    expect(parts?.intro).toContain('<h3>Recipe Notes</h3>');
    expect(parts?.intro).toContain('<h3>Flavor Notes</h3>');
    expect(parts?.recipe).not.toContain('Recipe Notes');
  });
});
