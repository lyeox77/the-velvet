import type { Activity } from '../../types/index.ts';
import type { AnalyticsPeriod, MetricSeries } from '../types.ts';
import { activityDay, containsDay } from '../periods.ts';
import { isPersonalRecord } from './activityMetrics.ts';

export const TIME_BUCKETS = ['dawn', 'morning', 'afternoon', 'evening', 'lateNight'] as const;
export function timeBucket(hour: number): typeof TIME_BUCKETS[number] {
  return hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 12 ? 'morning'
    : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 23 ? 'evening' : 'lateNight';
}

export function timeMetrics(activities: Activity[], periods: AnalyticsPeriod[]): MetricSeries[] {
  return TIME_BUCKETS.map(bucket => ({
    domain: 'activity', metric: `activity.time.${bucket}.weekly`, unit: 'records',
    caveats: ['按当前设备本地时区统计记录时间；不推断睡眠、健康或因果关系。'],
    values: periods.map(p => {
      const count = activities.filter(a => {
        const day = activityDay(a.date);
        return isPersonalRecord(a) && day !== null && containsDay(p, day)
          && timeBucket(new Date(a.date).getHours()) === bucket;
      }).length;
      return { period: p.start, value: count, sampleSize: count };
    }),
  }));
}
