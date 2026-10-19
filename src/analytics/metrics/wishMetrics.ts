import type { Wish } from '../../types/index.ts';
import type { AnalyticsPeriod, MetricSeries } from '../types.ts';
import { activityDay, containsDay } from '../periods.ts';

export function wishMetrics(wishes: Wish[], periods: AnalyticsPeriod[]): MetricSeries[] {
  return wishes.filter(w => !w.parentId).map(wish => {
    const history = (wish.progressHistory ?? []).filter(point => activityDay(point.at) !== null
      && Number.isFinite(point.pct) && point.pct >= 0 && point.pct <= 100)
      .slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    return {
      domain: 'wish', metric: `wish.${wish.id}.assessedProgress.weekly`, unit: 'percent',
      caveats: ['只展示周内最后一次留存评估；无评估留空，不视为零进度或停滞。',
        '轨迹最多保留 12 条，评估可来自 AI、离线估算或手动操作；数值不是客观成果测量。'],
      values: periods.map(p => {
        const rows = history.filter(point => containsDay(p, activityDay(point.at)!));
        return { period: p.start, value: rows.length ? rows[rows.length - 1].pct : null, sampleSize: rows.length };
      }),
    };
  });
}
