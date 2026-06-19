import type { QuizQuestion } from './types';

/**
 * The 12-question dosha intake. Ported verbatim from prototypes/dosha-quiz.html.
 * Measures prakriti (natural constitution), not vikriti (current state).
 * One option per dosha per question.
 */
export const QUESTIONS: QuizQuestion[] = [
  {
    cat: 'Body',
    q: 'When you think about your natural build, which fits best?',
    a: [
      { t: 'Lean and light — I find it hard to gain weight or muscle.', d: 'vata' },
      { t: 'Medium and athletic — I build and lose fairly easily.', d: 'pitta' },
      { t: 'Solid and sturdy — I gain weight easily and hold it.', d: 'kapha' },
    ],
  },
  {
    cat: 'Skin',
    q: 'My skin tends to be…',
    a: [
      { t: 'Dry, thin, and cool — it chaps in winter.', d: 'vata' },
      { t: 'Warm and sensitive — quick to flush, freckle, or break out.', d: 'pitta' },
      { t: 'Thick, smooth, and a little oily — slow to wrinkle.', d: 'kapha' },
    ],
  },
  {
    cat: 'Hair',
    q: 'My hair is most often…',
    a: [
      { t: 'Dry, fine, and prone to frizz or split ends.', d: 'vata' },
      { t: 'Fine and soft — early to gray, thin, or run reddish.', d: 'pitta' },
      { t: 'Thick, heavy, and lustrous — sometimes wavy or oily.', d: 'kapha' },
    ],
  },
  {
    cat: 'Appetite',
    q: 'My appetite and digestion are…',
    a: [
      { t: 'Irregular — I forget to eat, then feel gassy or bloated.', d: 'vata' },
      { t: 'Strong and sharp — I get irritable if I skip a meal.', d: 'pitta' },
      { t: 'Steady but slow — I can skip meals easily and feel heavy after eating.', d: 'kapha' },
    ],
  },
  {
    cat: 'Energy',
    q: 'My energy through the day looks like…',
    a: [
      { t: 'Bursts of activity, then I run out and crash.', d: 'vata' },
      { t: 'Intense and driven — I push hard toward a goal.', d: 'pitta' },
      { t: 'Steady and enduring — slow to start, hard to stop.', d: 'kapha' },
    ],
  },
  {
    cat: 'Sleep',
    q: 'My sleep is usually…',
    a: [
      { t: 'Light and easily interrupted — my mind keeps going.', d: 'vata' },
      { t: 'Moderate — I sleep fine but wake warm or alert.', d: 'pitta' },
      { t: 'Deep and long — I love sleep and am slow to wake.', d: 'kapha' },
    ],
  },
  {
    cat: 'Mind',
    q: 'The way I learn and remember is…',
    a: [
      { t: 'Quick to learn, quick to forget.', d: 'vata' },
      { t: 'Sharp and precise — I grasp things and retain them.', d: 'pitta' },
      { t: 'Slower to learn, but I rarely forget.', d: 'kapha' },
    ],
  },
  {
    cat: 'Under Pressure',
    q: "When I'm stressed, I tend to become…",
    a: [
      { t: 'Anxious, worried, and scattered.', d: 'vata' },
      { t: 'Irritable, intense, and critical.', d: 'pitta' },
      { t: "Quiet and withdrawn — I'd rather avoid it.", d: 'kapha' },
    ],
  },
  {
    cat: 'Weather',
    q: 'The weather that throws me off most is…',
    a: [
      { t: 'Cold, dry, and windy.', d: 'vata' },
      { t: 'Hot and humid.', d: 'pitta' },
      { t: 'Cold, damp, and gray.', d: 'kapha' },
    ],
  },
  {
    cat: 'Pace',
    q: 'My natural pace — how I move, walk, and talk — is…',
    a: [
      { t: 'Quick and lively — fast walker, fast talker.', d: 'vata' },
      { t: 'Purposeful and determined.', d: 'pitta' },
      { t: 'Slow, graceful, and unhurried.', d: 'kapha' },
    ],
  },
  {
    cat: 'Spending',
    q: "With money, I'm most likely to…",
    a: [
      { t: 'Spend on a whim — it comes and goes.', d: 'vata' },
      { t: 'Spend deliberately on quality and things that perform.', d: 'pitta' },
      { t: 'Save steadily and hold onto what I have.', d: 'kapha' },
    ],
  },
  {
    cat: 'At My Best',
    q: 'When I feel most like myself, others would call me…',
    a: [
      { t: 'Creative, enthusiastic, and full of ideas.', d: 'vata' },
      { t: 'Focused, confident, and warm.', d: 'pitta' },
      { t: 'Calm, steady, and deeply loyal.', d: 'kapha' },
    ],
  },
];
