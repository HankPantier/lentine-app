#!/usr/bin/env sh
# Vercel web build for the Expo app.
#
# Expo's static export loads EXPO_PUBLIC_* from .env files (via @expo/env), not
# from the ambient build environment. Vercel injects the project env vars into
# this shell, so we materialize a .env from them right before exporting. The
# values live only in the Vercel project + this ephemeral build — never in git.

echo "EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY" >> .env

npx expo export --platform web
