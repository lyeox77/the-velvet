import type { AnalyticsPeriod, Evidence, MetricSeries } from '../types.ts';
import { makeEvidence, usableValues } from '../evidence.ts';

/** Conservative monotonic rule; no regression significance is implied. */
export function detectTrend(series: MetricSeries, period: AnalyticsPeriod): Evidence[] {
  const values = usableValues(series);
  if (!values) return [];
  const delta = values[values.length - 1] - values[0];
  if (Math.abs(delta) < Math.max(1, Math.abs(values[0]) * 0.2)) return [];
  const direction = Math.sign(delta);
  if (!values.slice(1).every((v, i) => Math.sign(v - values[i]) === direction)) return [];
  return [makeEvidence(series, period, 'trend', `${values.length} 个完整周的记录值连续${delta > 0 ? '上升' : '下降'}（${values[0]} → ${values[values.length - 1]}）。`)];
}
