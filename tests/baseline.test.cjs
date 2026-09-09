const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const { confirmSubscription, isConfirmedSubscription } = loadTs('lib/subscriptionSync.ts');
const { collectPages } = loadTs('lib/pagination.ts');

test('activation requires exact user, entitlement state and success', () => {
  const good = { success: true, user_id: 'alice', is_pro: true };
  assert.equal(isConfirmedSubscription(good, 'alice', true), true);
  for (const data of [null, {}, { ...good, success: false }, { ...good, user_id: 'bob' }, { ...good, is_pro: 'true' }, { ...good, is_pro: false }]) {
    assert.equal(isConfirmedSubscription(data, 'alice', true), false);
  }
  assert.equal(isConfirmedSubscription({ ...good, is_pro: false }, 'alice', false), true);
});

test('activation retries delayed server entitlement and stops after confirmation', async () => {
  let calls = 0;
  const delays = [];
  const confirmed = await confirmSubscription({
    userId: 'alice', expectedIsPro: true, isCurrent: () => true,
    sync: async () => ({ data: { success: true, user_id: 'alice', is_pro: ++calls >= 2 }, error: null }),
    delay: async ms => { delays.push(ms); },
  });
  assert.equal(confirmed, true);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [800]);
});

test('failed activation is bounded and never becomes a success', async () => {
  let calls = 0;
  assert.equal(await confirmSubscription({
    userId: 'alice', expectedIsPro: true, isCurrent: () => true,
    sync: async () => { calls++; return { data: null, error: new Error('offline') }; },
    delay: async () => {},
  }), false);
  assert.equal(calls, 3);
});

test('changing accounts while activation is pending ignores the old response', async () => {
  let current = true;
  assert.equal(await confirmSubscription({
    userId: 'alice', expectedIsPro: true, isCurrent: () => current,
    sync: async () => { current = false; return { data: { success: true, user_id: 'alice', is_pro: true }, error: null }; },
    delay: async () => { assert.fail('Must not retry an old account'); },
  }), false);
});

test('already stale activation never makes a request', async () => {
  assert.equal(await confirmSubscription({
    userId: 'alice', expectedIsPro: true, isCurrent: () => false,
    sync: async () => { assert.fail('Must not request for an old account'); },
  }), false);
});

test('exports include more than the default 1000-row API limit', async () => {
  const all = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const ranges = [];
  const result = await collectPages(async (from, to) => {
    ranges.push([from, to]);
    return { data: all.slice(from, to + 1), error: null };
  });
  assert.deepEqual(result, { data: all, error: null });
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
});

test('pagination rejects partial exports when any page fails', async () => {
  const failure = new Error('read failed');
  const result = await collectPages(async from => from ? { data: null, error: failure } : { data: [1, 2], error: null }, 2);
  assert.equal(result.data, null);
  assert.equal(result.error, failure);
});

test('pagination handles empty results and exact page boundaries', async () => {
  assert.deepEqual(await collectPages(async () => ({ data: [], error: null })), { data: [], error: null });
  let calls = 0;
  assert.deepEqual(await collectPages(async from => { calls++; return { data: from ? [] : [1, 2], error: null }; }, 2), { data: [1, 2], error: null });
  assert.equal(calls, 2);
  await assert.rejects(() => collectPages(async () => ({ data: [], error: null }), 0), /page size/);
});

test('RevenueCat listener removes the same callback using SDK API', () => {
  const calls = [];
  const purchases = {
    addCustomerInfoUpdateListener: callback => { calls.push(['add', callback]); },
    removeCustomerInfoUpdateListener: callback => { calls.push(['remove', callback]); },
  };
  const revenueCat = loadTs('lib/revenueCat.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    'react-native-purchases': { __esModule: true, default: purchases },
  });
  const callback = () => {};
  revenueCat.addCustomerInfoUpdateListener(callback)();
  assert.deepEqual(calls, [['add', callback], ['remove', callback]]);
});

function healthHarness() {
  const values = new Map();
  let meal = { id: 'meal-1', processing_status: 'completed', calories: 100, macros: { protein: 10 }, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' };
  let fail = false;
  const saves = [];
  const { syncMealToHealthKit } = loadTs('lib/health/sync.ts', {
    '@react-native-async-storage/async-storage': { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } },
    '../supabase': { getMealById: async () => ({ data: meal, error: null }) },
    './AppleHealthService': { AppleHealthService: {
      isAvailable: async () => true,
      syncMealToHealth: async payload => { saves.push(payload); if (fail) throw new Error('write denied'); },
    } },
  });
  return { values, saves, sync: syncMealToHealthKit, fail: value => { fail = value; }, update: update => { meal = { ...meal, ...update }; } };
}

test('HealthKit failed write stays retryable and concurrent requests coalesce', async () => {
  const h = healthHarness();
  h.fail(true);
  const first = h.sync('meal-1');
  assert.equal(first, h.sync('meal-1'));
  await first;
  assert.equal(h.values.size, 0);
  h.fail(false);
  await h.sync('meal-1');
  assert.equal(h.saves.length, 2);
  assert.equal(h.saves[0].revision, h.saves[1].revision);
  assert.ok(h.values.has('@mealscanner/health_revision/meal-1'));
  await h.sync('meal-1');
  assert.equal(h.saves.length, 2);
});

test('HealthKit revision changes resync edited meals with the same stable ID', async () => {
  const h = healthHarness();
  await h.sync('meal-1');
  h.update({ updated_at: '2026-09-02T12:00:00Z', calories: 200 });
  await h.sync('meal-1');
  assert.equal(h.saves.length, 2);
  assert.equal(h.saves[0].id, h.saves[1].id);
  assert.ok(h.saves[1].revision > h.saves[0].revision);
  assert.equal(h.saves[1].calories, 200);
});

test('legacy exports are not duplicated and unfinished meals are not exported', async () => {
  const h = healthHarness();
  h.values.set('@mealscanner/synced_meals', JSON.stringify(['meal-1']));
  await h.sync('meal-1');
  assert.equal(h.saves.length, 0);
  h.values.clear();
  h.update({ processing_status: 'processing' });
  await h.sync('meal-1');
  assert.equal(h.saves.length, 0);
});

test('HealthKit native writes attach per-nutrient sync metadata, including zero', async () => {
  const writes = [];
  const { AppleHealthService } = loadTs('lib/health/AppleHealthService.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    '@kingstinct/react-native-healthkit': { isHealthDataAvailable: () => true, saveQuantitySample: async (...args) => { writes.push(args); return { uuid: 'sample' }; } },
  });
  await AppleHealthService.syncMealToHealth({ id: 'meal-1', revision: 100, calories: 200, protein: 0, sodium: 150, timestamp: '2026-09-01T12:00:00Z' });
  assert.equal(writes.length, 3);
  for (const [type, , , , , metadata] of writes) {
    assert.deepEqual(metadata, { HKSyncIdentifier: 'mealscanner:meal-1:' + type, HKSyncVersion: 100 });
  }
  assert.equal(writes.find(row => row[0].endsWith('Sodium'))[1], 'mg');
  assert.equal(writes.find(row => row[0].endsWith('Protein'))[2], 0);
});

test('HealthKit rejects missing samples and partial native failure', async () => {
  for (const saveQuantitySample of [async () => undefined, async () => { throw new Error('denied'); }]) {
    const { AppleHealthService } = loadTs('lib/health/AppleHealthService.ts', {
      'react-native': { Platform: { OS: 'ios' } },
      '@kingstinct/react-native-healthkit': { isHealthDataAvailable: () => true, saveQuantitySample },
    });
    await assert.rejects(() => AppleHealthService.syncMealToHealth({ id: 'meal-1', revision: 100, calories: 200, timestamp: '2026-09-01T12:00:00Z' }), /could not be saved/);
  }
});

test('Zod 4 helpers validate forms and individual fields', () => {
  const { z } = require('zod');
  const { validate, validateField, LoginSchema } = loadTs('lib/validation.ts');
  assert.equal(validate(LoginSchema, { email: 'person@example.com', password: 'password' }).success, true);
  assert.equal(validate(LoginSchema, { email: 'invalid', password: '' }).success, false);
  assert.equal(validateField(z.string().min(2), 'a').valid, false);
  assert.equal(validateField(z.string().min(2), 'abc').valid, true);
});
