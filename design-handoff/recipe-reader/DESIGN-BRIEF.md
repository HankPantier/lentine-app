# Design brief — Lentine Alexis recipe reader

**Goal:** make the in-app **recipe reading experience** nicer — more scannable, more beautiful,
more on-brand — while staying inside the app's real constraints. Return *visual direction with
specific values* (colors, spacing, type sizes, layout ideas); a human will translate it into the
React Native codebase afterward. **This is not a drop-in code task.**

## Start here
Open **`recipe-sample.html`** (in this folder) in a browser. It's a faithful render of the
*current* recipe reader — the "before". It uses the real brand tokens and the real content
structure. Everything below the "THE RECIPE" divider (Recipe Notes → Flavor Notes → Ingredients →
Instructions) is the primary target; the header/hero/intro can be refined too.

## Hard constraints (please design within these)
1. **It's a React Native app (iOS + Android + web via Expo), not a website.** The recipe body is
   WordPress-generated HTML rendered by `react-native-render-html`. Styling is applied through
   **JS style objects**, not CSS. Only a **subset of CSS translates**:
   - ✅ available: `backgroundColor`, `color`, `borderWidth/Color/Radius`, `padding*`, `margin*`,
     `fontSize`, `fontWeight`/family, `lineHeight`, `letterSpacing`, `textTransform`,
     `fontStyle` (italic), flexbox, `textAlign`.
   - ⚠️ avoid / won't translate cleanly: CSS grid, `::before/::after` pseudo-elements, background
     images/gradients, `box-shadow` (RN shadows are limited & platform-specific — use sparingly),
     `:hover`/transitions, floats, `calc()`, sticky positioning.
   - So: **express ideas with fills, borders, spacing, dividers, and type** — not shadows/gradients.
2. **Brand system** (full doc: `../../raw/lentine-alexis-design-system.md`; tokens:
   `../../mobile/src/theme/tokens.ts`):
   - Navy `#000033` (text/headings) · Taupe `#f4f0ec` (page bg) · White `#ffffff` (cards) ·
     Gray `#E7E7E7` (hairlines) · Teal `#3FBECC` + Bright-blue `#0099B1` (accents/links) ·
     Orange `#FF9700` (one important CTA per view, used rarely).
   - **Sharp corners everywhere except buttons** (buttons = 5px radius).
   - Font is **Mulish** (a stand-in for the licensed Galano Classic). *Italic* is the brand's
     voice marker; CTAs are **italic + UPPERCASE**.
   - Editorial, calm, generous whitespace. The page is taupe, so anything that needs to stand out
     is a **white card with a gray hairline** (that's the established pattern).
3. **Content structure is generated and fixed-ish.** The body is assembled from WordPress/ACF as:
   `intro prose` → `<h3>Recipe Notes</h3>` → `<h3>Flavor Notes</h3>` + a 6-item taste list
   (Sweet/Salty/Sour/Bitter/Astringent/Pungent, each `label: value`) → `<h3>Ingredients</h3>` with
   optional `<h4>` sub-headings + `<ul>` → `<h3>Instructions</h3>` as an `<ol>` of steps, each an
   optional `<h4>` headline + paragraph. We wrap each `<h3>` section in a panel. You may restyle
   these elements freely; if a great idea needs a *structural* change (e.g., a two-column
   ingredient row with aligned amounts), call it out — we can adjust the HTML assembly, it's just
   a bit more work.

## Especially worth exploring
- The **panel treatment** (fill, border, spacing, section-header style) — this is the main lever.
- **Ingredients** layout — e.g., aligned amounts, a lighter checkable feel, tighter rhythm.
- **Instructions** — numbered step styling (step badges? clearer headline hierarchy?).
- The **Flavor Notes / taste** row — currently a plain bold-label list; could be a tidy at-a-glance grid or chips.
- The **"The Recipe" signpost**, section headers (eyebrow vs heading), and overall spacing rhythm.
- Tasteful, sparing use of the **teal / orange** accents.

## Please avoid
- Anything depending on imagery we don't have, heavy drop-shadows, gradients, or web-only layout.
- Rounding corners globally (stay sharp; buttons are the only 5px exception).
- More than one orange element per screen.

## Deliverable that's easiest to act on
Annotated mockups (revised `recipe-sample.html` is perfect) **plus concrete values** — hex colors,
px spacing/sizes, weights — and a couple sentences of rationale per change. With that, translating
into the app is quick and faithful.

## For the humans bringing it back (not needed by the designer)
Where each thing lives:
- `mobile/src/app/articles/[slug].tsx` — reader: `BASE_STYLE`, `TAGS_STYLES` (h3/h4/p/ul/ol/li),
  `CLASSES_STYLES` (`.recipe-section` panel), the "The Recipe" signpost JSX, hero/meta/title/byline.
- `mobile/src/lib/article-html.ts` — `boxRecipeSections` (wraps each `<h3>` section) and
  `splitAtIngredients` (intro ↔ recipe split). Change here if the panel structure needs to change.
- `mobile/src/theme/tokens.ts` — the tokens. `raw/lentine-alexis-design-system.md` — full system.
