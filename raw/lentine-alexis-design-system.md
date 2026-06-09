# Lentine Alexis — Design System

> Extracted directly from the live theme stylesheet at `/wp-content/themes/lentinealexis/style.css`. These are the actual tokens the site ships with, not an approximation.

**Source:** https://lentinealexis.com/
**Stack:** WordPress (custom theme) + WooCommerce + WC Memberships + WC Subscriptions
**Aesthetic:** Editorial / holistic-wellness. Warm off-white background paired with deep midnight navy, accented with teal and warm signal colors (orange/red). Generous line-height, understated corners, italic uppercase labels.

---

## 1. Color Palette

All colors are defined as CSS custom properties on `:root`. Use the semantic tokens in new work; the raw palette is exposed below for reference.

### Raw palette

| Token | Hex | Notes |
|---|---|---|
| `--color-blue` | `#000033` | Near-black midnight navy. **Primary brand color.** Used for body text, header, footer, buttons. |
| `--color-gray` | `#E7E7E7` | Hairline borders on inputs, chips, dividers. |
| `--color-taupe` | `#f4f0ec` | Warm off-white. **Default page background.** |
| `--color-white` | `#ffffff` | Pure white. Button text, overlay text on hero images. |
| `--color-blue-bright` | `#0099B1` | Default link color. |
| `--color-blue-light` | `#3FBECC` | Hover state, nav hover, highlight accent. |
| `--color-red` | `#EF2107` | Error / destructive. |
| `--color-orange` | `#FF9700` | Attention / important CTA (`--button-important`). |
| `--color-green` | `#26A709` | Success. |
| `--color-red-dark` | `#BC4D48` | Muted red (likely sale/promo secondary). |

### Semantic tokens (use these in new code)

```css
--color-highlight:        var(--color-blue-light);   /* #3FBECC */
--site-text-color:        var(--color-blue);         /* #000033 */
--site-overlay-color:     var(--color-blue);         /* #000033 */
--site-header-color:      var(--color-blue);         /* #000033 */
--site-footer-color:      var(--color-blue);         /* #000033 */
--site-background-color:  var(--color-taupe);        /* #f4f0ec */
--site-nav-hover-color:   var(--color-blue-light);   /* #3FBECC */
--button-color:           var(--color-blue);         /* #000033 */
--button-hover:           var(--color-blue-light);   /* #3FBECC */
--button-important:       var(--color-orange);       /* #FF9700 */
```

### Usage rules of thumb

- **Backgrounds:** `--color-taupe` everywhere by default. Never pure white except inside form inputs.
- **Text:** `--color-blue` (#000033) on taupe. Never pure black.
- **Links:** `--color-blue-bright` at rest, `--color-blue-light` on hover. Hero/image-overlay links flip to white.
- **Selections:** Text selection is styled to `--color-taupe` background with `--color-blue` text.

---

## 2. Typography

### Font family

```css
--font-sans: "Galano Classic", sans-serif;
```

**Galano Classic** is the only typeface on the site, self-hosted from `/wp-content/themes/lentinealexis/assets/fonts/galano/`. Four weights/styles are loaded with `font-display: swap`:

- Regular (400)
- Italic (400)
- Bold (700)
- Bold Italic (700)

> **Note:** Galano Classic is a commercial typeface from ReType. If rebuilding in a new environment, you'll need to either (a) self-host the existing licensed files, (b) purchase a new license, or (c) substitute with a similar humanist geometric sans — closest free alternatives are **Mulish**, **Nunito Sans**, or **Work Sans**. Muli/Mulish is the closest public-domain match in character width and x-height.

### Base settings

```css
body {
  font-family: var(--font-sans);
  font-weight: normal;
  font-size: 1rem;       /* 16px */
  color: var(--site-text-color);
}
--site-line-height: 1.8;  /* applied to paragraphs */
```

### Heading scale (desktop)

All headings are `font-weight: normal` by default — weight is not used to signal hierarchy, size is.

| Element | Size | Notes |
|---|---|---|
| `h1` | `3.2rem` (51.2px) | Base. Special contexts go larger. |
| `h1` in hero (base) | `3.5rem` (56px) | |
| `h1` in hero (tablet/desktop ≤1025px) | `7rem` (112px) | Oversized editorial display. |
| `h1` (largest variant) | `8rem` (128px) | `letter-spacing: -0.15rem` — tight, magazine-style. |
| `h2` | `2.7rem` (43.2px) | Section headings. |
| `h2` (secondary) | `2.1rem` (33.6px) | |
| `h3` | `2rem` (32px) | Often styled with `border-bottom: 1px solid var(--site-text-color)` + `padding-bottom: .5rem` as a rule/underline treatment. |
| `h3` (hero/image overlay variant) | `2.75rem` (44px) | White text on image. |
| `h4` | `1.35rem` (21.6px) | Base. |
| `h4` (uppercase variant) | `1.5rem` (24px) | `text-transform: uppercase` — card titles. |
| `h5` | `1.1rem` (17.6px) | Base. |
| `h5` (eyebrow variant) | `0.7rem` (11.2px) | `text-transform: uppercase; letter-spacing: 0.05rem` — **the signature small-caps label style.** |
| `h6` | Inherits | |

### Responsive breakpoints

Only two breakpoints are defined:

```css
@media (max-width: 1025px) { /* tablet */ }
@media (max-width: 800px)  { /* mobile */ }
```

At `≤1025px` hero `h1` drops back to `2.7rem`. Plan for further mobile reductions on anything above `2rem`.

### Paragraphs

```css
p {
  line-height: var(--site-line-height);  /* 1.8 */
}
```

### Italic usage

Italic is used intentionally as a **voice** marker — italic uppercase small text on buttons, italic in editorial copy. Don't use bold to emphasize; use italic (matches the existing voice).

---

## 3. Spacing & Layout

### Spacing tokens

```css
--site-padding:    3%;          /* horizontal page padding */
--site-grid-gap:   2rem;        /* default grid/flex gap */
--site-line-height: 1.8;
```

### Container

```css
.content-wrap {
  max-width: 80rem;   /* 1280px */
  width: 100%;
  position: relative;
  z-index: 2;
}
```

### Layout structure

- `body` uses `display: flex; flex-wrap: wrap; margin: 0`.
- `.hero` spans `flex: 100%` with `min-height: 20rem` (sometimes `22rem`).
- Horizontal padding is percentage-based (`3%`) rather than fixed — the site breathes with the viewport.

### Heading rhythm

```css
h1, h2, h3 {
  margin: 0;
}
/* First heading after running content gets air */
p + h1, p + h2, p + h3,
ul + h1, ul + h2, ul + h3 {
  margin-top: 2rem;
}
```

So: no top margin by default, but **2rem of air** when a heading follows prose or a list. Replicate this pattern for consistent vertical rhythm.

---

## 4. Borders & Radii

```css
--site-border-radius:   0;       /* sharp corners on most UI */
--button-border-radius: 0.3rem;  /* subtle softening on buttons only */
```

**Rule:** Sharp corners everywhere except buttons. Inputs, cards, images, and containers stay at `0`. This is a deliberate editorial choice — don't round things "to be friendly."

Default hairline: `1px solid var(--color-gray)` (#E7E7E7).

---

## 5. Header / Navigation

```css
--site-header-height:         81px;    /* desktop */
--site-header-mobile-height:  84px;    /* mobile */
--site-adminbar-height:       32px;    /* WP admin bar offset */
--site-adminbar-mobile-height: 46px;
```

- Header background: `--color-blue` (#000033)
- Nav hover: `--color-blue-light` (#3FBECC)
- Logo is a white logomark on the dark header.

---

## 6. Buttons

### Primary button (filled)

```css
.button, button {
  background: var(--button-color);           /* #000033 */
  border: 2px solid var(--button-color);
  color: var(--color-white);
  display: inline-block;
  padding: 0.75rem 1.25rem 0.65rem;          /* note: 0.10rem less on bottom */
  margin-right: 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.8rem;                         /* 12.8px — small */
  font-style: italic;
  font-weight: normal;
  letter-spacing: 0.01rem;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  border-radius: 0.3rem;
  cursor: pointer;
  transition: all 333ms ease-in-out;
}

.button:hover, button:hover {
  background: var(--button-hover);           /* #3FBECC */
  border-color: var(--button-hover);
  color: var(--color-white);
}
```

### Button personality

- **Small, italic, uppercase.** This is the distinctive signature. Don't use large chunky buttons.
- `font-size: 0.8rem` — keep buttons compact.
- Asymmetric padding (`.75 / 1.25 / .65`) compensates optically for the uppercase x-height.
- Transition: `all 333ms ease-in-out`. (Note the repeating 3s — likely intentional and matches the site's general transition timing.)

### Secondary / outline button

```css
button {
  border-color: var(--button-color);
  background: rgba(255, 255, 255, 0);
  color: var(--button-color);
}
```

### Important / attention CTA

```css
background: var(--button-important);  /* #FF9700 orange */
```

Reserve orange for one CTA per view.

---

## 7. Form Inputs

```css
input[type=text],
input[type=email],
input[type=tel],
input[type=password],
textarea {
  font-size: 16px;                          /* prevents iOS zoom */
  font-family: var(--font-sans);
  font-weight: normal;
  margin: 0;
  padding: 12px;
  background: #fff;
  color: var(--site-text-color);
  border: 1px solid var(--color-gray);      /* #E7E7E7 */
  border-radius: 0;                         /* sharp */
}
```

Inputs are the one place the site uses **white backgrounds** — they contrast against the taupe page.

---

## 8. Transitions & Motion

```css
transition: all 333ms ease-in-out;
```

Used on buttons and hover states throughout. Standardize on **333ms ease-in-out** for interactive elements.

---

## 9. Imagery & Hero Treatment

- Hero sections with background images get a `--color-blue` overlay (`--site-overlay-color`) for text contrast.
- Text on image-backed heroes flips to `--color-white`.
- Post previews with image backgrounds use `color: var(--color-white)` and transition to `var(--color-blue)` on hover (inverting on reveal — a recognizable motif).

---

## 10. Complete `:root` reference

Copy-pasteable starter for any new page/component:

```css
:root {
  /* Palette */
  --color-blue: #000033;
  --color-gray: #E7E7E7;
  --color-taupe: #f4f0ec;
  --color-white: white;
  --color-blue-bright: #0099B1;
  --color-blue-light: #3FBECC;
  --color-red: #EF2107;
  --color-orange: #FF9700;
  --color-green: #26A709;
  --color-red-dark: #BC4D48;
  --color-highlight: var(--color-blue-light);

  /* Typography */
  --font-sans: "Galano Classic", sans-serif;

  /* Layout */
  --site-header-height: 81px;
  --site-header-mobile-height: 84px;
  --site-adminbar-height: 32px;
  --site-adminbar-mobile-height: 46px;
  --site-padding: 3%;
  --site-line-height: 1.8;
  --site-border-radius: 0;
  --site-grid-gap: 2rem;

  /* Semantic */
  --site-text-color: var(--color-blue);
  --site-overlay-color: var(--color-blue);
  --site-header-color: var(--color-blue);
  --site-footer-color: var(--color-blue);
  --site-background-color: var(--color-taupe);
  --site-nav-hover-color: var(--color-blue-light);

  /* Buttons */
  --button-color: var(--color-blue);
  --button-hover: var(--color-blue-light);
  --button-important: var(--color-orange);
  --button-border-radius: 0.3rem;
}

body {
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--site-text-color);
  background: var(--site-background-color);
}

p { line-height: var(--site-line-height); }

h1, h2, h3, h4, h5, h6 { margin: 0; font-weight: normal; }
h1 { font-size: 3.2rem; }
h2 { font-size: 2.7rem; }
h3 { font-size: 2rem; }
h4 { font-size: 1.35rem; }
h5 { font-size: 1.1rem; }

/* Signature eyebrow */
.eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
  font-family: var(--font-sans);
}

p + h1, p + h2, p + h3,
ul + h1, ul + h2, ul + h3 { margin-top: 2rem; }
```

---

## 11. Design DNA / When in doubt

If building something new that should feel native to this brand:

1. **Warm, not cold.** Taupe (`#f4f0ec`) background, never true white page.
2. **Navy, not black.** Text is `#000033`, not `#000000`. It matters.
3. **Sharp corners.** `border-radius: 0` on everything except buttons (`0.3rem`).
4. **Small italic uppercase CTAs.** Buttons are quiet, not loud.
5. **Size for hierarchy, not weight.** Headings stay at `font-weight: normal` — use scale.
6. **Generous line-height (1.8).** Copy breathes.
7. **Teal for interaction.** `#3FBECC` for hover, highlight, accents.
8. **One hot color at a time.** Orange (`#FF9700`) reserved for the single most important action.
9. **Editorial-scale heroes.** `h1` at 7–8rem is on-brand, not excessive.
10. **Eyebrow labels everywhere.** Tiny uppercase letter-spaced text (0.7rem / 0.05rem tracking) is the signature small-text move.
