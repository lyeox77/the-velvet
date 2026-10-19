import type { Activity, Attribute, Todo, TodoCompletion, Wish } from '../types/index.ts';

export interface AnalyticsDataset {
  activities: Activity[];
  attributes: Attribute[];
  todos: Todo[];
  completions: TodoCompletion[];
  wishes: Wish[];
}

/** Local calendar dates. start is inclusive; end is exclusive. */
export interface AnalyticsPeriod { start: string; end: string }
export interface MetricPoint {
  period: string;
  value: number | null;
  sampleSize: number;
}
export interface MetricSeries {
  domain: 'activity' | 'attribute' | 'todo' | 'wish';
  metric: string;
  unit: 'days' | 'records' | 'points' | 'ratio' | 'count' | 'percent';
  values: MetricPoint[];
  caveats: string[];
  /** Estimated historical denominators must not produce automatic findings. */
  estimated?: boolean;
}
export interface Evidence {
  id: string;
  kind: 'trend' | 'anomaly' | 'consistency' | 'imbalance';
  domain: MetricSeries['domain'];
  metric: string;
  period: AnalyticsPeriod;
  observation: string;
  values: MetricPoint[];
  sampleSize: number;
  /** Rule strength, not a statistical probability or causal claim. */
  confidence: 'limited' | 'moderate';
  caveats: string[];
}
export interface AnalyticsReport {
  version: 1;
  periods: AnalyticsPeriod[];
  series: MetricSeries[];
  evidence: Evidence[];
  caveats: string[];
}
