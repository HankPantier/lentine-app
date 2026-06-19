import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tierFromProductName,
  higherTier,
  statusFromWcStatus,
  billingIntervalFromPeriod,
} from './tiers.mjs';
import { wcDateToIso } from './dates.mjs';

test('tierFromProductName maps observed product names', () => {
  assert.equal(tierFromProductName('Recipe Club Subscription (Monthly)'), 'recipe');
  assert.equal(tierFromProductName('Recipe Club Subscription - Annual'), 'recipe');
  assert.equal(tierFromProductName('Recipe Library Subscription (Annual)'), 'recipe');
  assert.equal(tierFromProductName('Back to Forward Membership - Monthly'), 'back_to_forward');
  assert.equal(tierFromProductName('  back to forward membership - annual '), 'back_to_forward');
});

test('tierFromProductName returns null for unknown/empty', () => {
  assert.equal(tierFromProductName(''), null);
  assert.equal(tierFromProductName(null), null);
  assert.equal(tierFromProductName('Mystery Box'), null);
});

test('higherTier picks the higher rank', () => {
  assert.equal(higherTier('recipe', 'back_to_forward'), 'back_to_forward');
  assert.equal(higherTier('back_to_forward', 'recipe'), 'back_to_forward');
  assert.equal(higherTier('recipe', 'recipe'), 'recipe');
  assert.equal(higherTier(null, 'recipe'), 'recipe');
  assert.equal(higherTier('recipe', null), 'recipe');
});

test('statusFromWcStatus maps the importable statuses', () => {
  assert.equal(statusFromWcStatus('wc-active'), 'active');
  assert.equal(statusFromWcStatus('wc-pending-cancel'), 'active');
  assert.equal(statusFromWcStatus('wc-on-hold'), 'past_due');
  assert.equal(statusFromWcStatus('wc-cancelled'), 'cancelled');
  assert.equal(statusFromWcStatus('wc-expired'), 'cancelled');
});

test('statusFromWcStatus throws on the unexpected', () => {
  assert.throws(() => statusFromWcStatus('wc-pending'), /Unmapped/);
});

test('billingIntervalFromPeriod maps month/year and rejects others', () => {
  assert.equal(billingIntervalFromPeriod('month'), 'month');
  assert.equal(billingIntervalFromPeriod('year'), 'year');
  assert.throws(() => billingIntervalFromPeriod('week'), /Unsupported/);
});

test('wcDateToIso normalises UTC datetime strings', () => {
  assert.equal(wcDateToIso('2026-11-03 00:00:00'), '2026-11-03T00:00:00.000Z');
  assert.equal(wcDateToIso('2026-11-03 14:30:15'), '2026-11-03T14:30:15.000Z');
});

test('wcDateToIso returns null for zero/empty/garbage', () => {
  assert.equal(wcDateToIso('0000-00-00 00:00:00'), null);
  assert.equal(wcDateToIso(''), null);
  assert.equal(wcDateToIso(null), null);
  assert.equal(wcDateToIso('not-a-date'), null);
});

test('wcDateToIso passes through Date objects (mysql2 DATETIME)', () => {
  assert.equal(wcDateToIso(new Date('2026-11-03T00:00:00Z')), '2026-11-03T00:00:00.000Z');
});
