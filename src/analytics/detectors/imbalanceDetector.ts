import type { AnalyticsPeriod, Evidence, MetricSeries } from '../types.ts';
import { makeEvidence } from '../evidence.ts';

/** Point concentration describes reward distribution, never a personal deficit. */
export function detectImbalance(series: MetricSeries[], period: AnalyticsPeriod): Evidence[] {
  const attrs = series.filter(s => s.domain === 'attribute');
  const totals = attrs.map(s => s.values.reduce((sum, p) => sum + (p.value ?? 0), 0));
  const total = totals.reduce((sum, v) => sum + v, 0);
  if (total < 20 || totals.some(v => v < 0)) return [];
  const top = Math.max(...totals), index = totals.indexOf(top);
  if (top / total < 0.7) return [];
  return [makeEvidence(attrs[index], period, 'imbalance', `本窗口中，该属性占已记录加点的 ${(top / total * 100).toFixed(0)}%（${top}/${total}）。`)];
}
