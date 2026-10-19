# Personal fork rules

- Work only in `lyeox77/the-velvet`. Never write to `YuukiMarine/the-velvet`.
- Keep `main` as an upstream mirror. Never commit or push personal changes to `main`.
- Create `personal` from fork `main`, then feature branches from `personal`.
- Analytics foundation work belongs on `feature/analytics-foundation`.
- Target feature PRs at `personal`; do not merge without the user's instruction.
- V1 Analytics reads existing data and computes evidence on demand. Do not add
  database tables, migrations, persistent insights or AI interpretation in this phase.
- Preserve the database, store, sync, backup and existing AI implementations.
- Run `npm run check:analytics` and `npm run test:analytics` for analytics changes.
