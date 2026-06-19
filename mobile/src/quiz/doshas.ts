import { doshaColors } from '@/theme/tokens';
import type { DoshaInfo, DoshaKey } from './types';

/**
 * Per-dosha result content. Ported verbatim from prototypes/dosha-quiz.html.
 * `accent` resolves to the concrete brand color (the prototype used CSS vars).
 */
export const DOSHA: Record<DoshaKey, DoshaInfo> = {
  vata: {
    name: 'Vata',
    code: 1,
    elements: 'Air + Space',
    accent: doshaColors.vata,
    governs: 'Movement + change',
    blurb:
      'Vata is the force of movement and change — the breath, the heartbeat, the flow of thought and digestion, and every shift from one moment to the next. When it leads your constitution, you tend to move through the world quickly and creatively.',
    balanced: [
      'Creative and imaginative',
      'Energetic and lively',
      'Quick-thinking and adaptable',
      'Enthusiastic — first to try something new',
    ],
    imbalanced: [
      'Dry skin, hair, or digestion',
      'Restlessness and difficulty settling',
      'Anxiety or scattered focus',
      'Irregular appetite, sleep, and routine',
    ],
    care: 'Vata craves warmth, moisture, and rhythm. Warm cooked meals, healthy oils, gentle routine, and early nights bring it back to center.',
  },
  pitta: {
    name: 'Pitta',
    code: 2,
    elements: 'Fire + Water',
    accent: doshaColors.pitta,
    governs: 'Transformation',
    blurb:
      'Pitta is the fire that transforms — turning food into nourishment and what you see into ideas and emotions. When it leads, you bring focus, drive, and a sharp, discerning mind — and, at your best, a real capacity for play and ease.',
    balanced: [
      'Focused and goal-oriented',
      'Sharp, clear thinker',
      'Confident and courageous',
      'Warm and naturally a leader',
      'Playful and spacious when you make room to chill out',
    ],
    imbalanced: [
      'Heat — inflammation, acidity, or rashes',
      'Irritability, impatience, or a critical edge',
      'Burnout from pushing too hard',
      'Trouble cooling down, in body or mind',
    ],
    care: 'Pitta thrives on cooling, ease, and play. Fresh foods and time in nature cool the fire — but so does spaciousness: stepping away from the to-do list, making time to be unproductive, and generally chilling out keep it steady rather than scorching.',
  },
  kapha: {
    name: 'Kapha',
    code: 3,
    elements: 'Earth + Water',
    accent: doshaColors.kapha,
    governs: 'Cushioning + structure',
    blurb:
      'Kapha is the cushion and the structure — the steady ground beneath you, like a deep river or a stand of trees. When it leads, you bring calm, strength, and a loyal, loving steadiness.',
    balanced: [
      'Calm, grounded, and patient',
      'Strong and enduring',
      'Loving, loyal, and supportive',
      'Steady under pressure',
    ],
    imbalanced: [
      'Heaviness, lethargy, or sluggishness',
      'Congestion or holding onto fluid',
      'Resistance to change',
      "Slow digestion and weight that won't budge",
    ],
    care: 'Kapha needs stimulation and lightness. Movement, warm and spiced foods, and a little novelty keep it from settling into heaviness.',
  },
};
