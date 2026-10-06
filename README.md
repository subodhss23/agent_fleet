# Agent Fleet — Agent Observability

Live, single-page fleet observability UI in Next.js. Time, tokens, speed, health, cost, and handoffs for every agent — streaming live production telemetry.

> Port of `agentsfleet-omega.vercel.app` (vanilla single-file app) into a clean React + App Router refactor. Original CSS reused verbatim.

## Highlights

- **15 views** — Dashboard, Orchestration (9 DAGs), Runs & compare, Alerts, Notifications, Insights, Fleet Copilot, SLAs, Factory, Marketplace, Schedules, Team, Approvals, Chargeback, Compliance
- **18 live agents, 15 models, 9 orchestration graphs** — tick every 1.5s, Copilot scan every 9s
- **Interactive** — agent drawer (waterfall + logs), ⌘K palette, incident triage, approvals gate, CSV export, board report, settings (budget cap / concurrency / threshold)
- **Themed** — dark/light + compact/comfortable tables, persisted to `localStorage`

## Quickstart

```bash
cd agent-fleet
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (static /)
npm run lint    # eslint (see instructions.md for known warnings)
```

Requires Node 18+. No env vars, no database.

## Repo structure

```
app/
  layout.tsx      # metadata + Google fonts + globals.css
  page.tsx        # FleetApp client: sim loop + all 15 views + drawers/modals
  globals.css     # original design system (CSS vars, sidebar, tables, charts, drawers)
components/
  sidebar.tsx     # 4 sections, 15 nav items, theme/density/settings
  charts.tsx      # Spark, AreaChart, BarList, Health
lib/
  fleet.ts        # types, MODEL_PRICE×15, seedAgents×18, stepAgent, TASKS×9, marketplace/schedules
public/           # static assets
```

## Docs

- [`features.md`](./features.md) — what each view does
- [`technical_design.md`](./technical_design.md) — architecture, sim loop, data model
- [`instructions.md`](./instructions.md) — run, extend (add model/agent/task), deploy, troubleshoot

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 · no UI framework — custom CSS vars (`--bg`, `--accent`, `--success/warning/danger`, `--serif/sans/mono`).

## Deploy

```bash
npm run build && npm run start
```

Vercel: import repo, framework preset Next.js, no env needed. See `instructions.md`.

## License

Production fleet observability for live multi-agent operations.
