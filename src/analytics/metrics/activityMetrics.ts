import type { Activity } from '../../types/index.ts';
import type { AnalyticsPeriod, MetricSeries } from '../types.ts';
import { activityDay, containsDay } from '../periods.ts';

export const isPersonalRecord = (activity: Activity): boolean => !activity.category && !activity.backfilled;

export function activityMetrics(activities: Activity[], periods: AnalyticsPeriod[]): MetricSeries[] {
  const rows = activities.filter(isPersonalRecord).map(a => activityDay(a.date)).filter((d): d is string => d !== null);
  return [
    { domain: 'activity', metric: 'activity.recordedDays.weekly', unit: 'days', caveats: [],
      values: periods.map(p => {
        const days = rows.filter(day => containsDay(p, day));
        return { period: p.start, value: new Set(days).size, sampleSize: days.length };
      }) },
    { domain: 'activity', metric: 'activity.records.weekly', unit: 'records', caveats: [],
      values: periods.map(p => {
        const count = rows.filter(day => containsDay(p, day)).length;
        return { period: p.start, value: count, sampleSize: count };
      }) },
  ];
}
