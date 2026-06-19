export type DoshaKey = 'vata' | 'pitta' | 'kapha';

/** A single answer option in a quiz question; `d` is the dosha it scores toward. */
export interface QuizOption {
  t: string;
  d: DoshaKey;
}

export interface QuizQuestion {
  cat: string;
  q: string;
  a: QuizOption[];
}

/** Per-dosha result content shown on the result screen. */
export interface DoshaInfo {
  name: string;
  /** Stable numeric code: vata=1, pitta=2, kapha=3 (matches the prototype). */
  code: number;
  elements: string;
  accent: string;
  governs: string;
  blurb: string;
  balanced: string[];
  imbalanced: string[];
  care: string;
}

export type Tally = Record<DoshaKey, number>;

/** An answer slot per question; null until the user picks an option. */
export type Answer = DoshaKey | null;
