import type { AnalyticsPeriod, Evidence, MetricSeries } from '../types.ts';
import { makeEvidence, usableValues } from '../evidence.ts';

export function detectAnomaly(series: MetricSeries, period: AnalyticsPeriod): Evidence[] {
  const values = usableValues(series);
  if (!values || values.length < 5) return [];
  const baseline = values.slice(0, -1);
  const mean = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  const sd = Math.sqrt(baseline.reduce((s, v) => s + (v - mean) ** 2, 0) / baseline.length);
  const last = values[values.length - 1];
  if (Math.abs(last - mean) < Math.max(2, sd * 3, Math.abs(mean) * 0.5)) return [];
  return [makeEvidence(series, period, 'anomaly', `最近完整周记录值为 ${last}，此前 ${baseline.length} 周均值为 ${mean.toFixed(1)}，达到波动提示阈值。`)];
}
