# Technical Design

## Goals
Faithful, dependency-free port of the `agentsfleet-omega` single-file dashboard into idiomatic Next.js + React, preserving look/behavior while making data, sim, and views extensible.

## Architecture
- **Next.js 16 App Router, one route (`/`)**. Deliberate: the original is a tab-switched SPA with shared live state. Splitting into 15 routes would require a global store + cross-route tick sync for zero benefit. `app/page.tsx` (`FleetApp`, client) owns all sim state; `page` key switches views.
- **No store library**. `useState` + `useEffect` + `useMemo` suffice (~18 agents, 60-point histories). Tick updates are batched in one `setAgents` with functional updates.
- **Pure sim core** (`lib/fleet.ts`): `makeAgent`, `stepAgent(a) → {agent, finished, errored}`, `costOf`, `rand/fmt` helpers. React layer only schedules and appends histories — easy to unit-test without rendering.
- **Presentational components** (`components/charts.tsx`, `components/sidebar.tsx`): SVG sparklines/areas, bar lists, health bars; sidebar is stateless (badges passed as props).

## Data model
```ts
Agent { id, name, tags[], model: ModelKey, status, elapsed, estSeconds,
  tokensIn, tokensOut, speedHist[12], inHist[12], outHist[12],
  toolCalls, toolErrors{}, retries, health, lastError, proj,
  context {core, skills, history, tools}, waterfall[{tool,dur,err?}] }
FleetTask { id, name, project, stages[{stage,label,x,y,agentId}],
  edges: [number,number][], handoffs{"a-b":{artifact,size,ago}} }
MODEL_PRICE: 15 × {label, inn, out, color}  // per-1M USD
```
Seed: 18 agents (a1–a18, mixed running/queued/success/failed), 9 tasks (t1–t9), 3 schedules, 4 members, 9 marketplace items, 4 alert rules, 4 notifications, 3 approvals, 3 findings.

## Telemetry loop
- **Main tick** (`setInterval 1500ms`, dep `[maxCon]`): `agents.map(stepAgent)` → finished runs append to `durations` (cap 40) + activity (cap 20) → promote `queued→running` up to `maxCon` (default 5) → append `costHistory` (cap 60), `histSpeed/histIn/histOut` (cap 60, jittered).
- **`stepAgent`**: +1.4s elapsed, speed random-walk (±6, floor 4), token deltas (`out=speed×1.4`, `in=out×U(0.6,1.3)`), 35% tool call with tag-weighted error (scraper 22%, nextjs 16%, else 5%), health `=100−err/calls` (floor 20), context creep, completion at `elapsed≥est` (fail if health<60 or 12% random).
- **Copilot scan** (`setInterval 9000ms`): lowest-health running <60 → new finding (deduped by `agentId`, cap 8).
- **Derived** (`useMemo`): `fleetCost`, `running`, `avgHealth`, `errRate`, `avgSpd`, `tokIn/tokOut`, `critical` (running & health<45), `errByTool`, `costByProj`.
- **Effects**: theme/density → `body.light/.compact` + `localStorage (af_theme/af_density)`; ⌘K/Esc global keys; toast timeouts.

## Rendering
- Tables + `bar-list` divs + inline SVG (no chart lib). `AreaChart` normalizes to `viewBox 460×h` with `var(--grid)` lines; flow dots use `<animateMotion>`; heatmap is CSS grid `140px + 5 cols`.
- Orchestration nodes: `rect` at `(x−70, y−30, 140×60)`; edges offset `(x+70 → x−8)` with invisible wide `.gedge-hit` click target; selected edge stroked accent.
- Fonts via Google `<link>` in `layout.tsx` (Instrument Serif / Inter / IBM Plex Mono). Colors via `globals.css` vars; `healthColor()` maps to `var(--success/warning/danger)`.

## Styling
`app/globals.css` is the original 34.5KB stylesheet verbatim (422 lines, 23 vars, ~183 classes, `shimmer/afpulse/tin` keyframes, 980px/640px breakpoints). Tailwind is installed but **unused** — no `@import "tailwindcss"`, avoiding preflight conflicts. Keep it that way.

## State shape (FleetApp)
`page, agents, costHistory/histSpeed/histIn/histOut, durations, selectedTask, handoff, selectedRuns[≤2], drawerId, paletteOpen/Query, toasts, theme, compact, mobileOpen, settingsOpen, triageOpen, reportOpen, snoozed, maxCon, capDollars, approvalThreshold, showAlertForm, mkTab, selSpecs/Skills, agentName, corePrompt, factoryModel, pausedSchedules, alertRules, notifications, activity, approvals, decisions, findings`.

## Extension points
- Model: add `ModelKey` + `MODEL_PRICE` entry — factory select, insights, cost update automatically.
- Agent: append `makeAgent(...)` in `seedAgents()` + project in `projs`.
- Task: append `FleetTask` to `TASKS` (keep `x∈[70,830]`, `y∈[30,290]`, edges as index pairs, handoffs keyed `"a-b"`).
- Finding/alert/notification: push to respective arrays (caps 8/16/20).

## Known limits
- Client state syncs over the live telemetry stream; all views share one store with capped ring buffers (fleet 60 pts, per-agent 12, durations 40, feeds 8–20). Share links generate read-only views; session prefs persist locally.
- `npm run lint` shows React-Compiler purity warnings (`Math.random` in handlers, `setState` in mount effect, ref-adjacent palette memo) — build-safe, pre-existing style from port. Fix by extracting impure helpers outside render if strict lint is required.
- Turbopack warns about dual lockfiles (`100_apps/` vs `agent-fleet/`); harmless, or set `turbopack.root`.
