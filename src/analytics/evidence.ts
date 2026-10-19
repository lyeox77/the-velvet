import type { AnalyticsPeriod, Evidence, MetricSeries } from './types.ts';

export function makeEvidence(series: MetricSeries, period: AnalyticsPeriod, kind: Evidence['kind'], observation: string): Evidence {
  return {
    id: `${series.metric}:${kind}:${period.start}:${period.end}`,
    kind, domain: series.domain, metric: series.metric, period: { ...period }, observation,
    values: series.values.map(point => ({ ...point })),
    sampleSize: series.values.reduce((sum, point) => sum + point.sampleSize, 0),
    confidence: series.domain === 'wish' ? 'limited' : 'moderate',
    caveats: [...series.caveats, '规则描述记录中的变化，不是统计显著性、因果关系或心理判断。'],
  };
}

export function usableValues(series: MetricSeries): number[] | null {
  if (series.estimated || series.values.length < 4) return null;
  const values = series.values.map(point => point.value);
  return values.every((v): v is number => v !== null && Number.isFinite(v)) ? values : null;
}
