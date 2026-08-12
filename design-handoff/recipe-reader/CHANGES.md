# Recipe reader — handoff notes for integration

`recipe-sample-revised.html` is the "after" to `recipe-sample.html`'s "before" (both in this
folder — open side by side). Same content, same panel structure — only the ingredient list and
instructions list need a markup change (both called out below). Everything else is styling-only,
and every value below is already RN-safe (flexbox, borders, padding, type — no CSS grid,
gradients, or box-shadow).

## Where to make each change
Per `DESIGN-BRIEF.md`'s map:
- **`mobile/src/app/articles/[slug].tsx`** — `TAGS_STYLES` (h3/h4/p/ul/ol/li) and
  `CLASSES_STYLES['.recipe-section']` for panels 1–5 below. The "Jump to Recipe" button and the
  "The Recipe" signpost JSX/styles are also in this file (6–7 below).
- **`mobile/src/lib/article-html.ts`** — `boxRecipeSections` wraps each `<h3>` section; item 4
  (ingredients) and item 5 (instructions) need small changes here to restructure the ingredient
  `<li>` and instruction `<li>` markup as described.
- **`mobile/src/theme/tokens.ts`** — no new tokens needed; everything below reuses existing tokens
  (`navy`, `taupe`, `white`, `gray`, `blueBright`, `teal`, `orange`).

## 1. Section headers (`.rnrh h3`)
Was: bold 19px navy heading, no rule.
Now: **eyebrow treatment** — 12px, uppercase, letter-spacing 0.06em, weight 700, color
`--blue-bright` (#0099B1), with a `1px solid var(--navy)` bottom rule (`padding-bottom: 10px`).
This is the brand's own documented pattern for h3 rules — just applied consistently. Makes each
panel's identity scannable at a glance from the color/caps alone, not just size.

## 2. Panel (`.recipe-section`)
Padding tightened and made consistent: `18px 18px 20px` (was an uneven `6px 16px 16px`). Fill and
hairline border unchanged (white / `--gray`) — that part of the pattern already works.

## 3. Flavor Notes → two-column grid
Was a plain bulleted list of `label: value`. Now a flexbox two-column grid (`.taste-grid`,
`flex: 0 0 50%` per item) — label as a small teal-blue eyebrow (10px, uppercase, `--blue-bright`),
value as 14px navy below it. A `1px solid var(--gray)` top border appears from the 3rd item on to
separate rows. Pure flexbox — no CSS grid — so it maps directly to RN `flexDirection: row` +
`flexWrap: wrap`.

## 4. Ingredients → aligned two-column rows
**Markup change required:** each `<li>Amount text</li>` becomes
`<div class="ing-row"><span class="ing-amt">Amount</span><span class="ing-item">text</span></div>`.
Amount column is a fixed 58px, right-aligned, bold navy 14px; item text is flex:1, 15px. A hairline
(`1px solid var(--gray)`) separates rows. This is the single biggest legibility win — amounts now
line up vertically instead of running into the ingredient text. `<h4>` sub-headings ("For the
cake") become a smaller uppercase label (`.ing-heading`, 11px, `--fg-tertiary`) so they read as
dividers, not competing headlines.

## 5. Instructions → numbered step badges
**Markup change required:** each `<li><h4>Headline</h4><p>...</p></li>` becomes
`<div class="step"><div class="step-head"><span class="step-num">N</span><h4>Headline</h4></div><p>...</p></div>`.
Badge is a 26px circle, `1px solid var(--navy)`, number centered, navy. Paragraph gets
`padding-left: 36px` so it aligns under the headline text rather than the badge. All RN-safe
(border-radius on a fixed-size View + centered Text).

## 6. CTA button
Was: navy outline, transparent fill. Now: **solid orange fill** (`--orange` #FF9700), white text,
still uppercase + italic + 5px radius. This is the one "important CTA per view" the brand rule
allows for — "Jump to Recipe" is the single action worth making loud on this screen, so it now
carries the brand's reserved accent instead of a neutral outline.

## 7. Signpost ("The Recipe")
Top rule changed from `1px solid var(--gray)` to `2px solid var(--teal)`. Small, sparing use of the
teal accent to mark the exact hand-off point between intro prose and the recipe body — the one
place on the screen where a reader's eye needs a clear "start here."

## Not changed
Header, hero, meta band, title/byline, intro prose — brief said these could be refined but the
panel/list treatments were the main ask, so effort went there. Happy to pass on refinements to the
header/hero too if useful.

## Files in this package
- `recipe-sample.html` — before (current app baseline).
- `recipe-sample-revised.html` — after (this design).
- `DESIGN-BRIEF.md` — original brief: goals, RN constraints, brand tokens, content structure.
- `CHANGES.md` — this file.
