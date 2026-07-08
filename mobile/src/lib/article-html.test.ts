import { tidyArticleHtml } from './article-html';

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
