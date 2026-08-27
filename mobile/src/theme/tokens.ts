/**
 * Lentine Alexis design tokens.
 * Ported from the brand design system (raw/lentine-alexis-design-system.md) and the
 * design spec at docs/Lentine Alexis App/styles/tokens.css. Single source of truth for
 * colors, fonts, spacing, and radii across iOS / Android / Web.
 */

export const colors = {
  blue: '#000033', // primary navy — body text, headers, primary buttons
  gray: '#E7E7E7', // hairline borders
  taupe: '#f4f0ec', // default page background
  white: '#ffffff',
  blueBright: '#0099B1', // links at rest
  blueLight: '#3FBECC', // hover / highlight accent (teal)
  red: '#EF2107',
  orange: '#FF9700', // important CTA — one per view
  green: '#26A709',
  redDark: '#BC4D48',
} as const;

/** Per-dosha accent colors (element-led), from the prototype. */
export const doshaColors = {
  vata: '#3FBECC', // air + space
  pitta: '#FF9700', // fire + water
  kapha: '#26A709', // earth + water
} as const;

/** Foreground text colors at varying emphasis (navy on light backgrounds). */
export const fg = {
  primary: colors.blue,
  secondary: 'rgba(0,0,51,0.72)',
  tertiary: 'rgba(0,0,51,0.50)',
  faint: 'rgba(0,0,51,0.28)',
  onDarkPrimary: '#ffffff',
  onDarkSecondary: 'rgba(255,255,255,0.72)',
} as const;

/**
 * Font families. Mulish stands in for the licensed Galano Classic (it is the prototype's
 * own first declared fallback). Italic is used as the brand's voice marker — bold is
 * rendered as italic-regular per the design system, so we map "strong" to italic.
 */
export const fonts = {
  regular: 'Mulish_400Regular',
  italic: 'Mulish_400Regular_Italic',
  semibold: 'Mulish_600SemiBold',
  semiboldItalic: 'Mulish_600SemiBold_Italic',
  bold: 'Mulish_700Bold',
  boldItalic: 'Mulish_700Bold_Italic',
} as const;

/** Spacing scale in px (≈0.25rem increments at a 16px base). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Vertical rhythm — the app's "room to breathe" system. Codifies the generous editorial
 * spacing the brand calls for (≈2rem section rhythm, airy heros) in one place so it can be
 * tuned globally. Prefer these over ad-hoc literals for section gaps, card interiors, hero
 * padding, and the gap between a section label and its content.
 */
export const rhythm = {
  screenX: 24, // horizontal screen gutter
  section: 28, // gap between major content sections — the primary breathing-room lever
  card: 20, // interior padding of content cards
  label: 10, // eyebrow / section heading → its content
  heroTop: 32, // hero top padding, below the header
  heroBottom: 36, // hero bottom padding
} as const;

export const radii = {
  /** Sharp corners on the hairline info-cards — deliberate editorial choice. */
  sharp: 0,
  /** ~0.3rem softening on buttons only. */
  button: 5,
  /** Softened corners for imagery & photographic hero cards (the "hybrid" premium radius). */
  media: 12,
  pill: 999,
} as const;

/**
 * Subtle card elevation. The brand is otherwise flat/editorial; this whisper of a
 * navy-tinted shadow lifts content surfaces off the taupe for a premium, layered feel.
 * RN maps shadow* → boxShadow on web and uses `elevation` on Android.
 */
export const elevation = {
  card: {
    shadowColor: colors.blue,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
} as const;

export const lineHeight = {
  body: 1.6,
  loose: 1.8,
} as const;

export type DoshaKey = keyof typeof doshaColors;
