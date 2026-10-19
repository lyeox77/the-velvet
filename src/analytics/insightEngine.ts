import type { AnalyticsDataset, AnalyticsReport } from './types.ts';
import { activityDay, completedWeeks } from './periods.ts';
import { activityMetrics, isPersonalRecord } from './metrics/activityMetrics.ts';
import { attributeMetrics } from './metrics/attributeMetrics.ts';
import { todoMetrics } from './metrics/todoMetrics.ts';
import { timeMetrics } from './metrics/timeMetrics.ts';
import { wishMetrics } from './metrics/wishMetrics.ts';
import { detectTrend } from './detectors/trendDetector.ts';
import { detectAnomaly } from './detectors/anomalyDetector.ts';
import { detectConsistency } from './detectors/consistencyDetector.ts';
import { detectImbalance } from './detectors/imbalanceDetector.ts';

/** Pure, deterministic given dataset, now and the device timezone; never writes data. */
export function buildAnalyticsReport(dataset: AnalyticsDataset, now = new Date(), weeks = 8): AnalyticsReport {
  const periods = completedWeeks(now, weeks);
  const period = { start: periods[0].start, end: periods[periods.length - 1].end };
  const series = [
    ...activityMetrics(dataset.activities, periods), ...attributeMetrics(dataset.activities, periods),
    ...todoMetrics(dataset.todos, dataset.completions, periods), ...timeMetrics(dataset.activities, periods),
    ...wishMetrics(dataset.wishes, periods),
  ];
  // Leading empty weeks before the first personal record are not evidence of inactivity.
  const firstRecord = dataset.activities.filter(isPersonalRecord).map(a => activityDay(a.date))
    .filter((day): day is string => day !== null).sort()[0];
  const evidence = series.flatMap(s => {
    const first = s.values.findIndex(point => firstRecord !== undefined && point.period >= firstRecord);
    const observed = { ...s, values: first < 0 ? [] : s.values.slice(first) };
    if (!observed.values.length) return [];
    const observedPeriod = { start: observed.values[0].period, end: period.end };
    return [...detectTrend(observed, observedPeriod), ...detectAnomaly(observed, observedPeriod), ...detectConsistency(observed, observedPeriod)];
  });
  if (firstRecord && firstRecord <= period.start) evidence.push(...detectImbalance(series, period));
  return {
    version: 1, periods, series, evidence,
    caveats: ['仅分析本机当前留存数据；删除、导入及设备时区变化会改变结果。',
      '窗口包含最近若干个完整自然周，不含进行中的本周；首次个人记录所在的不完整周不参与检测。',
      '未接入 AI、持久化洞察、睡眠数据或跨域相关性分析。'],
  };
}
