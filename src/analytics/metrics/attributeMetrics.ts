import type { Activity, AttributeId } from '../../types/index.ts';
import type { AnalyticsPeriod, MetricSeries } from '../types.ts';
import { activityDay, containsDay } from '../periods.ts';

export const ATTRIBUTE_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

export function attributeMetrics(activities: Activity[], periods: AnalyticsPeriod[]): MetricSeries[] {
  return ATTRIBUTE_IDS.map(id => ({
    domain: 'attribute', metric: `attribute.${id}.awardedPoints.weekly`, unit: 'points',
    caveats: ['统计活动中记录的加点（包含系统奖励和补记），不代表属性余额或投入时长。'],
    values: periods.map(p => {
      const rows = activities.filter(a => {
        const day = activityDay(a.date);
        return day !== null && containsDay(p, day) && Number.isFinite(a.pointsAwarded?.[id]);
      });
      return { period: p.start, value: rows.reduce((sum, a) => sum + a.pointsAwarded[id], 0), sampleSize: rows.length };
    }),
  }));
}
