import type { Todo, TodoCompletion } from '../../types/index.ts';
import type { AnalyticsPeriod, MetricSeries } from '../types.ts';
import { activityDay, addDays, containsDay, parseDay } from '../periods.ts';

const SCHEDULE_CAVEAT = '按当前重复排期估算；未保存历史排期、暂停及删除记录，不能视为精确历史完成率。';

export function todoMetrics(todos: Todo[], completions: TodoCompletion[], periods: AnalyticsPeriod[]): MetricSeries[] {
  const valid = completions.filter(c => {
    try { parseDay(c.date); return Number.isInteger(c.count) && c.count > 0; } catch { return false; }
  });
  const byTodo = new Map<string, Map<string, number>>();
  for (const row of valid) {
    const days = byTodo.get(row.todoId) ?? new Map<string, number>();
    days.set(row.date, (days.get(row.date) ?? 0) + row.count);
    byTodo.set(row.todoId, days);
  }
  const totals: MetricSeries = {
    domain: 'todo', metric: 'todo.checkins.weekly', unit: 'count',
    caveats: ['完成计数包含长期任务；BIG DEAL 子步不写入 todoCompletions，因此不在本指标中。'],
    values: periods.map(p => {
      const rows = valid.filter(c => containsDay(p, c.date));
      return { period: p.start, value: rows.reduce((s, c) => s + c.count, 0), sampleSize: rows.length };
    }),
  };
  const estimated: MetricSeries = {
    domain: 'todo', metric: 'todo.recurringCompletionRatio.estimated.weekly', unit: 'ratio',
    estimated: true, caveats: [SCHEDULE_CAVEAT, '仅覆盖每日重复、非长期、非 BIG DEAL 任务；按任务每日目标封顶，分母为零时留空。'],
    values: periods.map(p => {
      let expected = 0, completed = 0;
      for (const todo of todos) {
        if (!todo.repeatDaily || todo.isLongTerm || todo.isBigDeal) continue;
        // A paused task without an archive date has no recoverable active interval.
        if (!todo.isActive && !todo.archivedAt) continue;
        const created = activityDay(todo.createdAt);
        const archived = todo.archivedAt ? activityDay(todo.archivedAt) : null;
        if (!created || (todo.archivedAt && !archived)) continue;
        if (todo.startDate) { try { parseDay(todo.startDate); } catch { continue; } }
        const start = todo.startDate && todo.startDate > created ? todo.startDate : created;
        const target = todo.frequency === 'count' ? todo.targetCount ?? 1 : 1;
        if (!Number.isInteger(target) || target < 1) continue;
        for (let day = p.start; day < p.end; day = addDays(day, 1)) {
          if (day < start || (archived && day > archived)) continue;
          if (todo.weekdays?.length && !todo.weekdays.includes(parseDay(day).getDay())) continue;
          expected += target;
          const count = byTodo.get(todo.id)?.get(day) ?? 0;
          completed += Math.min(target, count);
        }
      }
      return { period: p.start, value: expected ? completed / expected : null, sampleSize: expected };
    }),
  };
  return [totals, estimated];
}
