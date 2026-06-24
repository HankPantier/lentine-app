import type { DoshaKey } from '@/quiz/types';

/**
 * Placeholder, dosha-personalized content for the /today landing screen.
 *
 * This is the single seam where real content will later plug in: today these entries are
 * hand-written samples, but the shape (a typed record keyed by dosha) is what a future
 * WordPress/CMS feed will populate. Keep the structure stable so swapping the source is a
 * data change, not a screen rewrite.
 */
export interface ContentItem {
  title: string;
  meta: string;
}

export interface DoshaContent {
  /** One-line framing for the day, in the member's dosha voice. */
  focus: string;
  ritual: ContentItem;
  recipe: ContentItem;
}

export const DOSHA_CONTENT: Record<DoshaKey, DoshaContent> = {
  vata: {
    focus: 'Warmth and rhythm settle Vata — slow the morning down and stay grounded.',
    ritual: { title: 'Warm oil self-massage', meta: '8 min · grounding' },
    recipe: { title: 'Golden spiced oatmeal', meta: 'Warm · nourishing · easy' },
  },
  pitta: {
    focus: 'Cool the fire — make a little room to be unproductive and let the day breathe.',
    ritual: { title: 'Cooling breath by a window', meta: '5 min · soothing' },
    recipe: { title: 'Cucumber-mint cooler bowl', meta: 'Fresh · cooling · light' },
  },
  kapha: {
    focus: 'Lightness and movement lift Kapha — bring a little novelty into the morning.',
    ritual: { title: 'Brisk morning walk', meta: '15 min · energizing' },
    recipe: { title: 'Ginger lentil soup', meta: 'Spiced · light · warming' },
  },
};
