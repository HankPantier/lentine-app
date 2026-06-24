import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Cross-platform Supabase client (iOS + Android + web). See the "Cross-platform first"
// guardrail in CLAUDE.md.
//   - storage: AsyncStorage works on native AND web (localStorage shim), so one config
//     persists the session everywhere.
//   - detectSessionInUrl: only web parses tokens from the URL fragment (e.g. a recovery
//     link landing on http://localhost:8081/#access_token=...). Native receives the link
//     via expo-linking and calls setSession itself (see app/_layout.tsx).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'in mobile/.env (see mobile/.env.example).',
  );
}

// Expo web prerenders routes in Node (app.json web.output: "static"), where there is no
// window/localStorage — so AsyncStorage's web shim would crash on construct. During that
// server pass we hand Supabase a no-op store and skip URL detection; the real browser pass
// (and native) use AsyncStorage. `typeof window` distinguishes SSR from the browser.
const isServerWeb = Platform.OS === 'web' && typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServerWeb ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServerWeb,
    persistSession: !isServerWeb,
    detectSessionInUrl: Platform.OS === 'web' && !isServerWeb,
  },
});

// Keep the access token fresh while the app is foregrounded (native only — the browser
// tab manages its own lifecycle). Safe no-op pattern straight from the Supabase RN guide.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    if (status === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
