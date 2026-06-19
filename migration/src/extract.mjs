// Extract stage: load a WordPress dump into an ephemeral MySQL 8 container, run the
// subscriber query, and emit migration/artifacts/{subscribers.json,subscribers.csv,summary.json}.
//
// Repeatable: `npm run extract` (uses newest raw/*.sql) — or `npm run extract -- <dump.sql>`.
// Idempotent output: same dump → same artifacts. Nothing here writes to Supabase.
//
// Flags:
//   --statuses=wc-active,wc-on-hold   override the active-status set (default these two)
//   --keep                            leave the MySQL container running for debugging
//   --no-teardown                     alias for --keep

import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir, readdir, stat, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { tierFromProductName, higherTier, statusFromWcStatus, billingIntervalFromPeriod } from './lib/tiers.mjs';
import { wcDateToIso } from './lib/dates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(MIGRATION_DIR, '..');
const RAW_DIR = path.join(REPO_ROOT, 'raw');
const ARTIFACTS_DIR = path.join(MIGRATION_DIR, 'artifacts');
const SQL_FILE = path.join(MIGRATION_DIR, 'sql', 'extract-subscribers.sql');

dotenv.config({ path: path.join(MIGRATION_DIR, '.env') });

const env = {
  rootPw: process.env.MYSQL_ROOT_PASSWORD || 'rootpw',
  db: process.env.MYSQL_DATABASE || 'wp',
  port: Number(process.env.MYSQL_HOST_PORT || 33061),
};

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const KEEP = flags.has('--keep') || flags.has('--no-teardown');
const statusesArg = args.find((a) => a.startsWith('--statuses='));
const ACTIVE_STATUSES = statusesArg
  ? statusesArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  : ['wc-active', 'wc-on-hold'];

// --- small helpers -----------------------------------------------------------

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { cwd: MIGRATION_DIR, stdio: 'inherit', ...opts });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${cmdArgs.join(' ')} exited ${code}`)),
    );
  });
}

function pipeFileToCmd(filePath, cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { cwd: MIGRATION_DIR, stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`import exited ${code}`))));
    createReadStream(filePath).pipe(child.stdin);
  });
}

// mysqldumps of a single DB often include `CREATE DATABASE … ; USE \`name\`;`, so the tables
// land in that DB — not env.db. Detect the name from the dump header and connect to it.
async function detectDbName(dumpPath) {
  const fh = await open(dumpPath, 'r');
  try {
    const buf = Buffer.alloc(1 << 18); // 256 KB is plenty for the header
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const head = buf.toString('utf8', 0, bytesRead);
    const m = head.match(/USE `([^`]+)`/) || head.match(/CREATE DATABASE[^`]*`([^`]+)`/i);
    return m ? m[1] : null;
  } finally {
    await fh.close();
  }
}

async function newestDump() {
  const entries = await readdir(RAW_DIR);
  const sqls = entries.filter((e) => e.toLowerCase().endsWith('.sql'));
  if (!sqls.length) throw new Error(`No .sql dump found in ${RAW_DIR}`);
  const withTimes = await Promise.all(
    sqls.map(async (f) => ({ f, m: (await stat(path.join(RAW_DIR, f))).mtimeMs })),
  );
  withTimes.sort((a, b) => b.m - a.m);
  return path.join(RAW_DIR, withTimes[0].f);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

// --- main --------------------------------------------------------------------

async function main() {
  const dump = positional[0] ? path.resolve(positional[0]) : await newestDump();
  console.log(`▶ dump:     ${dump}`);
  console.log(`▶ statuses: ${ACTIVE_STATUSES.join(', ')}`);

  // Fail early with a clear message if Docker isn't available.
  try {
    await run('docker', ['compose', 'version'], { stdio: 'ignore' });
  } catch {
    throw new Error('Docker (with the compose plugin) is required but not found on PATH. Install Docker Desktop and start it, then re-run.');
  }

  let conn;
  try {
    console.log('▶ starting MySQL container…');
    await run('docker', ['compose', 'up', '-d', '--wait']);

    console.log('▶ importing dump (this can take a minute)…');
    await pipeFileToCmd(dump, 'docker', [
      'compose', 'exec', '-T', '-e', `MYSQL_PWD=${env.rootPw}`, 'db',
      'mysql', '--binary-mode', '-uroot', env.db,
    ]);

    const dbName = (await detectDbName(dump)) || env.db;
    console.log(`▶ querying database: ${dbName}`);
    conn = await mysql.createConnection({
      host: '127.0.0.1', port: env.port, user: 'root', password: env.rootPw, database: dbName,
    });

    // Status histogram — informs whether the active set lands on ~523.
    const [hist] = await conn.query(
      `SELECT post_status, COUNT(*) AS c FROM wp_posts
       WHERE post_type = 'shop_subscription' GROUP BY post_status ORDER BY c DESC`,
    );
    const statusHistogram = Object.fromEntries(hist.map((r) => [r.post_status, Number(r.c)]));
    console.log('▶ shop_subscription status histogram:', statusHistogram);

    // Run the extract query with the chosen status set substituted in.
    const sqlTemplate = await readFile(SQL_FILE, 'utf8');
    const list = ACTIVE_STATUSES.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
    const sql = sqlTemplate.replace(/IN \(\/\* @STATUS_LIST@ \*\/[^)]*\)/, `IN (${list})`);
    const [rows] = await conn.query(sql);
    console.log(`▶ query returned ${rows.length} subscription rows`);

    // Shape rows → subscriber records.
    const needsReviewNoTier = [];
    const multiInterval = [];
    const shaped = rows.map((r) => {
      const tier = tierFromProductName(r.product_name);
      if (!tier) needsReviewNoTier.push({ wp_subscription_id: r.wp_subscription_id, product_name: r.product_name });
      const intervalN = Number(r.billing_interval_n || 1);
      if (intervalN > 1) multiInterval.push({ wp_subscription_id: r.wp_subscription_id, n: intervalN, period: r.billing_period });
      const card = r.payment_token
        ? { token: r.payment_token, last4: r.card_last4 || null, exp_month: r.card_exp_month || null, exp_year: r.card_exp_year || null }
        : null;
      return {
        wp_user_id: Number(r.wp_user_id),
        email: String(r.email || '').trim().toLowerCase(),
        display_name: (r.display_name || r.user_login || String(r.email || '').split('@')[0] || '').trim(),
        user_registered: wcDateToIso(r.user_registered),
        wp_subscription_id: Number(r.wp_subscription_id),
        wc_status: r.wc_status,
        tier,
        status: statusFromWcStatus(r.wc_status),
        billing_interval: tier ? billingIntervalFromPeriod(r.billing_period) : null,
        billing_interval_n: intervalN,
        current_period_start: wcDateToIso(r.schedule_start),
        current_period_end: wcDateToIso(r.schedule_next_payment) || wcDateToIso(r.schedule_end),
        stripe_customer_id: r.stripe_customer_id || null,
        stripe_subscription_id: r.stripe_subscription_id || null,
        card,
      };
    });

    // Collapse to one subscription per user (highest tier wins; tie-break latest period end).
    const byUser = new Map();
    for (const s of shaped) {
      const existing = byUser.get(s.wp_user_id);
      if (!existing) { byUser.set(s.wp_user_id, s); continue; }
      const winnerTier = higherTier(existing.tier, s.tier);
      let winner;
      if (existing.tier === s.tier) {
        winner = (s.current_period_end || '') > (existing.current_period_end || '') ? s : existing;
      } else {
        winner = winnerTier === s.tier ? s : existing;
      }
      byUser.set(s.wp_user_id, winner);
    }
    const subscribers = [...byUser.values()].sort((a, b) => a.wp_user_id - b.wp_user_id);
    const collapsedDualTier = shaped.length - subscribers.length;

    // Duplicate-email check (auth requires unique emails).
    const emailCounts = new Map();
    for (const s of subscribers) emailCounts.set(s.email, (emailCounts.get(s.email) || 0) + 1);
    const duplicateEmails = [...emailCounts.entries()].filter(([, c]) => c > 1).map(([e]) => e);

    const summary = {
      generated_from: path.basename(dump),
      statuses: ACTIVE_STATUSES,
      status_histogram: statusHistogram,
      rows_before_collapse: shaped.length,
      total_subscribers: subscribers.length,
      collapsed_dual_tier: collapsedDualTier,
      tier_breakdown: {
        recipe: subscribers.filter((s) => s.tier === 'recipe').length,
        back_to_forward: subscribers.filter((s) => s.tier === 'back_to_forward').length,
        unresolved: subscribers.filter((s) => !s.tier).length,
      },
      interval_breakdown: {
        month: subscribers.filter((s) => s.billing_interval === 'month').length,
        year: subscribers.filter((s) => s.billing_interval === 'year').length,
      },
      missing_stripe_customer_id: subscribers.filter((s) => !s.stripe_customer_id).length,
      missing_saved_card: subscribers.filter((s) => !s.card).length,
      needs_review_no_tier: needsReviewNoTier,
      duplicate_emails: duplicateEmails,
      multi_interval: multiInterval,
    };

    await mkdir(ARTIFACTS_DIR, { recursive: true });
    await writeFile(path.join(ARTIFACTS_DIR, 'subscribers.json'), JSON.stringify(subscribers, null, 2));
    await writeFile(path.join(ARTIFACTS_DIR, 'subscribers.csv'), toCsv(subscribers.map((s) => ({
      ...s, card_last4: s.card?.last4 ?? '', card_exp: s.card ? `${s.card.exp_month}/${s.card.exp_year}` : '', card: undefined,
    }))));
    await writeFile(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

    console.log('\n=== SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log(`\n✓ wrote artifacts to ${ARTIFACTS_DIR}`);
  } finally {
    if (conn) await conn.end();
    if (!KEEP) {
      console.log('▶ tearing down container…');
      await run('docker', ['compose', 'down', '-v']).catch(() => {});
    } else {
      console.log('▶ --keep set: container left running.');
    }
  }
}

main().catch((err) => {
  console.error('\n✗ extract failed:', err.message);
  process.exit(1);
});
