// Generate a single password-recovery link for one email and print it — used to test the
// app's "first login / set password" flow (Flow 3) without configuring SMTP.
//
//   npm run recovery-link -- someone@example.com
//   npm run recovery-link -- someone@example.com http://localhost:8081/set-password
//
// The link points at Supabase's verify endpoint, which redirects to the set-password screen
// with the recovery tokens. Uses the service-role key (STAGING — see CLAUDE.md).

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_DIR = path.resolve(HERE, '..');
dotenv.config({ path: path.join(MIGRATION_DIR, '.env') });

const email = process.argv[2];
const redirectTo = process.argv[3] || 'http://localhost:8081/set-password';
if (!email) {
  console.error('Usage: npm run recovery-link -- <email> [redirectTo]');
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✗ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in migration/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email,
  options: { redirectTo },
});

if (error) {
  console.error(`✗ ${email}: ${error.message}`);
  process.exit(1);
}

console.log(`\n▶ Recovery link for ${email} (redirects to ${redirectTo}):\n`);
console.log(data.properties?.action_link);
console.log('\nOpen it in a browser to drive the set-password screen.');
