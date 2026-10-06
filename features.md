# Features

Complete map of the 15 views in `app/page.tsx`, backed by `lib/fleet.ts`.

## Observe

### Dashboard (`dashboard`)
- 7 KPIs: running count, fleet cost, avg health, error rate, speed (tok/s), tokens in/out, budget-cap usage
- Live agents table (18 rows): status pill, model, elapsed/est bar, tokens, sparkline speed, health bar, cost, error count. Click row → agent drawer.
- Analytics: cumulative cost burn (60-tick area), errors by tool, cost by project, context budget, throughput avg, error heatmap (agent × tool, top 8), leaderboard (top speed/spend/healthiest/most errors)
- Actions: `Run agent` → factory, `Inject fault` (+2 playwright errors, health −18, notification + toast + activity)

### Orchestration (`graph`) — 9 tasks
| ID | Name | Project | Stages | Edges | Shape |
|----|------|---------|--------|-------|-------|
| t1 | Checkout regression | Acme Corp | 5 | 5 | planner fan-out → coder/tester → reviewer → ship |
| t2 | Pricing scrape | Globex Ltd | 4 | 3 | linear scout→scraper→analyst→digest |
| t3 | Docs migration | Internal R&D | 4 | 4 | audit fan-out → draft/verify → publish |
| t4 | Incident response swarm | Platform | 7 | 8 | triage fan-out → forensics/repro → mitigate → verify/postmortem → broadcast |
| t5 | Legal redline mesh | Globex Ltd | 6 | 7 | intake → extract/risk → redline → counsel + file join |
| t6 | Deep research fan-out | Internal R&D | 8 | 10 | planner 3-way fan-out → synthesize → fact-check/brief → ship |
| t7 | Release train canary | Acme Corp | 7 | 8 | build → unit/e2e gates → canary → metrics/rollout → announce |
| t8 | Threat-hunt loop | Platform | 6 | 7 | hunt → telemetry/anomaly → isolate/dump → report |
| t9 | Support ticket mesh | Globex Ltd | 7 | 8 | triage → FE/BE repro → fix → test/docs → reply |

- Left: task list (name, project, stage count). Main: SVG DAG with animated flow dots, rollup (stages/handoffs/running/cost), legend. Click any edge → handoff panel (artifact name, size, age).

### Runs & compare (`runs`)
- Checkbox table (max 2 selected). Sticky compare bar. Side-by-side grid on 2-select: cost, health, tokens, model + core-prompt diff boxes. `Export CSV` downloads `agent-fleet_runs.csv`.

### Alerts (`alerts`)
- Rule table (name/condition/channel/status) with pause/enable. `New rule` form (metric/condition/threshold/channel) appends + toast. Callout: firings route to Notifications.

### Notifications (`notifications`)
- Feed (guardrail trips, schedule failures, approvals, copilot). Unread dot, kind-tinted icon. `Mark all read` clears badge.

### Insights (`insights`)
- Token flow (in−out area), model mix bars, spend-by-model bars, throughput-by-model bars, combo + routing callouts.

### Fleet Copilot (`copilot`)
- Findings ranked newest-first (critical/warn/info). Evidence line, Restart-agent (if `agentId`) + Dismiss. Auto-scan every 9s appends low-health findings (max 8). Empty state when healthy.

### SLAs & error budgets (`slas`)
- Per-agent table (first 8): target (99.5 security / 98 else), live success rate, error-budget remaining, `fast burn` flag <25%, healthy/at-risk.

## Build

### Agent Factory (`factory`)
- Specialist chips (11) + skill chips (12), multi-select. Name, core prompt textarea, model select (all 15 with pricing).
- Live preview: `ROLE + SKILLS + core prompt`, conflict note (scraper + playwright-testing), estimates (tokens, cost from `MODEL_PRICE`, conflicts).
- `Spin up agent`: if est cost > approval threshold → creates approval + jumps to Approvals; else appends queued agent + activity + toast.

### Library · Marketplace (`marketplace`)
- Tabs: skills / specialists / templates (9 items total with installs + rating). `Install →` adds to factory selection + toast. `Publish template` submits the template for review.

### Schedules (`schedules`)
- 3 cron rows (nightly-regression, pricing-refresh, security-sweep): cadence, next, last, 7-dot history, pause/resume toggle.

## Organization

### Team & activity (`team`)
- 4 members (Subodh, Renee, Jae, CI Bot) + live activity feed (cap 20): restarts, approvals, schedules, kills, completions.

## Governance

### Approvals (`approvals`)
- Threshold display. Pending cards (name, est cost/tokens, requester, model, time, project) with Approve (→ decisions + toast) / Deny. Recent decisions feed. Empty state when clear.

### Chargeback & budgets (`chargeback`)
- Spend-by-project vs budget bars (`BASE_SPENT` + live cost), invoice table (runs, tokens in/out, cost, budget, ±variance), `Board report` modal (cost/health/error/speed + copy), `Export invoice CSV`. Caching-savings callout.

### Compliance & audit (`compliance`)
- Framework controls, data governance (residency, PII scrubber, retention), audit log table (time/actor/action/target/hash from activity), `✓ chain intact` banner.

## Shell (all pages)
- Sidebar: Observe / Build / Organization / Governance, live badges (running, active alerts, unread, pending approvals, findings), Light/Dark + Compact toggles, Settings & API, mobile drawer + ⌘K button.
- Incident bar: appears at ≥2 running agents <45% health (snoozable), `Triage →` modal with worst-first restart/kill.
- Agent drawer: cost/health/time stats, context bars, tool waterfall, log tail, Restart / Fork→Factory / Kill.
- Settings drawer: session budget cap, max concurrency slider (1–10, drives `promote()`), approval threshold, API tokens with rotation.
- Command palette (⌘K/Ctrl+K, Esc closes): go-to pages, run agent, inject fault, open settings, top-3 running agents; substring filter.
- Toasts (4.2s auto-dismiss), board-report modal, responsive breakpoints (980px/640px in `globals.css`).
