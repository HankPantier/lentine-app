// Load stage: read migration/artifacts/subscribers.json and upsert into Supabase
// (auth users + profiles + subscriptions). Idempotent — safe to re-run with a newer dump.
//
//   npm run load            # DRY RUN (default): reports intended changes, writes nothing
//   npm run load -- --apply # actually create auth users + upsert profiles/subscriptions
//   npm run load -- --apply --limit=5   # apply to the first 5 only (smoke test)
//   npm run load -- --send-reset        # (after --apply) generate recovery links → artifacts
//
// Writes use the service-role key (bypasses RLS). Use a STAGING project first (CLAUDE.md).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_DIR = path.resolve(HERE, '..');
const ARTIFACTS_DIR = path.join(MIGRATION_DIR, 'artifacts');

dotenv.config({ path: path.join(MIGRATION_DIR, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SEND_RESET = args.includes('--send-reset');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const fileArg = args.find((a) => a.startsWith('--file='));
const SUBSCRIBERS_FILE = fileArg ? path.resolve(fileArg.split('=')[1]) : path.join(ARTIFACTS_DIR, 'subscribers.json');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✗ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in migration/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Page through every existing auth user → Map(email → id). */
async function loadAuthUsers() {
  const map = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return map;
}

async function loadTierMap() {
  const { data, error } = await supabase.from('subscription_tiers').select('id, slug');
  if (error) throw new Error(`read tiers: ${error.message}`);
  if (!data.length) throw new Error('subscription_tiers is empty — apply supabase/seed.sql first.');
  return new Map(data.map((t) => [t.slug, t.id]));
}

async function main() {
  const all = JSON.parse(await readFile(SUBSCRIBERS_FILE, 'utf8'));
  const subscribers = all.slice(0, LIMIT);
  console.log(`▶ source:   ${SUBSCRIBERS_FILE}`);
  console.log(`▶ records:  ${subscribers.length}${LIMIT < Infinity ? ` (limited from ${all.length})` : ''}`);
  console.log(`▶ mode:     ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`);

  const tierMap = await loadTierMap();
  const authMap = await loadAuthUsers();
  console.log(`▶ existing auth users: ${authMap.size}`);

  const skippedNoTier = subscribers.filter((s) => !s.tier);
  const usable = subscribers.filter((s) => s.tier);
  const toCreate = usable.filter((s) => !authMap.has(s.email));
  const toReuse = usable.filter((s) => authMap.has(s.email));

  if (!APPLY) {
    console.log('\n=== DRY RUN PLAN ===');
    console.log(`  auth users to create: ${toCreate.length}`);
    console.log(`  auth users reused:    ${toReuse.length}`);
    console.log(`  subscriptions to upsert: ${usable.length}`);
    console.log(`  skipped (no tier resolved): ${skippedNoTier.length}`);
    console.log('\n  sample payload (first usable record):');
    if (usable[0]) {
      const s = usable[0];
      console.log(JSON.stringify({
        profile: { email: s.email, display_name: s.display_name, wp_user_id: s.wp_user_id },
        subscription: {
          tier: s.tier, status: s.status, billing_interval: s.billing_interval,
          current_period_end: s.current_period_end, stripe_customer_id: s.stripe_customer_id,
          wp_subscription_id: s.wp_subscription_id,
        },
      }, null, 2));
    }
    console.log('\n(DRY RUN — nothing written. Re-run with --apply to write.)');
    return;
  }

  // --- APPLY -----------------------------------------------------------------
  let created = 0, upserted = 0, failed = 0;
  for (const [i, s] of usable.entries()) {
    try {
      let userId = authMap.get(s.email);
      if (!userId) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: s.email,
          email_confirm: true,
          user_metadata: { wp_user_id: s.wp_user_id, stripe_customer_id: s.stripe_customer_id },
        });
        if (error) throw new Error(`createUser: ${error.message}`);
        userId = data.user.id;
        authMap.set(s.email, userId);
        created++;
      }

      const { error: pErr } = await supabase.from('profiles').upsert(
        { id: userId, email: s.email, display_name: s.display_name, wp_user_id: s.wp_user_id },
        { onConflict: 'id' },
      );
      if (pErr) throw new Error(`profiles upsert: ${pErr.message}`);

      const { error: sErr } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          tier_id: tierMap.get(s.tier),
          status: s.status,
          billing_interval: s.billing_interval,
          current_period_start: s.current_period_start,
          current_period_end: s.current_period_end,
          stripe_customer_id: s.stripe_customer_id,
          stripe_subscription_id: s.stripe_subscription_id,
          wp_subscription_id: s.wp_subscription_id,
        },
        { onConflict: 'wp_subscription_id' },
      );
      if (sErr) throw new Error(`subscriptions upsert: ${sErr.message}`);
      upserted++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${s.email} (wp_user_id ${s.wp_user_id}): ${err.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`  …${i + 1}/${usable.length}`);
  }

  console.log('\n=== APPLY RESULT ===');
  console.log(`  auth users created: ${created}`);
  console.log(`  subscriptions upserted: ${upserted}`);
  console.log(`  failed: ${failed}`);
  console.log(`  skipped (no tier): ${skippedNoTier.length}`);

  // Post-write verification: row counts straight from Supabase.
  const profiles = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const subs = await supabase.from('subscriptions').select('*', { count: 'exact', head: true });
  console.log(`  profiles in DB: ${profiles.count}`);
  console.log(`  subscriptions in DB: ${subs.count}`);

  if (SEND_RESET) {
    console.log('\n▶ generating recovery links (not emailing) → artifacts/reset-links.json');
    const links = [];
    for (const s of usable) {
      const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email: s.email });
      if (error) { console.error(`  ✗ link ${s.email}: ${error.message}`); continue; }
      links.push({ email: s.email, action_link: data.properties?.action_link });
    }
    await writeFile(path.join(ARTIFACTS_DIR, 'reset-links.json'), JSON.stringify(links, null, 2));
    console.log(`  wrote ${links.length} links. Send these via your email provider deliberately.`);
  }
}

main().catch((err) => {
  console.error('\n✗ load failed:', err.message);
  process.exit(1);
});
