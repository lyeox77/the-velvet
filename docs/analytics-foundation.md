# Analytics foundation (V1)

## Branch boundaries

Repository: `lyeox77/the-velvet` only.

- `main`: upstream mirror; no personal commits.
- `personal`: integration branch, initially created from fork `main`.
- `feature/analytics-foundation`: all changes in this phase; proposed PR base is `personal`.
- Never write to `YuukiMarine/the-velvet`.

Do not merge this phase automatically. UI and AI interpretation are subsequent phases.

## API

```ts
import { loadAnalyticsDataset, buildAnalyticsReport } from '@/analytics';

const dataset = await loadAnalyticsDataset();
const report = buildAnalyticsReport(dataset, new Date(), 8);
```

`loadAnalyticsDataset()` reads activities, attributes, todos, todo completions and
wishes within one read-only Dexie transaction. A read failure rejects the load;
it is never replaced with empty data. `readAnalyticsDataset(reader)` accepts a
narrow read-only adapter for fixtures. `buildAnalyticsReport` is pure and does
not depend on Zustand, LLMs or database initialization.

No database version, tables, backup, sync, store or existing AI logic is changed.
The report is computed on demand and never persisted. It includes raw metric
series even when no detector has sufficient evidence to emit a finding.

## Definitions and limits

- Periods: local calendar dates, Monday inclusive to next Monday exclusive;
  default is eight completed weeks, maximum 52. The current week is excluded.
  Calendar arithmetic supports DST, year boundaries and leap days.
- Personal activity rhythm: `!category && !backfilled`, counted by distinct
  local dates and by records. Invalid dates are ignored.
- Attribute series: weekly sums of finite `pointsAwarded` values from all
  activities, including rewards and backfills. This measures recorded awards,
  not current balances, effort or time. Current attribute balances are not
  retroactively turned into history.
- Time pattern: personal records only; dawn 05–08, morning 08–12, afternoon
  12–18, evening 18–23, late night 23–05. Current device timezone applies.
  Recording time does not establish sleep or health behavior.
- Todo check-ins: positive integer completion counts, including counts for
  deleted tasks. BIG DEAL steps use a different storage path and are excluded.
- Recurring completion ratio: explicitly **estimated**, for `repeatDaily`
  tasks only, excluding long-term and BIG DEAL tasks. Current creation date,
  start date, weekdays, archive date (inclusive) and daily targets define an
  estimated denominator. Per-task daily completions are capped at the target.
  Paused tasks without an archive timestamp are excluded. A zero denominator
  returns `null`, not zero. Current task definitions cannot reconstruct previous
  schedule edits, pauses or deleted tasks. Detectors never use this estimate.
  Weekday-only non-repeating tasks and open-ended single tasks have no inferred
  denominator.
- Wish series: top-level wishes only; last valid retained assessment per week,
  ordered by actual timestamp. Missing assessments remain `null`; they do not
  mean zero progress or stagnation. No baseline is invented from current
  progress or the first retained delta. The 12-entry history cap and mixed
  manual/local/AI sources limit interpretation. Raw reason text is not used.
- The week containing the first personal record is excluded from detection
  when that record falls after Monday; earlier empty weeks are excluded too.
  This is a conservative observation boundary, not proof that the entire
  history after that point is complete.

## Deterministic rules

All time-series rules require at least four non-null complete weekly values.
Estimated series never generate evidence.

- Trend: strictly monotonic values, endpoint change at least
  `max(1, abs(first) * 0.2)`.
- Anomaly: at least five weeks; last week differs from the previous weeks'
  mean by at least `max(2, 3 * populationSD, abs(mean) * 0.5)`. Zero variance is
  handled without division. This is a descriptive threshold, not a statistical
  significance test.
- Consistency: personal recorded-day series only; every week at least three
  days and total range no more than one day.
- Imbalance: one attribute receives at least 70% of recorded awards in the
  window, with at least 20 total points and no negative attribute totals. Only
  considered when a personal record predates or falls on the window start.
  This describes reward concentration, not an undesirable personal deficit.

Evidence contains deterministic IDs, source metric, exclusive date window,
copied values, sample count, observation and caveats. Sample count means
contributing records for most metrics and retained assessments for wishes;
it is not an independent statistical sample. Confidence is a qualitative rule
strength (`limited` for wishes, `moderate` otherwise), never a probability.
No correlation, causal attribution, medical or psychological judgment is made.
User-entered activity descriptions and wish titles are not embedded in evidence.

## Verification

After installing normal project dependencies, use TypeScript 5.3+ and Node
22.18+ (native TypeScript stripping) or Node 24:

```sh
npm run check:analytics
npm run test:analytics
```

The focused type check covers new analytics modules plus their real database
and domain types. Tests cover calendar boundaries, DST calendar math, empty and
sparse data, exclusions, recurring denominators, missing wish assessments,
detector thresholds, immutable outputs and adapter failures. Run in multiple
`TZ` environments (for example `Asia/Shanghai`, `America/New_York`, `UTC`).
These checks do not substitute for the full application build or future UI QA.
