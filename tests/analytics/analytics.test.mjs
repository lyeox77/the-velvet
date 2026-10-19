import test from 'node:test';
import assert from 'node:assert/strict';
import { completedWeeks, daysBetween, localDateKey, parseDay } from '../../src/analytics/periods.ts';
import { activityMetrics } from '../../src/analytics/metrics/activityMetrics.ts';
import { attributeMetrics } from '../../src/analytics/metrics/attributeMetrics.ts';
import { timeMetrics, timeBucket } from '../../src/analytics/metrics/timeMetrics.ts';
import { todoMetrics } from '../../src/analytics/metrics/todoMetrics.ts';
import { wishMetrics } from '../../src/analytics/metrics/wishMetrics.ts';
import { detectTrend } from '../../src/analytics/detectors/trendDetector.ts';
import { detectAnomaly } from '../../src/analytics/detectors/anomalyDetector.ts';
import { detectConsistency } from '../../src/analytics/detectors/consistencyDetector.ts';
import { buildAnalyticsReport } from '../../src/analytics/insightEngine.ts';
import { readAnalyticsDataset } from '../../src/analytics/dataSource.ts';

const p = [{ start: '2026-10-05', end: '2026-10-12' }];
const empty = () => ({ activities: [], attributes: [], todos: [], completions: [], wishes: [] });
const activity = (id, day, extra = {}) => ({ id, userId: 'u', date: new Date(`${day}T18:00:00`),
  description: 'record', method: 'local', pointsAwarded: { knowledge: 1, guts: 0, dexterity: 0, kindness: 0, charm: 0 }, ...extra });
const todo = (id, extra = {}) => ({ id, title: id, attribute: 'knowledge', points: 1,
  frequency: 'single', repeatDaily: true, isActive: true, createdAt: new Date('2026-10-01T12:00:00'), ...extra });
const series = (values, extra = {}) => ({ domain: 'activity', metric: 'activity.recordedDays.weekly',
  unit: 'days', values: values.map((value, i) => ({ period: `W${i}`, value, sampleSize: value ?? 0 })), caveats: [], ...extra });

test('completed weeks cross year boundaries, exclude current week and do not mutate now', () => {
  const now = new Date('2026-01-01T13:00:00');
  const before = now.getTime();
  assert.deepEqual(completedWeeks(now, 2), [
    { start: '2025-12-15', end: '2025-12-22' }, { start: '2025-12-22', end: '2025-12-29' },
  ]);
  assert.equal(now.getTime(), before);
  assert.throws(() => completedWeeks(now, 0), RangeError);
  assert.throws(() => completedWeeks(new Date('bad')), RangeError);
});

test('calendar math and validation work across DST and leap days', () => {
  assert.equal(daysBetween('2026-03-07', '2026-03-10'), 3);
  assert.equal(daysBetween('2026-10-31', '2026-11-03'), 3);
  assert.equal(localDateKey(parseDay('2024-02-29')), '2024-02-29');
  assert.throws(() => parseDay('2026-02-30'), RangeError);
  assert.throws(() => parseDay('2026-2-3'), RangeError);
});

test('personal rhythm excludes system events, backfills, invalid dates, and end boundary', () => {
  const rows = [activity('a', '2026-10-05'), activity('b', '2026-10-05'),
    activity('c', '2026-10-06', { category: 'level_up' }), activity('d', '2026-10-07', { backfilled: true }),
    activity('e', '2026-10-12'), activity('bad', '2026-10-06', { date: new Date('bad') })];
  const metrics = activityMetrics(rows, p);
  assert.equal(metrics[0].values[0].value, 1);
  assert.equal(metrics[1].values[0].value, 2);
});

test('awarded point totals include rewards, preserve zero, and exclude NaN', () => {
  const metrics = attributeMetrics([activity('a', '2026-10-05'),
    activity('b', '2026-10-06', { category: 'level_up', pointsAwarded: { knowledge: 5 } }),
    activity('c', '2026-10-07', { pointsAwarded: { knowledge: NaN } })], p);
  assert.equal(metrics[0].values[0].value, 6);
  assert.equal(metrics[1].values[0].value, 0);
});

test('time buckets use personal records and local hours', () => {
  assert.deepEqual([0, 5, 8, 12, 18, 23].map(timeBucket), ['lateNight', 'dawn', 'morning', 'afternoon', 'evening', 'lateNight']);
  const result = timeMetrics([activity('a', '2026-10-05'), activity('b', '2026-10-05', { backfilled: true }),
    activity('c', '2026-10-05', { category: 'achievement_unlock' })], p);
  assert.equal(result.find(s => s.metric.includes('evening')).values[0].value, 1);
});

test('recurring denominator respects start, weekdays, archive and per-day targets', () => {
  const todos = [todo('a', { frequency: 'count', targetCount: 2, weekdays: [1, 3, 5], startDate: '2026-10-07',
    isActive: false, archivedAt: new Date('2026-10-09T19:00:00') }),
    todo('single', { repeatDaily: false }), todo('long', { isLongTerm: true }), todo('big', { isBigDeal: true }),
    todo('paused', { isActive: false }), todo('future', { startDate: '2026-11-01' })];
  const comps = [{ id: 'c', todoId: 'a', date: '2026-10-07', count: 10 },
    { id: 'd', todoId: 'a', date: '2026-10-09', count: 1 },
    { id: 'e', todoId: 'a', date: '2026-10-08', count: 10 }];
  const estimate = todoMetrics(todos, comps, p)[1];
  assert.equal(estimate.values[0].sampleSize, 4);
  assert.equal(estimate.values[0].value, 0.75);
  assert.equal(estimate.estimated, true);
  assert.deepEqual(detectTrend(estimate, p[0]), []);
});

test('zero expected tasks means missing ratio; bad dates and counts do not contaminate totals', () => {
  const comps = [{ id: 'a', todoId: 'deleted', date: '2026-10-06', count: 3 },
    { id: 'b', todoId: 'x', date: '2026-10-06', count: -1 },
    { id: 'c', todoId: 'x', date: '2026-10-06', count: Infinity },
    { id: 'd', todoId: 'x', date: '2026-02-30', count: 9 }];
  const metrics = todoMetrics([], comps, p);
  assert.equal(metrics[0].values[0].value, 3);
  assert.equal(metrics[1].values[0].value, null);
});

test('wish assessments sort by actual timestamps without fabricating missing progress', () => {
  const wishes = [{ id: 'w', status: 'active', progressPct: 99, progressHistory: [
    { at: '2026-10-08T12:00:00', pct: 40, delta: 10, source: 'manual' },
    { at: '2026-10-07T12:00:00', pct: 30, delta: 10, source: 'ai' },
    { at: '2026-10-09T12:00:00', pct: 101, delta: 61, source: 'manual' },
  ] }, { id: 'child', parentId: 'w' }];
  const before = JSON.stringify(wishes);
  const result = wishMetrics(wishes, [...p, { start: '2026-10-12', end: '2026-10-19' }]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].values.map(v => v.value), [40, null]);
  assert.equal(JSON.stringify(wishes), before);
});

test('trend requires four observed, strictly monotonic weeks and a meaningful change', () => {
  assert.equal(detectTrend(series([6, 5, 4, 3]), p[0]).length, 1);
  for (const values of [[3, 2, 1], [5, null, 3, 2], [4, 4, 4, 4], [6, 5, 6, 3]]) {
    assert.deepEqual(detectTrend(series(values), p[0]), []);
  }
});

test('anomaly handles a zero-variance baseline and ignores small changes', () => {
  assert.equal(detectAnomaly(series([4, 4, 4, 4, 0]), p[0]).length, 1);
  assert.equal(detectAnomaly(series([4, 4, 4, 4, 5]), p[0]).length, 0);
  assert.equal(detectAnomaly(series([0, 0, 0, 0, 0]), p[0]).length, 0);
});

test('consistency does not describe an empty or sparse history as stable', () => {
  assert.equal(detectConsistency(series([5, 4, 5, 4]), p[0]).length, 1);
  assert.equal(detectConsistency(series([0, 0, 0, 0]), p[0]).length, 0);
});

test('engine is deterministic, detached from inputs, and empty data produces no findings', () => {
  const dataset = empty();
  const now = new Date('2026-10-19T12:00:00');
  const report = buildAnalyticsReport(dataset, now);
  assert.deepEqual(report.evidence, []);
  assert.deepEqual(report, buildAnalyticsReport(dataset, now));
  assert.equal(report.periods.at(-1).end, '2026-10-19');
});

test('onboarding zeros are not treated as a historical decline or spike', () => {
  const dataset = empty();
  dataset.activities.push(activity('a', '2026-10-14'));
  assert.deepEqual(buildAnalyticsReport(dataset, new Date('2026-10-19T12:00:00')).evidence, []);
});

test('report contains auditable evidence with stable IDs and detached values', () => {
  const dataset = empty();
  const weeks = completedWeeks(new Date('2026-10-19T12:00:00'), 4);
  dataset.activities.push(activity('old', '2026-09-01'));
  for (let week = 0; week < 4; week++) {
    for (let n = 0; n < 6 - week; n++) {
      const date = parseDay(weeks[week].start); date.setDate(date.getDate() + n);
      dataset.activities.push(activity(`${week}-${n}`, localDateKey(date)));
    }
  }
  const before = JSON.stringify(dataset);
  const report = buildAnalyticsReport(dataset, new Date('2026-10-19T12:00:00'), 4);
  const finding = report.evidence.find(e => e.metric === 'activity.recordedDays.weekly' && e.kind === 'trend');
  assert.ok(finding);
  assert.deepEqual(finding.values.map(v => v.value), [6, 5, 4, 3]);
  assert.equal(finding.sampleSize, 18);
  assert.equal(new Set(report.evidence.map(e => e.id)).size, report.evidence.length);
  finding.values[0].value = 0;
  assert.equal(report.series[0].values[0].value, 6);
  assert.equal(JSON.stringify(dataset), before);
});

test('data adapter reads the five source tables and propagates failures', async () => {
  const calls = [];
  const reader = Object.fromEntries(['activities', 'attributes', 'todos', 'todoCompletions', 'wishes']
    .map(name => [name, { toArray: async () => { calls.push(name); return []; } }]));
  assert.deepEqual(await readAnalyticsDataset(reader), empty());
  assert.equal(calls.length, 5);
  reader.wishes.toArray = async () => { throw new Error('read failed'); };
  await assert.rejects(readAnalyticsDataset(reader), /read failed/);
});
