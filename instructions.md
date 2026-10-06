# Instructions

## Prerequisites
Node 18+ and npm. No env vars, no database, no API keys.

## Run
```bash
cd agent-fleet
npm install
npm run dev      # http://localhost:3000 (or next free port)
npm run build    # type-check + static prerender of /
npm run start    # serve production build
npm run lint     # eslint
```

## Project tour
| Path | What to edit |
|------|--------------|
| `app/page.tsx` | All 15 views + tick loop + drawers/modals/palette. Search `page === "` to jump to a view. |
| `lib/fleet.ts` | Models, agents, tasks, schedules, marketplace, sim math. |
| `components/sidebar.tsx` | Nav sections, badges, theme/density/settings hooks. |
| `components/charts.tsx` | `Spark`, `AreaChart`, `BarList`, `Health`. |
| `app/globals.css` | Design system. Prefer editing vars (`:root` / `body.light`) over per-component CSS. |
| `app/layout.tsx` | Title, fonts, global CSS import. |

Default view is `dashboard` (`useState<PageKey>("dashboard")`). Change the initial value to land elsewhere.

## Common tasks

### Add a model
1. Extend `ModelKey` union in `lib/fleet.ts`.
2. Add entry to `MODEL_PRICE` with `{label, inn, out, color}` (per-1M USD).
Done — factory dropdown, insights bars, and `costOf()` pick it up.

### Add an agent
In `seedAgents()`, append e.g.:
```ts
makeAgent("a19", "My-Agent", ["tester"], "gpt-5", 600, 95, "queued"),
```
and add its project to the parallel `projs` array. Status: `running` (live), `queued` (promoted up to `maxCon`), `success/failed/cancelled` (static rows).

### Add an orchestration task
Append to `TASKS`:
```ts
{ id: "t10", name: "My flow", project: "Acme Corp",
  stages: [{ stage: "a", label: "A", x: 70, y: 160, agentId: "a1" }, ...],
  edges: [[0,1]],
  handoffs: { "0-1": { artifact: "spec.md", size: "4kb", ago: "1m" } } }
```
Keep `x` in 70–830, `y` in 30–290 (SVG is `viewBox 0 0 900 320`). `agentId` must exist in seed. Handoff keys are `"fromIdx-toIdx"`.

### Tune the sim
- Tick speed: `setInterval(..., 1500)` in `app/page.tsx` main effect.
- Concurrency: Settings drawer slider or `useState(5)` for `maxCon`.
- Budget/approval: `capDollars` (default 5), `approvalThreshold` (default 0.35).
- Error pressure: tag weights in `stepAgent` (scraper .22 / nextjs .16 / else .05).
- History caps: `slice(-60)` fleet, `slice(-12)` per-agent, `slice(-40)` durations, feeds 8–20.

## Keyboard
⌘K / Ctrl+K palette · Esc closes palette/drawers/modals.

## Deploy to Vercel
1. `npm run build` passes locally.
2. Import repo in Vercel, framework preset Next.js, root `agent-fleet`, no env vars.
3. `npm run build` is the build command; output is standard Next.js.

## Troubleshooting
- **Port in use**: dev prints `using available port 3001 instead`, or kill the holder: `kill <PID>` (PID shown in the warning). Prior runs may linger after `curl` checks.
- **Turbopack workspace-root warning** (dual lockfiles in `100_apps/` + `agent-fleet/`): harmless. Silence via `turbopack.root` in `next.config.ts` if desired.
- **`npm run lint` errors** (`react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/refs`): React-Compiler strictness on the ported sim (mount-time `localStorage` restore, `Math.random` in handlers). Build-safe; refactor impure helpers out of render if you need zero-warning lint.
- **Blank charts**: histories seed with 40 points and grow to 60; `AreaChart` needs ≥2 points.
- **Missing task nodes**: check `agentId` exists and `x/y` within bounds above.
