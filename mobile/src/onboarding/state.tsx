import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import { reconcileAuth } from '@/lib/auth-reconcile';
import type { NotificationPrefs } from '@/lib/notification-prefs';
import { supabase } from '@/lib/supabase';
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
  /** Cancelled in the billing portal but active until currentPeriodEnd ("Cancels <date>").
   *  Optional: states persisted before this field exist without it (read as false). */
  cancelAtPeriodEnd?: boolean;
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
  /** Notification category preferences; null until the member sets them (onboarding or account). */
  notificationPrefs: NotificationPrefs | null;
}

const STORAGE_KEY = 'la_onb_state_v1';

/** Sentinel: the session lookup failed/timed out — skip reconciliation, don't sign out. */
const FAIL_OPEN = Symbol('session-unknown');

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
    notificationPrefs: null,
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
    // Load persisted state and the REAL Supabase session together; the session is the
    // single source of truth for auth, so a stale persisted userId (sign-out elsewhere,
    // expired token) is reconciled away BEFORE hydrated flips — every screen that gates
    // on `hydrated` then sees session-truth state. Fail OPEN on session errors/timeouts:
    // a flaky network must never sign a real member out (the SIGNED_OUT auth event and
    // the next cold start cover genuinely dead sessions).
    const sessionUserId: Promise<string | null | typeof FAIL_OPEN> = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(FAIL_OPEN), 3000);
      supabase.auth.getSession().then(
        ({ data }) => {
          clearTimeout(timer);
          resolve(data.session?.user.id ?? null);
        },
        () => {
          clearTimeout(timer);
          resolve(FAIL_OPEN);
        },
      );
    });
    Promise.all([AsyncStorage.getItem(STORAGE_KEY).catch(() => null), sessionUserId])
      .then(([raw, sessionUser]) => {
        if (!active) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<OnboardingState>;
            const answers =
              Array.isArray(parsed.answers) && parsed.answers.length === QUESTIONS.length
                ? (parsed.answers as Answer[])
                : emptyAnswers();
            const restored = { ...initialState(), ...parsed, answers };
            const patch =
              sessionUser === FAIL_OPEN
                ? null
                : reconcileAuth({ userId: restored.userId }, sessionUser);
            dispatch({ type: 'HYDRATE', payload: { ...restored, ...(patch ?? {}) } });
          } catch {
            // ignore corrupt storage; fall back to defaults
          }
        }
        setHydrated(true);
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

  // Stable identities (dispatch never changes) so consumers can safely list these in
  // effect deps — e.g. the root AuthListener subscribes once, not on every state change.
  const update = useCallback(
    (patch: Partial<OnboardingState>) => dispatch({ type: 'UPDATE', payload: patch }),
    [],
  );
  const setAnswer = useCallback(
    (index: number, val: DoshaKey) => dispatch({ type: 'SET_ANSWER', index, value: val }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value: OnboardingContextValue = { state, hydrated, update, setAnswer, reset };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
