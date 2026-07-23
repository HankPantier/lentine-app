#!/usr/bin/env sh
# Vercel web build for the Expo app.
#
# Expo's static export loads EXPO_PUBLIC_* from .env files (via @expo/env), not
# from the ambient build environment. Vercel injects the project env vars into
# this shell, so we materialize a .env from them right before exporting. The
# values live only in the Vercel project + this ephemeral build — never in git.
#
# The [diag] line prints only lengths / key NAMES (never values) to help debug
# whether Vercel is actually injecting the vars. Safe to leave in.

echo "[diag] URL_len=${#EXPO_PUBLIC_SUPABASE_URL} KEY_len=${#EXPO_PUBLIC_SUPABASE_ANON_KEY} expo_public_count=$(env | grep -c '^EXPO_PUBLIC_') supabase_keys=[$(env | grep -io '^[A-Za-z0-9_]*SUPABASE[A-Za-z0-9_]*' | tr '\n' ',')]"

echo "EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY" >> .env

npx expo export --platform web
