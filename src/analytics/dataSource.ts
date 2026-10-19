import type { AnalyticsDataset } from './types.ts';

/** A narrow read-only interface also permits deterministic fixtures. */
export interface AnalyticsReader {
  activities: { toArray(): Promise<AnalyticsDataset['activities']> };
  attributes: { toArray(): Promise<AnalyticsDataset['attributes']> };
  todos: { toArray(): Promise<AnalyticsDataset['todos']> };
  todoCompletions: { toArray(): Promise<AnalyticsDataset['completions']> };
  wishes: { toArray(): Promise<AnalyticsDataset['wishes']> };
}

export async function readAnalyticsDataset(reader: AnalyticsReader): Promise<AnalyticsDataset> {
  const [activities, attributes, todos, completions, wishes] = await Promise.all([
    reader.activities.toArray(), reader.attributes.toArray(), reader.todos.toArray(),
    reader.todoCompletions.toArray(), reader.wishes.toArray(),
  ]);
  return { activities, attributes, todos, completions, wishes };
}

export async function loadAnalyticsDataset(): Promise<AnalyticsDataset> {
  // Lazy import keeps pure calculations independent of IndexedDB and store startup.
  const { db } = await import('../db/index.ts');
  return db.transaction('r', [db.activities, db.attributes, db.todos, db.todoCompletions, db.wishes],
    () => readAnalyticsDataset(db));
}
