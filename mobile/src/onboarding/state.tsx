import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import { QUESTIONS } from '@/quiz/questions';
import type { Answer, DoshaKey, Tally } from '@/quiz/types';

export type Tier = 'recipe' | 'back_to_forward';
export type Interval = 'month' | 'year';
export type Mode = 'new' | 'migrating';

/** A returning member's existing subscription, read from Supabase after sign-in. */
export interface Subscription {
  tier: Tier;
  interval: Interval;
  status: string;
  currentPeriodEnd: string | null;
}

export interface OnboardingState {
  mode: Mode | null;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Supabase auth user id once signed in / signed up; null while unauthenticated. */
  userId: string | null;
  dosha: DoshaKey | null;
  /** Per-dosha tally behind the result (vata/pitta/kapha counts); null until the quiz is done. */
  doshaScores: Tally | null;
  /** ISO timestamp the quiz was last completed; null until then. */
  doshaTakenAt: string | null;
  tier: Tier | null;
  interval: Interval | null;
  /** Real subscription pulled from Supabase for a returning member (null for new users). */
  subscription: Subscription | null;
  /** One answer slot per quiz question; null until answered. */
  answers: Answer[];
  quizDone: boolean;
  completed: boolean;
  /** Epoch ms a "take the dosha quiz" home nudge was last dismissed; null = never. */
  quizNudgeDismissedAt: number | null;
}

const STORAGE_KEY = 'la_onb_state_v1';

function emptyAnswers(): Answer[] {
  return Array<Answer>(QUESTIONS.length).fill(null);
}

function initialState(): OnboardingState {
  return {
    mode: null,
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    userId: null,
    dosha: null,
    doshaScores: null,
    doshaTakenAt: null,
    tier: null,
    interval: null,
    subscription: null,
    answers: emptyAnswers(),
    quizDone: false,
    completed: false,
    quizNudgeDismissedAt: null,
  };
}

type Action =
  | { type: 'HYDRATE'; payload: OnboardingState }
  | { type: 'UPDATE'; payload: Partial<OnboardingState> }
  | { type: 'SET_ANSWER'; index: number; value: DoshaKey }
  | { type: 'RESET' };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'UPDATE':
      return { ...state, ...action.payload };
    case 'SET_ANSWER': {
      const answers = state.answers.slice();
      answers[action.index] = action.value;
      return { ...state, answers };
    }
    case 'RESET':
      return initialState();
  }
}

interface OnboardingContextValue {
  state: OnboardingState;
  /** True once persisted state has loaded — gate navigation on this. */
  hydrated: boolean;
  update: (patch: Partial<OnboardingState>) => void;
  setAnswer: (index: number, value: DoshaKey) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Holds the whole onboarding state (mirrors the design's lifted-state pattern) and
 * persists it to AsyncStorage — which is localStorage on web. Survives reloads.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active && raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<OnboardingState>;
            const answers =
              Array.isArray(parsed.answers) && parsed.answers.length === QUESTIONS.length
                ? (parsed.answers as Answer[])
                : emptyAnswers();
            dispatch({ type: 'HYDRATE', payload: { ...initialState(), ...parsed, answers } });
          } catch {
            // ignore corrupt storage; fall back to defaults
          }
        }
        if (active) setHydrated(true);
      })
      .catch(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state, hydrated]);

  const value: OnboardingContextValue = {
    state,
    hydrated,
    update: (patch) => dispatch({ type: 'UPDATE', payload: patch }),
    setAnswer: (index, val) => dispatch({ type: 'SET_ANSWER', index, value: val }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
