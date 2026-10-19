import type { AnalyticsPeriod, Evidence, MetricSeries } from '../types.ts';
import { makeEvidence, usableValues } from '../evidence.ts';

export function detectConsistency(series: MetricSeries, period: AnalyticsPeriod): Evidence[] {
  if (series.metric !== 'activity.recordedDays.weekly') return [];
  const values = usableValues(series);
  if (!values || values.some(v => v < 3) || Math.max(...values) - Math.min(...values) > 1) return [];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return [makeEvidence(series, period, 'consistency', `${values.length} 个完整周平均每周 ${mean.toFixed(1)} 天有个人记录，周间范围相差不超过 1 天。`)];
}
