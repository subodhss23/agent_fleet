"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  Agent,
  BASE_SPENT,
  MARKETPLACE,
  MEMBERS,
  MODEL_PRICE,
  ModelKey,
  PROJ_BUDGET,
  SCHEDULES,
  SKILLS,
  SPECIALISTS,
  TASKS,
  TOOLS,
  costOf,
  fmtK,
  fmtTime,
  makeAgent,
  rand,
  seedAgents,
  stepAgent,
} from "@/lib/fleet";
import { AreaChart, BarList, Health, Spark } from "@/components/charts";
import { PageKey, Sidebar } from "@/components/sidebar";

interface Toast {
  id: number;
  msg: string;
  type: string;
}
interface AlertRule {
  name: string;
  cond: string;
  channel: string;
  active: boolean;
}
interface Notification {
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: string;
}
interface Finding {
  id: string;
  sev: "critical" | "warn" | "info";
  title: string;
  body: string;
  ev: string;
  agentId?: string;
}
interface Approval {
  id: string;
  name: string;
  requester: string;
  model: string;
  estCost: number;
  estTok: string;
  ts: string;
  proj: string;
}

const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function FleetApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [agents, setAgents] = useState<Agent[]>(() => seedAgents());
  const [costHistory, setCostHistory] = useState<number[]>([0]);
  const [histSpeed, setHistSpeed] = useState<number[]>(() =>
    Array.from({ length: 40 }, (_, i) => 34 + i * 0.35 + rand(-9, 9))
  );
  const [histIn, setHistIn] = useState<number[]>(() =>
    Array.from({ length: 40 }, (_, i) => 520 + i * 7 + rand(-90, 90))
  );
  const [histOut, setHistOut] = useState<number[]>(() =>
    Array.from({ length: 40 }, (_, i) => 170 + i * 2.6 + rand(-40, 40))
  );
  const [durations, setDurations] = useState<number[]>([
    214, 486, 322, 705, 158, 604, 268, 540, 390, 812, 455, 236, 668, 502,
  ]);
  const [selectedTask, setSelectedTask] = useState("t1");
  const [handoff, setHandoff] = useState<string | null>(null);
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [maxCon, setMaxCon] = useState(5);
  const [capDollars, setCapDollars] = useState(5);
  const [approvalThreshold, setApprovalThreshold] = useState(0.35);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [mkTab, setMkTab] = useState<"skills" | "specialists" | "templates">("skills");
  const [selSpecs, setSelSpecs] = useState<string[]>(["tester"]);
  const [selSkills, setSelSkills] = useState<string[]>(["playwright-testing"]);
  const [agentName, setAgentName] = useState("Checkout-Guardian");
  const [corePrompt, setCorePrompt] = useState(
    "Write unit + e2e tests for /app/checkout. Cover the discount-code edge case and flag any flaky selectors."
  );
  const [factoryModel, setFactoryModel] = useState<ModelKey>("muse-spark-1.2");
  const [pausedSchedules, setPausedSchedules] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    { name: "Health drops below 60%", cond: "Health drops below 60%", channel: "Slack #eng-alerts", active: true },
    { name: "Error rate rises above 15%", cond: "Error rate rises above 15%", channel: "Discord #agents", active: true },
    { name: "Run cost rises above $0.50", cond: "Cost rises above $0.50", channel: "Email", active: false },
    { name: "Speed drops below 20 tok/s", cond: "Speed drops below 20 tok/s", channel: "Webhook", active: true },
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([
    { title: "Guardrail tripped", body: "Scraper-Stealth-11 error rate crossed 15% — auto-retry engaged.", time: "09:12", read: false, kind: "err" },
    { title: "Schedule failed", body: "security-sweep last run failed (2 tool timeouts).", time: "08:40", read: false, kind: "warn" },
    { title: "Approval requested", body: "Legal-Redline-Sweep ($1.84 est) needs Admin sign-off.", time: "09:11", read: false, kind: "info" },
    { title: "Copilot finding", body: "tester + playwright-testing cuts errors 22% this session.", time: "09:02", read: true, kind: "info" },
  ]);
  const [activity, setActivity] = useState<{ t: string; who: string; txt: string }[]>([
    { t: "09:14", who: "Subodh B.", txt: "restarted <b>Nightly-Regress-0825</b>" },
    { t: "09:11", who: "Renee Park", txt: "requested approval for <b>Legal-Redline-Sweep</b>" },
    { t: "09:04", who: "CI Bot", txt: "scheduled <b>nightly-regression</b>" },
    { t: "08:57", who: "Jae Lin", txt: "published template <b>checkout-regression</b>" },
  ]);
  const [approvals, setApprovals] = useState<Approval[]>([
    { id: "pa1", name: "Bulk-Sentiment-Scan", requester: "Jae Lin", model: "glm-4.5", estCost: 0.62, estTok: "48k", ts: "08:57", proj: "Globex Ltd" },
    { id: "pa2", name: "Q3-Docs-Migration", requester: "CI Bot", model: "muse-spark-1.2", estCost: 0.41, estTok: "31k", ts: "09:04", proj: "Internal R&D" },
    { id: "pa3", name: "Legal-Redline-Sweep", requester: "Renee Park", model: "claude-opus-4", estCost: 1.84, estTok: "96k", ts: "09:11", proj: "Acme Corp" },
  ]);
  const [decisions, setDecisions] = useState<{ t: string; who: string; txt: string }[]>([
    { t: "07:58", who: "Renee Park", txt: "approved <b>SEO-Audit-Sweep</b> ($0.28 est)" },
    { t: "07:31", who: "Renee Park", txt: "approved <b>Churn-Prediction-Run</b> ($0.19 est)" },
    { t: "06:47", who: "Subodh B.", txt: "denied <b>Mass-Scrape-v9</b> — policy: robots.txt override" },
  ]);
  const [findings, setFindings] = useState<Finding[]>([
    { id: "f1", sev: "critical", title: "Scraper 403 spike on http_fetch", body: "Scraper-Stealth-11 hit 5 WAF blocks in 10 ticks. Rotate egress or enable stealth backoff.", ev: "5× 403 · waf_signal", agentId: "a5" },
    { id: "f2", sev: "warn", title: "Playwright flake in checkout suite", body: "Auth-Coder-Next shows 3 selector timeouts. Pin data-testid and quarantine flaky spec.", ev: "3 timeouts · checkout.spec.ts", agentId: "a4" },
    { id: "f3", sev: "info", title: "Route drafts to sonnet/glm-4.5", body: "claude-opus-4 costs ~5× sonnet with +9% success here. Keep opus for legal-grade output.", ev: "cost 5× · success +9%" },
  ]);

  const toastId = useRef(1);
  const pushToast = useCallback((msg: string, type = "ok") => {
    const id = toastId.current++;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const pushActivity = useCallback((who: string, txt: string) => {
    setActivity((a) => [{ t: nowHM(), who, txt }, ...a].slice(0, 20));
  }, []);

  // theme / density persistence + body class (light default, dark via body.dark)
  useEffect(() => {
    try {
      const t = localStorage.getItem("af_theme");
      if (t === "dark" || t === "light") setTheme(t);
      const d = localStorage.getItem("af_density");
      if (d === "compact") setCompact(true);
    } catch {}
  }, []);
  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("af_theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    document.body.classList.toggle("compact", compact);
    try {
      localStorage.setItem("af_density", compact ? "compact" : "comfortable");
    } catch {}
  }, [compact]);

  // live telemetry loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAgents((prev) => {
        const stepped = prev.map((a) => stepAgent(a).agent);
        // completions -> durations + activity
        const finished = prev.filter((a, i) => a.status === "running" && stepped[i].status !== "running");
        if (finished.length) {
          setDurations((d) => [...d, ...finished.map((a) => Math.round(a.elapsed))].slice(-40));
          finished.forEach((a, i) => {
            const st = stepped[prev.indexOf(a)];
            pushActivity("Fleet", `${st.status === "success" ? "completed" : "failed"} <b>${a.name}</b>`);
          });
        }
        // promote queued
        const running = stepped.filter((a) => a.status === "running").length;
        let slots = Math.max(0, maxCon - running);
        if (slots > 0) {
          for (const s of stepped) {
            if (slots <= 0) break;
            if (s.status === "queued") {
              s.status = "running";
              s.elapsed = 0;
              s.health = 97;
              slots--;
            }
          }
        }
        // histories
        const cost = stepped.reduce((s, a) => s + costOf(a), 0);
        setCostHistory((h) => [...h, cost].slice(-60));
        const avgSpd =
          stepped.filter((a) => a.status === "running").reduce((s, a) => s + (a.speedHist[a.speedHist.length - 1] || 0), 0) /
            Math.max(1, stepped.filter((a) => a.status === "running").length) || 0;
        setHistSpeed((h) => [...h, avgSpd + rand(-4, 4)].slice(-60));
        const tin = stepped.reduce((s, a) => s + a.tokensIn, 0);
        const tout = stepped.reduce((s, a) => s + a.tokensOut, 0);
        setHistIn((h) => [...h, tin].slice(-60));
        setHistOut((h) => [...h, tout].slice(-60));
        return [...stepped];
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [maxCon, pushActivity]);

  // copilot scan
  useEffect(() => {
    const timer = setInterval(() => {
      setAgents((prev) => {
        const bad = prev.filter((a) => a.status === "running" && a.health < 60);
        if (bad.length && Math.random() < 0.5) {
          const w = [...bad].sort((x, y) => x.health - y.health)[0];
          setFindings((f) => {
            if (f.some((x) => x.agentId === w.id)) return f;
            return [
              {
                id: `f${Date.now()}`,
                sev: (w.health < 45 ? "critical" : "warn") as Finding["sev"],
                title: `${w.name} health at ${w.health}%`,
                body: `Error rate elevated (${w.lastError || "tool errors"}). Consider restart or flake quarantine.`,
                ev: `${Object.values(w.toolErrors).reduce((s, n) => s + n, 0)} errors · ${w.toolCalls} calls`,
                agentId: w.id,
              },
              ...f,
            ].slice(0, 8);
          });
        }
        return prev;
      });
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  // palette shortcut
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setAvatarOpen(false);
        setDrawerId(null);
        setSettingsOpen(false);
        setTriageOpen(false);
        setReportOpen(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const fleetCost = useMemo(() => agents.reduce((s, a) => s + costOf(a), 0), [agents]);
  const running = useMemo(() => agents.filter((a) => a.status === "running"), [agents]);
  const avgHealth = useMemo(
    () => Math.round(agents.reduce((s, a) => s + a.health, 0) / Math.max(1, agents.length)),
    [agents]
  );
  const totalErr = useMemo(() => agents.reduce((s, a) => s + Object.values(a.toolErrors).reduce((x, n) => x + n, 0), 0), [agents]);
  const totalCalls = useMemo(() => agents.reduce((s, a) => s + a.toolCalls, 0), [agents]);
  const errRate = totalCalls ? (totalErr / totalCalls) * 100 : 0;
  const avgSpd = useMemo(
    () => running.reduce((s, a) => s + (a.speedHist[a.speedHist.length - 1] || 0), 0) / Math.max(1, running.length),
    [running]
  );
  const tokIn = useMemo(() => agents.reduce((s, a) => s + a.tokensIn, 0), [agents]);
  const tokOut = useMemo(() => agents.reduce((s, a) => s + a.tokensOut, 0), [agents]);
  const critical = useMemo(() => agents.filter((a) => a.status === "running" && a.health < 55), [agents]);
  const showIncident = critical.length >= 2 && !snoozed;

  // clear snooze once the fleet recovers so the next incident pages again
  useEffect(() => {
    if (critical.length === 0) setSnoozed(false);
  }, [critical.length]);
  const unread = notifications.filter((n) => !n.read).length;

  const injectFault = () => {
    if (!running.length) return;
    const pick = running[Math.floor(Math.random() * running.length)];
    setAgents((prev) =>
      prev.map((a) =>
        a.id === pick.id
          ? {
              ...a,
              toolErrors: { ...a.toolErrors, playwright: (a.toolErrors.playwright || 0) + 2 },
              lastError: "playwright: timeout (chaos drill)",
              health: Math.max(20, a.health - 18),
            }
          : a
      )
    );
    setNotifications((n) =>
      [{ title: "Chaos drill", body: `${pick.name} hit 2 playwright timeouts (controlled drill).`, time: nowHM(), read: false, kind: "err" }, ...n].slice(0, 20)
    );
    pushToast(`Chaos drill started on ${pick.name}`, "err");
    pushActivity("Subodh B.", `ran a chaos drill on <b>${pick.name}</b>`);
  };

  const revive = (id: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "running", health: 97, elapsed: 0, lastError: "" } : a)));
    pushToast("Agent restarted");
  };
  const kill = (id: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    pushActivity("Subodh B.", `killed agent`);
  };

  const toggleRun = (id: string) => {
    setSelectedRuns((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));
  };

  const spinUp = () => {
    const id = `a${Date.now() % 100000}`;
    const est = 600;
    const a = makeAgent(id, agentName || "Custom-Agent", [...selSpecs, ...selSkills].slice(0, 4), factoryModel, est, 98, "queued");
    const estCost = costOf({ ...a, tokensIn: 22000, tokensOut: 9000, model: factoryModel });
    if (estCost > approvalThreshold) {
      setApprovals((p) => [
        { id: `pa${Date.now()}`, name: a.name, requester: "Subodh B.", model: factoryModel, estCost, estTok: "31k", ts: nowHM(), proj: "Acme Corp" },
        ...p,
      ]);
      pushToast(`Sent to Approvals ($${estCost.toFixed(2)} est)`, "warn");
      setPage("approvals");
      return;
    }
    setAgents((prev) => [...prev, a]);
    pushActivity("Subodh B.", `spun up <b>${a.name}</b>`);
    pushToast(`Agent ${a.name} queued`);
    setPage("dashboard");
  };

  const errByTool = useMemo(() => {
    const m: Record<string, number> = {};
    TOOLS.forEach((t) => (m[t] = 0));
    agents.forEach((a) => Object.entries(a.toolErrors).forEach(([k, v]) => (m[k] = (m[k] || 0) + v)));
    return m;
  }, [agents]);

  const costByProj = useMemo(() => {
    const m: Record<string, number> = {};
    agents.forEach((a) => (m[a.proj] = (m[a.proj] || 0) + costOf(a)));
    return m;
  }, [agents]);

  const task = TASKS.find((t) => t.id === selectedTask) || TASKS[0];
  const drawer = agents.find((a) => a.id === drawerId) || null;

  const paletteItems: { group: string; label: string; run: () => void }[] = [
    ...(["dashboard", "graph", "runs", "insights", "factory", "approvals"] as PageKey[]).map((p) => ({
      group: "Go to",
      label: `Go to ${p}`,
      run: () => {
        setPage(p);
        setPaletteOpen(false);
      },
    })),
    { group: "Actions", label: "Run agent (factory)", run: () => { setPage("factory"); setPaletteOpen(false); } },
    { group: "Actions", label: "Run chaos drill", run: () => { injectFault(); setPaletteOpen(false); } },
    { group: "Actions", label: "Open settings", run: () => { setSettingsOpen(true); setPaletteOpen(false); } },
    ...running.slice(0, 3).map((a) => ({
      group: "Agents",
      label: `Open ${a.name}`,
      run: () => {
        setDrawerId(a.id);
        setPaletteOpen(false);
      },
    })),
  ].filter((i) => i.label.toLowerCase().includes(paletteQuery.toLowerCase()));

  const conflicts = selSpecs.includes("scraper") && selSkills.includes("playwright-testing") ? 1 : 0;
  const estTokens = 18000 + selSpecs.length * 4200 + selSkills.length * 2600 + corePrompt.length * 2;
  const estCost = (estTokens / 1_000_000) * MODEL_PRICE[factoryModel].out + 0.004;

  const exportCSV = () => {
    const rows = [["agent", "status", "model", "duration_s", "cost", "health"], ...agents.map((a) => [a.name, a.status, a.model, Math.round(a.elapsed), costOf(a).toFixed(4), a.health])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "agent-fleet_runs.csv";
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="m-topbar">
        <button className="m-burger" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
        <div className="m-logo"><div className="sb-mark" />Agent Fleet</div>
        <div className="m-spacer" />
        <button className="m-burger" onClick={() => setPaletteOpen(true)} aria-label="Search">⌕</button>
      </div>

      <Sidebar
        page={page}
        go={(p) => setPage(p)}
        runCount={running.length}
        alertCount={alertRules.filter((r) => r.active).length}
        notifCount={unread}
        approvalCount={approvals.length}
        copilotCount={findings.length}
        onSettings={() => setSettingsOpen(true)}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />
      <div className={`sb-scrim${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />

      <div className="main">
        <div className="topbar">
          <div className="topbar-brand" title="Home" style={{ cursor: "pointer" }} onClick={() => setPage("dashboard")}>Agent Fleet <small>OBSERVABILITY</small></div>
          <div className="topbar-search" onClick={() => setPaletteOpen(true)}>Search agents, runs, pages… <kbd>⌘K</kbd></div>
          <div className="topbar-actions">
            <span className="live-pill"><i />{running.length} live · ${fleetCost.toFixed(2)}</span>
            <button
              className="btn sm theme-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? "☀ Light" : "◐ Dark"}
            </button>
            <button className="btn primary sm" onClick={() => setPage("factory")}>+ Run agent</button>
            <div className="avatar-wrap">
              <div className="avatar" title="Account" style={{ cursor: "pointer" }} onClick={() => setAvatarOpen((o) => !o)}>SB</div>
              {avatarOpen && (
                <>
                  <div className="menu-scrim" onClick={() => setAvatarOpen(false)} />
                  <div className="avatar-menu">
                    <div className="am-head"><b>Subodh B.</b><span>Admin · XLABB workspace</span></div>
                    <div className="am-item" onClick={() => { setAvatarOpen(false); setPaletteOpen(true); }}>Command palette<kbd>⌘K</kbd></div>
                    <div className="am-item" onClick={() => { setAvatarOpen(false); setSettingsOpen(true); }}>Settings &amp; API</div>
                    <div className="am-item" onClick={() => { setAvatarOpen(false); setTheme((t) => (t === "dark" ? "light" : "dark")); }}>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</div>
                    <div className="am-sep" />
                    <div className="am-item danger" onClick={() => { setAvatarOpen(false); pushToast("Signed out"); }}>Sign out</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showIncident && (
          <div className="incident-bar open">
          <span className="incident-dot" />
          <span id="incidentMsg" style={{ flex: 1, fontSize: 12.5 }}>
            <b>Incident — {critical.length} agents critical.</b> Worst: {critical.slice().sort((a, b) => a.health - b.health)[0].name} at{" "}
            {critical.slice().sort((a, b) => a.health - b.health)[0].health}% (
            {critical.slice().sort((a, b) => a.health - b.health)[0].model}).
          </span>
          <button className="btn danger sm" onClick={() => setTriageOpen(true)}>Triage →</button>
          <button className="drawer-close" onClick={() => setSnoozed(true)}>✕</button>
        </div>
      )}

        {page === "dashboard" && (
          <div className="page active">
            <div className="page-header">
              <div className="ph-left">
                <h1>Fleet dashboard</h1>
                <p>Token & Health for Every Agent</p>
              </div>
            </div>
            <div className="content">
              <div className="fleet-health">
                <div>
                  <h3>FLEET HEALTH</h3>
                  {(() => {
                    const h = running.filter((a) => a.health >= 80).length;
                    const d = running.filter((a) => a.health >= 55 && a.health < 80).length;
                    const c = critical.length;
                    return (
                      <div className="fh-pills">
                        <div className="fh-pill healthy" onClick={() => setPage("copilot")} title="Healthy agents"><b>{h}</b><span>healthy</span></div>
                        <div className="fh-pill degraded" onClick={() => setPage("copilot")} title="Degraded agents"><b>{d}</b><span>degraded</span></div>
                        <div className="fh-pill critical" onClick={() => { setTriageOpen(true); }} title="Critical agents — open triage"><b>{c}</b><span>critical</span></div>
                      </div>
                    );
                  })()}
                  <p>Multi-region · Production Fleet Telemetry</p>
                </div>
                <div className="fh-live">
                  <div className="fh-live-top">
                    <div><span>AVG HEALTH</span><b style={{ color: avgHealth >= 80 ? "var(--success)" : avgHealth >= 55 ? "var(--warning)" : "var(--danger)" }}>{avgHealth}%</b></div>
                    <div><span>THROUGHPUT</span><b>{avgSpd.toFixed(0)} t/s</b></div>
                    <div><span>SESSION COST</span><b>${fleetCost.toFixed(3)}</b></div>
                  </div>
                  <AreaChart data={histSpeed.slice(-30)} id="fhSpd" height={64} color="#3fb968" />
                  <div className="fh-live-meta">
                    ERR {errRate.toFixed(1)}% · {(() => {
                      const w = running.slice().sort((a, b) => a.health - b.health)[0];
                      return w ? `WORST ${w.name.slice(0, 20)} ${w.health}%` : "FLEET IDLE";
                    })()}
                  </div>
                </div>
              </div>
              <div className="charts-grid three" style={{ marginBottom: 14 }}>
                <div className="panel">
                  <div className="panel-head"><h4>Live fleet pulse</h4><span>{running.length} running · {agents.length} total</span></div>
                  <div className="hero-dots">
                    {agents.map((a) => {
                      const col = a.status === "running" ? (a.health >= 80 ? "var(--success)" : a.health >= 55 ? "var(--warning)" : "var(--danger)") : a.status === "queued" ? "var(--text-3)" : a.status === "success" ? "var(--text-2)" : "var(--danger)";
                      return <span key={a.id} title={`${a.name} · ${a.status} · ${a.health}%`} className={`hero-dot${a.status === "running" ? " running" : ""}`} style={{ background: col }} onClick={() => setDrawerId(a.id)} />;
                    })}
                  </div>
                  <div className="hero-meta"><span><b>{running.length}</b> live</span><span><b>{critical.length}</b> critical</span><span><b>{avgSpd.toFixed(0)}</b> tok/s</span></div>
                </div>
                <div className="panel">
                  <div className="panel-head"><h4>Cost velocity</h4><span>${fleetCost.toFixed(3)} session</span></div>
                  <div className="hero-duo">
                    <AreaChart data={costHistory.slice(-40)} id="heroCost" height={64} color="#6669e8" />
                    <AreaChart data={histSpeed.slice(-40)} id="heroSpd" height={64} color="#3fb968" />
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head"><h4>Fleet health split</h4><span>{avgHealth}% avg</span></div>
                  {(() => {
                    const h = running.filter((a) => a.health >= 80).length;
                    const d = running.filter((a) => a.health >= 55 && a.health < 80).length;
                    const c = critical.length;
                    const total = Math.max(1, running.length);
                    const C = 2 * Math.PI * 44;
                    const segs = [
                      { frac: h / total, color: "var(--success)" },
                      { frac: d / total, color: "var(--warning)" },
                      { frac: c / total, color: "var(--danger)" },
                    ];
                    let off = 0;
                    return (
                      <div className="hero-donut-wrap">
                        <svg width="110" height="110" viewBox="0 0 110 110">
                          <circle cx="55" cy="55" r="44" fill="none" stroke="var(--border)" strokeWidth="12" />
                          {segs.map((s, i) => {
                            const el = <circle key={i} cx="55" cy="55" r="44" fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${(s.frac * C).toFixed(1)} ${C.toFixed(1)}`} strokeDashoffset={(-off * C).toFixed(1)} transform="rotate(-90 55 55)" strokeLinecap="butt" />;
                            off += s.frac;
                            return el;
                          })}
                          <text x="55" y="52" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700">{avgHealth}%</text>
                          <text x="55" y="68" textAnchor="middle" fill="var(--text-3)" fontSize="9">health</text>
                        </svg>
                        <div className="hero-legend">
                          <span><i style={{ background: "var(--success)" }} />{h} healthy</span>
                          <span><i style={{ background: "var(--warning)" }} />{d} degraded</span>
                          <span><i style={{ background: "var(--danger)" }} />{c} critical</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="metrics-bar">
                {[
                  { l: "Running", v: running.length, d: `${agents.length} total` },
                  { l: "Fleet cost", v: `$${fleetCost.toFixed(3)}`, d: "this session" },
                  { l: "Avg health", v: `${avgHealth}%`, d: totalErr ? `${totalErr} errors` : "no errors" },
                  { l: "Error rate", v: `${errRate.toFixed(1)}%`, d: `${totalCalls} calls` },
                  { l: "Speed", v: `${avgSpd.toFixed(0)} t/s`, d: "fleet avg" },
                  { l: "Tokens in/out", v: `${fmtK(tokIn)}/${fmtK(tokOut)}`, d: "session" },
                  { l: "Cap", v: `$${capDollars.toFixed(2)}`, d: `${((fleetCost / capDollars) * 100).toFixed(0)}% used` },
                ].map((m) => (
                  <div key={m.l} className="metric">
                    <div className="metric-label">{m.l}</div>
                    <div className="metric-value">{m.v}</div>
                    <div className="metric-delta">{m.d}</div>
                  </div>
                ))}
              </div>

              <div className="sec-head"><h2>Live agents</h2><span className="meta">{running.length} running · {agents.length} total</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Agent</th><th>Status</th><th>Model</th><th>Time</th><th>Tokens</th><th>Speed</th><th>Health</th><th>Cost</th><th>Errors</th></tr></thead>
                  <tbody>
                    {agents.map((a) => {
                      const errs = Object.values(a.toolErrors).reduce((s, n) => s + n, 0);
                      const spd = a.speedHist[a.speedHist.length - 1] || 0;
                      return (
                        <tr key={a.id} onClick={() => setDrawerId(a.id)} className={drawerId === a.id ? "selected" : ""}>
                          <td><div className="cell-agent"><b>{a.name}</b><div className="tags">{a.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div></div></td>
                          <td><span className={`status ${a.status}`}><i />{a.status}</span></td>
                          <td><span className="row-model">{a.model}</span></td>
                          <td><div className="cell-time"><span className="mono-num">{fmtTime(a.elapsed)}/{fmtTime(a.estSeconds)}</span><span className="bar"><i style={{ width: `${Math.min(100, (a.elapsed / a.estSeconds) * 100)}%` }} /></span></div></td>
                          <td><span className="mono-num">{fmtK(a.tokensIn + a.tokensOut)}</span></td>
                          <td><span className="spark-cell"><Spark vals={a.speedHist} color="var(--text-2)" /><span className="mono-num">{spd.toFixed(0)}</span></span></td>
                          <td><Health h={a.health} /></td>
                          <td><span className="mono-num">${costOf(a).toFixed(4)}</span></td>
                          <td><span className={`err-count ${errs ? "has" : "none"}`}>{errs || "—"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sec-head"><h2>Fleet analytics</h2><span className="meta">session window · 60 ticks</span></div>
              <div className="charts-grid">
                <div className="panel">
                  <div className="panel-head"><h4>Cost burn — cumulative</h4><span>${fleetCost.toFixed(3)}</span></div>
                  <AreaChart data={costHistory} id="costNow" />
                </div>
                <div className="panel">
                  <div className="panel-head"><h4>Errors by tool</h4><span>this session</span></div>
                  <BarList rows={TOOLS.map((t) => ({ label: t, value: errByTool[t] || 0, display: String(errByTool[t] || 0), color: errByTool[t] ? "var(--danger)" : "var(--text-3)" }))} />
                </div>
              </div>
              <div className="charts-grid" style={{ marginTop: 14 }}>
                <div className="panel">
                  <div className="panel-head"><h4>Cost by project</h4><span>billable split</span></div>
                  <BarList rows={Object.entries(costByProj).map(([k, v]) => ({ label: k, value: v, display: `$${v.toFixed(3)}`, color: "#6669e8" }))} />
                </div>
                <div className="panel">
                  <div className="panel-head"><h4>Context budget — fleet avg</h4><span>of 1M window</span></div>
                  <BarList rows={[
                    { label: "core prompt", value: 24, display: "24%", color: "#6669e8" },
                    { label: "skills", value: 13, display: "13%", color: "#4cc2dd" },
                    { label: "history", value: 31, display: "31%", color: "#c97fd6" },
                    { label: "tools", value: 9, display: "9%", color: "var(--text-3)" },
                  ]} />
                </div>
              </div>
              <div className="charts-grid" style={{ marginTop: 14 }}>
                <div className="panel">
                  <div className="panel-head"><h4>Throughput — fleet avg</h4><span>{avgSpd.toFixed(1)} tok/s</span></div>
                  <AreaChart data={histSpeed} id="spdNow" height={130} color="#3fb968" />
                </div>
                <div className="panel">
                  <div className="panel-head"><h4>Error heatmap — agent × tool</h4><span>session totals</span></div>
                  <div className="heat-mini" style={{ display: "grid", gridTemplateColumns: "140px repeat(5, 1fr)", gap: 3 }}>
                    <div />
                    {TOOLS.map((t) => <div key={t} className="hm hlab" style={{ fontSize: 9 }}>{t}</div>)}
                    {agents.slice(0, 8).map((a) => (
                      <Fragment key={a.id}>
                        <div className="hm hlab">{a.name.slice(0, 14)}</div>
                        {TOOLS.map((t) => {
                          const v = a.toolErrors[t] || 0;
                          return <div key={a.id + t} className="hm" style={{ background: v ? `rgba(239,109,104,${Math.min(0.7, 0.15 + v * 0.12)})` : "rgba(127,127,127,0.10)" }}>{v || ""}</div>;
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="leaderboard-inline">
                {[
                  { l: "Top speed", v: [...running].sort((a, b) => (b.speedHist[b.speedHist.length - 1] || 0) - (a.speedHist[a.speedHist.length - 1] || 0))[0]?.name || "—" },
                  { l: "Top spend", v: [...agents].sort((a, b) => costOf(b) - costOf(a))[0]?.name || "—" },
                  { l: "Healthiest", v: [...agents].sort((a, b) => b.health - a.health)[0]?.name || "—" },
                  { l: "Most errors", v: [...agents].sort((a, b) => Object.values(b.toolErrors).reduce((s, n) => s + n, 0) - Object.values(a.toolErrors).reduce((s, n) => s + n, 0))[0]?.name || "—" },
                ].map((c) => (
                  <div key={c.l} className="lb-cell"><div className="l">{c.l}</div><div className="v" style={{ fontSize: 13 }}>{c.v}</div></div>
                ))}
              </div>
              <div className="callout">◆ <span><b>tester + playwright-testing</b> is producing 22% fewer tool errors than tester alone this session (n=34).</span></div>
            </div>
          </div>
        )}

        {page === "graph" && (
          <div className="page active">
            <div className="page-header">
              <div className="ph-left"><h1>Orchestration</h1><p>Pick a task to see how work hands off between agents, live — click any edge to inspect the artifact being handed over.</p></div>
              <div className="ph-right"><div className="search-trigger" onClick={() => setPaletteOpen(true)}>Search or jump to… <kbd>⌘K</kbd></div></div>
            </div>
            <div className="content">
              <div className="orch-layout">
                <div className="task-list">
                  {TASKS.map((t) => (
                    <div key={t.id} className={`task-item${t.id === selectedTask ? " active" : ""}`} onClick={() => { setSelectedTask(t.id); setHandoff(null); }}>
                      <div className="tname">{t.name}</div>
                      <div className="tmeta"><i style={{ background: "var(--success)" }} />{t.project} · {t.stages.length} stages</div>
                    </div>
                  ))}
                </div>
                <div className="orch-main">
                  <div className="panel" style={{ padding: "22px 20px 14px" }}>
                    <div className="panel-head"><h4>{task.name}</h4><span>{task.project}</span></div>
                    <div className="orch-rollup">
                      <div><div className="l">Stages</div><div className="v">{task.stages.length}</div></div>
                      <div><div className="l">Handoffs</div><div className="v">{task.edges.length}</div></div>
                      <div><div className="l">Running</div><div className="v">{running.length}</div></div>
                      <div><div className="l">Cost</div><div className="v">${fleetCost.toFixed(3)}</div></div>
                    </div>
                    <div className="graph-scroll">
                      <svg viewBox="0 0 900 320" width="100%" height="360">
                        <defs>
                          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M0,0 L8,4 L0,8" fill="var(--border-strong)" />
                          </marker>
                        </defs>
                        {task.edges.map(([a, b], i) => {
                          const A = task.stages[a];
                          const B = task.stages[b];
                          const key = `${a}-${b}`;
                          return (
                            <g key={key}>
                              <line x1={A.x + 70} y1={A.y} x2={B.x - 8} y2={B.y} className="gedge" markerEnd="url(#arrow)" stroke={handoff === key ? "var(--accent)" : undefined} strokeWidth={handoff === key ? 2 : undefined} />
                              <line x1={A.x + 70} y1={A.y} x2={B.x - 8} y2={B.y} className="gedge-hit" onClick={() => setHandoff(key)} />
                              <circle r={3.5} fill="#6669e8" className="flow-dot">
                                <animateMotion dur={`${3 + i}s`} repeatCount="indefinite" path={`M${A.x + 70},${A.y} L${B.x - 8},${B.y}`} />
                              </circle>
                            </g>
                          );
                        })}
                        {task.stages.map((s, i) => {
                          const ag = agents.find((a) => a.id === s.agentId);
                          const col = !ag ? "var(--text-3)" : ag.status === "running" ? "var(--success)" : ag.status === "failed" ? "var(--danger)" : "var(--text-3)";
                          return (
                            <g key={s.stage + i}>
                              <rect x={s.x - 70} y={s.y - 30} width={140} height={60} rx={8} className="gnode" />
                              <circle cx={s.x - 52} cy={s.y - 12} r={4} fill={col} />
                              <text x={s.x - 40} y={s.y - 8} className="gnode-label">{s.label}</text>
                              <text x={s.x - 40} y={s.y + 10} className="gnode-sub">{ag?.name || s.agentId} · {ag?.status || "queued"}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    <div className="legend"><span><i style={{ background: "var(--success)" }} />running</span><span><i style={{ background: "var(--text-3)" }} />queued / template</span><span><i style={{ background: "var(--danger)" }} />error</span><span>— click an edge to inspect the handoff</span></div>
                  </div>
                  {handoff && task.handoffs[handoff] && (
                    <div className="panel" style={{ marginTop: 12 }}>
                      <div className="handoff-title">Handoff {handoff}</div>
                      <div className="handoff-row"><span className="art">{task.handoffs[handoff].artifact}</span><span>{task.handoffs[handoff].size} · {task.handoffs[handoff].ago} ago</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "runs" && (
          <div className="page active">
            <div className="page-header">
              <div className="ph-left"><h1>Runs &amp; compare</h1><p>Select any two runs to diff cost, speed, health and the core prompt side by side.</p></div>
              <div className="ph-right"><div className="search-trigger" onClick={() => setPaletteOpen(true)}>Search runs… <kbd>⌘K</kbd></div><button className="btn sm" onClick={exportCSV}>Export CSV</button></div>
            </div>
            <div className="content">
              <div className="table-wrap">
                <table>
                  <thead><tr><th style={{ width: 30 }} /><th>Agent</th><th>Status</th><th>Model</th><th>Duration</th><th>Cost</th><th>Health</th></tr></thead>
                  <tbody>
                    {agents.map((a) => (
                      <tr key={a.id}>
                        <td><input type="checkbox" checked={selectedRuns.includes(a.id)} onChange={() => toggleRun(a.id)} /></td>
                        <td><b>{a.name}</b></td>
                        <td><span className={`status ${a.status}`}><i />{a.status}</span></td>
                        <td><span className="row-model">{a.model}</span></td>
                        <td><span className="mono-num">{fmtTime(a.elapsed)}</span></td>
                        <td><span className="mono-num">${costOf(a).toFixed(4)}</span></td>
                        <td><Health h={a.health} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedRuns.length === 2 && (() => {
                const [x, y] = selectedRuns.map((id) => agents.find((a) => a.id === id)!).filter(Boolean);
                if (!x || !y) return null;
                return (
                  <div>
                    <div className="compare-grid">
                      <div className="h">Metric</div><div className="h">{x.name}</div><div className="h">{y.name}</div>
                      <div className="metric-name">Cost</div><div>${costOf(x).toFixed(4)}</div><div>${costOf(y).toFixed(4)}</div>
                      <div className="metric-name">Health</div><div>{x.health}%</div><div>{y.health}%</div>
                      <div className="metric-name">Tokens</div><div>{fmtK(x.tokensIn + x.tokensOut)}</div><div>{fmtK(y.tokensIn + y.tokensOut)}</div>
                      <div className="metric-name">Model</div><div className="row-model">{x.model}</div><div className="row-model">{y.model}</div>
                    </div>
                    <div className="diff-cols">
                      <div className="diff-box">{corePrompt} — {x.name} ({x.tags.join(", ")})</div>
                      <div className="diff-box">{corePrompt} — {y.name} ({y.tags.join(", ")})</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className={`compare-bar${selectedRuns.length ? " open" : ""}`}>
              <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{selectedRuns.length ? `${selectedRuns.length} selected` : "Select 2 runs to compare"}</span>
              <button className="btn primary sm" disabled={selectedRuns.length !== 2}>Compare runs</button>
            </div>
          </div>
        )}

        {page === "alerts" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Alerts</h1><p>Granular notify rules on top of your fleet-wide guardrails — fire a channel the moment a metric crosses a line.</p></div><div className="ph-right"><button className="btn primary" onClick={() => setShowAlertForm(true)}>New rule</button></div></div>
            <div className="content">
              <div className="table-wrap"><table><thead><tr><th>Rule</th><th>Condition</th><th>Channel</th><th>Status</th><th /></tr></thead><tbody>
                {alertRules.map((r, i) => (
                  <tr key={r.name + i}><td><b>{r.name}</b></td><td>{r.cond}</td><td>{r.channel}</td><td>{r.active ? "active" : "paused"}</td>
                    <td><button className="btn sm" onClick={() => setAlertRules((rs) => rs.map((x, j) => (j === i ? { ...x, active: !x.active } : x)))}>{r.active ? "Pause" : "Enable"}</button></td></tr>
                ))}
              </tbody></table></div>
              {showAlertForm && (
                <div className="panel" style={{ marginTop: 18 }}>
                  <div className="config-grid">
                    <div className="field"><label className="field-label">Metric</label><select><option>Health</option><option>Error rate</option><option>Cost</option><option>Speed</option><option>Context used</option></select></div>
                    <div className="field"><label className="field-label">Condition</label><select><option>drops below</option><option>rises above</option></select></div>
                    <div className="field"><label className="field-label">Threshold</label><input type="text" defaultValue="70%" /></div>
                  </div>
                  <button className="btn primary" onClick={() => { setAlertRules((r) => [...r, { name: "Custom rule 70%", cond: "Health drops below 70%", channel: "Slack #eng-alerts", active: true }]); setShowAlertForm(false); pushToast("Alert rule saved"); }}>Save rule</button>
                  <button className="btn" style={{ marginLeft: 8 }} onClick={() => setShowAlertForm(false)}>Cancel</button>
                </div>
              )}
              <div className="callout" style={{ marginTop: 16 }}>◆ <span>Fired alerts land in <b>Notifications</b> and stream to the channel of your choice.</span></div>
            </div>
          </div>
        )}

        {page === "notifications" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Notifications</h1><p>Every alert firing, schedule failure, and guardrail trip in one feed.</p></div><div className="ph-right"><button className="btn" onClick={() => setNotifications((n) => n.map((x) => ({ ...x, read: true })))}>Mark all read</button></div></div>
            <div className="content"><div className="table-wrap">
              {notifications.map((n, i) => (
                <div key={i} className={`notif-row${n.read ? " read" : ""}`}>
                  <span className="dot" />
                  <div className="notif-icon" style={{ background: n.kind === "err" ? "var(--danger-soft)" : n.kind === "warn" ? "var(--warning-soft)" : "var(--accent-soft)" }}>●</div>
                  <div className="body"><b>{n.title}</b><div style={{ color: "var(--text-2)" }}>{n.body}</div></div>
                  <span className="time">{n.time}</span>
                </div>
              ))}
            </div></div>
          </div>
        )}

        {page === "insights" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Insights</h1><p>Where tokens go, how models split, who leads the fleet — and everything that went wrong.</p></div><div className="ph-right"><span className="mono-num" style={{ color: "var(--text-3)" }}>window: session · 60 ticks</span></div></div>
            <div className="content">
              <div className="metrics-bar">
                {[
                  { l: "Total tokens", v: fmtK(tokIn + tokOut), d: `${fmtK(tokIn)} in / ${fmtK(tokOut)} out` },
                  { l: "In / out ratio", v: `${(tokIn / Math.max(1, tokOut)).toFixed(2)}×`, d: "context load" },
                  { l: "Avg throughput", v: `${avgSpd.toFixed(0)} t/s`, d: `${running.length} agents live` },
                  { l: "Active models", v: new Set(agents.map((a) => a.model)).size, d: `of ${Object.keys(MODEL_PRICE).length} routed` },
                  { l: "Cost per run", v: `$${(fleetCost / Math.max(1, agents.length)).toFixed(3)}`, d: `$${fleetCost.toFixed(3)} fleet` },
                  { l: "Error rate", v: `${errRate.toFixed(1)}%`, d: `${totalErr} / ${totalCalls} calls` },
                  { l: "Fleet health", v: `${avgHealth}%`, d: critical.length ? `${critical.length} critical` : "all clear" },
                ].map((m) => (
                  <div key={m.l} className="metric">
                    <div className="metric-label">{m.l}</div>
                    <div className="metric-value">{m.v}</div>
                    <div className="metric-delta">{m.d}</div>
                  </div>
                ))}
              </div>
              <div className="sec-head"><h2>Token throughput</h2><span className="meta">live · per-tick deltas</span></div>
              <div className="charts-grid">
                <div className="panel"><div className="panel-head"><h4>Tokens in — intake</h4><span>{fmtK(tokIn)} total</span></div>
                  <AreaChart data={histIn.slice(-40)} id="insIn" color="#4cc2dd" height={130} />
                </div>
                <div className="panel"><div className="panel-head"><h4>Tokens out — generation</h4><span>{fmtK(tokOut)} total</span></div>
                  <AreaChart data={histOut.slice(-40)} id="insOut" color="#6669e8" height={130} />
                </div>
              </div>
              <div className="charts-grid" style={{ marginTop: 14 }}>
                <div className="panel"><div className="panel-head"><h4>Model mix</h4><span>all runs this session</span></div>
                  <BarList rows={Object.keys(MODEL_PRICE).map((m) => {
                    const c = agents.filter((a) => a.model === m).length;
                    return { label: m, value: c, display: String(c), color: MODEL_PRICE[m as ModelKey].color };
                  }).filter((r) => r.value > 0)} />
                </div>
                <div className="panel"><div className="panel-head"><h4>Spend by model</h4><span>this session</span></div>
                  <BarList rows={Object.keys(MODEL_PRICE).map((m) => {
                    const v = agents.filter((a) => a.model === m).reduce((s, a) => s + costOf(a), 0);
                    return { label: m, value: v, display: `$${v.toFixed(3)}`, color: MODEL_PRICE[m as ModelKey].color };
                  }).filter((r) => r.value > 0)} />
                </div>
              </div>
              <div className="charts-grid" style={{ marginTop: 14 }}>
                <div className="panel"><div className="panel-head"><h4>Avg throughput by model</h4><span>running agents</span></div>
                  <BarList rows={Object.keys(MODEL_PRICE).map((m) => {
                    const list = running.filter((a) => a.model === m);
                    const v = list.length ? list.reduce((s, a) => s + (a.speedHist[a.speedHist.length - 1] || 0), 0) / list.length : 0;
                    return { label: m, value: v, display: v ? v.toFixed(0) : "—", color: "#3fb968" };
                  }).filter((r) => r.value > 0)} />
                </div>
                <div className="panel"><div className="panel-head"><h4>Errors by agent — top 6</h4><span>session totals</span></div>
                  <BarList rows={[...agents].map((a) => ({
                    label: a.name.slice(0, 18),
                    value: Object.values(a.toolErrors).reduce((s, n) => s + n, 0),
                    display: String(Object.values(a.toolErrors).reduce((s, n) => s + n, 0)),
                    color: "var(--danger)",
                  })).sort((x, y) => y.value - x.value).slice(0, 6)} />
                </div>
              </div>
              <div className="sec-head"><h2>Model scoreboard</h2><span className="meta">cost · speed · reliability</span></div>
              <div className="table-wrap"><table>
                <thead><tr><th>Model</th><th>Agents</th><th>Tokens</th><th>Cost</th><th>Avg speed</th><th>Errors</th><th>Avg health</th></tr></thead>
                <tbody>
                  {Object.keys(MODEL_PRICE).map((m) => {
                    const list = agents.filter((a) => a.model === m);
                    if (!list.length) return null;
                    const toks = list.reduce((s, a) => s + a.tokensIn + a.tokensOut, 0);
                    const cost = list.reduce((s, a) => s + costOf(a), 0);
                    const spd = list.reduce((s, a) => s + (a.speedHist[a.speedHist.length - 1] || 0), 0) / list.length;
                    const errs = list.reduce((s, a) => s + Object.values(a.toolErrors).reduce((x, n) => x + n, 0), 0);
                    const hl = Math.round(list.reduce((s, a) => s + a.health, 0) / list.length);
                    return (
                      <tr key={m} onClick={() => setPage("runs")}>
                        <td><span className="row-model">{m}</span></td>
                        <td className="mono-num">{list.length}</td>
                        <td className="mono-num">{fmtK(toks)}</td>
                        <td className="mono-num">${cost.toFixed(4)}</td>
                        <td className="mono-num">{spd.toFixed(0)} t/s</td>
                        <td><span className={`err-count ${errs ? "has" : "none"}`}>{errs || "—"}</span></td>
                        <td><Health h={hl} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
              <div className="callout">◆ <span><b>Combo insight:</b> adding <b>python-expert</b> to tester compositions cuts fixture-related failures by 11% (n=21).</span></div>
              <div className="callout">◆ <span><b>Model routing:</b> <b>claude-opus-4</b> runs cost ~5× <b>claude-sonnet-4</b> with only +9% task success — route drafts to sonnet or <b>glm-4.5</b>.</span></div>
            </div>
          </div>
        )}

        {page === "factory" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Agent factory</h1><p>Pick none, one or many specialists and skills — they merge into one named agent with your core prompt on top.</p></div></div>
            <div className="content">
              <div className="factory-grid">
                <div>
                  <div className="field"><label className="field-label">Specialists — none / one / many</label>
                    <div className="chip-row">{SPECIALISTS.map((s) => (
                      <div key={s} className={`chip${selSpecs.includes(s) ? " selected" : ""}`} onClick={() => setSelSpecs((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}>{s}</div>
                    ))}</div></div>
                  <div className="field"><label className="field-label">Skills — none / one / many</label>
                    <div className="chip-row">{SKILLS.map((s) => (
                      <div key={s} className={`chip${selSkills.includes(s) ? " selected" : ""}`} onClick={() => setSelSkills((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}>{s}</div>
                    ))}</div></div>
                  <div className="field"><label className="field-label">Agent name</label><input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Core prompt (injected as top priority)</label><textarea value={corePrompt} onChange={(e) => setCorePrompt(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Model (BYOK)</label>
                    <select value={factoryModel} onChange={(e) => setFactoryModel(e.target.value as ModelKey)}>
                      {Object.entries(MODEL_PRICE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select></div>
                  <button className="btn primary" onClick={spinUp}>Spin up agent →</button>
                </div>
                <div className="preview-panel">
                  <h4>Merged prompt preview</h4>
                  <div className="prompt-box"><span className="role">{"ROLE: " + (selSpecs.join(" + ") || "generalist")}{"\n"}{"SKILLS: " + (selSkills.join(", ") || "none")}{"\n\n"}</span><span className="task">{corePrompt}</span></div>
                  {conflicts > 0 && <div className="conflict-note show">Heads-up: scraper + playwright-testing overlap on fetch retries.</div>}
                  <div className="estimate-row">
                    <div className="estimate-box"><b>{fmtK(estTokens)}</b><span>Tokens</span></div>
                    <div className="estimate-box"><b>${estCost.toFixed(3)}</b><span>Cost</span></div>
                    <div className="estimate-box"><b>{conflicts}</b><span>Conflicts</span></div>
                  </div>
                  <div style={{ marginTop: 12 }}><button className="btn sm" onClick={() => pushToast("Saved as private template")}>Save as private template</button></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "marketplace" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Library · Marketplace</h1><p>Skills inject capabilities. Specialists inject a role. Templates bundle both — install one straight into the factory.</p></div><div className="ph-right"><button className="btn" onClick={() => { pushToast("Template submitted for review"); pushActivity("Subodh B.", "submitted a template for review"); }}>Publish template</button></div></div>
            <div className="content">
              <div className="mk-tabs">
                {(["skills", "specialists", "templates"] as const).map((t) => {
                  const n = MARKETPLACE.filter((m) => (t === "skills" ? m.kind === "skill" : t === "specialists" ? m.kind === "specialist" : m.kind === "template")).length;
                  return (
                    <div key={t} className={`mk-tab${mkTab === t ? " active" : ""}`} onClick={() => setMkTab(t)}>{t} · {n}</div>
                  );
                })}
              </div>
              <div className="mk-grid">
                {MARKETPLACE.filter((m) => (mkTab === "skills" ? m.kind === "skill" : mkTab === "specialists" ? m.kind === "specialist" : m.kind === "template")).map((m) => (
                  <div key={m.name} className="mk-card">
                    <div className="mk-name">{m.name}<span className="rating">★ {m.rating}</span></div>
                    <div className="mk-desc">{m.desc}</div>
                    <div className="mk-foot"><span>{m.installs} installs</span>
                      <button className="mk-add" onClick={() => {
                        if (m.kind === "skill") setSelSkills((s) => [...new Set([...s, m.name])]);
                        if (m.kind === "specialist") setSelSpecs((s) => [...new Set([...s, m.name])]);
                        pushToast(`Installed ${m.name} → factory`);
                      }}>Install →</button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {page === "schedules" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Schedules</h1><p>Recurring runs — nightly regressions, weekly audits, morning reports. Each run lands in History with full telemetry.</p></div><div className="ph-right"><span className="mono-num" style={{ color: "var(--text-3)" }}>{SCHEDULES.length - pausedSchedules.length} active · {pausedSchedules.length} paused</span><button className="btn primary" onClick={() => { pushToast("Schedule created — first run queued"); pushActivity("Subodh B.", "created schedule <b>custom-run</b>"); }}>New schedule</button></div></div>
            <div className="content"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Agent template</th><th>Cadence</th><th>Next run</th><th>Last result</th><th>Last 7 runs</th><th /></tr></thead><tbody>
              {SCHEDULES.map((s) => (
                <tr key={s.name}>
                  <td><b>{s.name}</b></td><td>{s.agent}</td><td className="mono-num">{s.cadence}</td><td>{pausedSchedules.includes(s.name) ? "paused" : s.next}</td><td>{s.last}</td>
                  <td><span className="run-dots">{s.ok.map((o, i) => <i key={i} style={{ background: o ? "var(--success)" : "var(--danger)" }} />)}</span></td>
                  <td><button className="btn sm" onClick={() => setPausedSchedules((p) => (p.includes(s.name) ? p.filter((x) => x !== s.name) : [...p, s.name]))}>{pausedSchedules.includes(s.name) ? "Resume" : "Pause"}</button></td>
                </tr>
              ))}
            </tbody></table></div></div>
          </div>
        )}

        {page === "team" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Team &amp; activity</h1><p>Who ran, killed or published what — a live audit trail for the workspace.</p></div><div className="ph-right"><button className="btn" onClick={() => pushToast("Invite sent")}>Invite member</button></div></div>
            <div className="content">
              <div className="charts-grid">
                <div className="panel"><div className="panel-head"><h4>Members</h4><span>4 seats</span></div>
                  {MEMBERS.map((m) => (
                    <div key={m.name} className="member-row"><div className="avatar-sm">{m.initials}</div><span className="member-name">{m.name}</span><span className="member-role">{m.role}</span></div>
                  ))}
                </div>
                <div className="panel"><div className="panel-head"><h4>Activity</h4><span>live</span></div>
                  <div className="activity-list">{activity.map((a, i) => (
                    <div key={i} className="activity-row"><span className="activity-time">{a.t}</span><span className="activity-text"><span className="who">{a.who}</span> <span dangerouslySetInnerHTML={{ __html: a.txt }} /></span></div>
                  ))}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "approvals" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Approvals</h1><p>Runs estimated above the policy threshold require Admin sign-off before a single token burns.</p></div><div className="ph-right"><span className="mono-num">threshold ${approvalThreshold.toFixed(2)}</span></div></div>
            <div className="content">
              <div className="sec-head"><h2>Pending approvals</h2><span className="meta">oldest first</span></div>
              {approvals.length === 0 && <div className="empty-state"><div className="ic">✓</div>All caught up — no pending approvals.</div>}
              {approvals.map((a) => (
                <div key={a.id} className="ap-card">
                  <div className="ap-main"><div className="ap-name">{a.name}<span className="mono-num" style={{ color: "var(--text-3)" }}>${a.estCost.toFixed(2)} est · {a.estTok}</span></div>
                    <div className="ap-meta">{a.requester} · {a.model} · {a.ts} · {a.proj}</div></div>
                  <div className="ap-actions">
                    <button className="btn primary sm" onClick={() => {
                      setApprovals((p) => p.filter((x) => x.id !== a.id));
                      setDecisions((d) => [{ t: nowHM(), who: "Subodh B.", txt: `approved <b>${a.name}</b> ($${a.estCost.toFixed(2)} est)` }, ...d]);
                      pushToast(`Approved ${a.name}`);
                    }}>Approve</button>
                    <button className="btn danger sm" onClick={() => {
                      setApprovals((p) => p.filter((x) => x.id !== a.id));
                      setDecisions((d) => [{ t: nowHM(), who: "Subodh B.", txt: `denied <b>${a.name}</b>` }, ...d]);
                    }}>Deny</button>
                  </div>
                </div>
              ))}
              <div className="sec-head"><h2>Recent decisions</h2></div>
              <div className="activity-list">{decisions.map((d, i) => (
                <div key={i} className="activity-row"><span className="activity-time">{d.t}</span><span className="activity-text"><span className="who">{d.who}</span> <span dangerouslySetInnerHTML={{ __html: d.txt }} /></span></div>
              ))}</div>
              <div className="callout">◆ <span>Policy: runs estimated above <b>${approvalThreshold.toFixed(2)}</b> require Admin approval — change it under Settings → Guardrails.</span></div>
            </div>
          </div>
        )}

        {page === "chargeback" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Chargeback &amp; budgets</h1><p>Invoice-ready spend split by project, with budget caps, variance and forecast-to-end.</p></div><div className="ph-right"><button className="btn sm" onClick={() => setReportOpen(true)}>Board report</button><button className="btn sm" onClick={exportCSV}>Export invoice CSV</button></div></div>
            <div className="content">
              <div className="panel"><div className="panel-head"><h4>Spend by project vs budget</h4><span>MTD · live</span></div>
                <BarList rows={Object.keys(PROJ_BUDGET).map((p) => {
                  const live = agents.filter((a) => a.proj === p).reduce((s, a) => s + costOf(a), 0);
                  const total = (BASE_SPENT[p] || 0) + live;
                  return { label: p, value: total, display: `$${total.toFixed(2)}/$${PROJ_BUDGET[p].toFixed(2)}`, color: total > PROJ_BUDGET[p] ? "var(--danger)" : "#6669e8" };
                })} />
              </div>
              <div className="sec-head"><h2>Invoice detail</h2><span className="meta">month-to-date</span></div>
              <div className="table-wrap"><table><thead><tr><th>Project</th><th>Runs</th><th>Tokens in</th><th>Tokens out</th><th>Cost</th><th>Budget</th><th>Variance</th></tr></thead><tbody>
                {Object.keys(PROJ_BUDGET).map((p) => {
                  const list = agents.filter((a) => a.proj === p);
                  const tin = list.reduce((s, a) => s + a.tokensIn, 0);
                  const tout = list.reduce((s, a) => s + a.tokensOut, 0);
                  const cost = (BASE_SPENT[p] || 0) + list.reduce((s, a) => s + costOf(a), 0);
                  const v = PROJ_BUDGET[p] - cost;
                  return <tr key={p}><td><b>{p}</b></td><td className="mono-num">{list.length}</td><td className="mono-num">{fmtK(tin)}</td><td className="mono-num">{fmtK(tout)}</td><td className="mono-num">${cost.toFixed(3)}</td><td className="mono-num">${PROJ_BUDGET[p].toFixed(2)}</td><td className="mono-num" style={{ color: v < 0 ? "var(--danger)" : "var(--success)" }}>{v < 0 ? "-" : "+"}${Math.abs(v).toFixed(2)}</td></tr>;
                })}
              </tbody></table></div>
              <div className="callout">◆ <span><b>Prompt caching saved an estimated $412 this month</b> (18% of repeat-context output) — enable prompt-caching skill fleet-wide to grow this.</span></div>
            </div>
          </div>
        )}

        {page === "compliance" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Compliance &amp; audit</h1><p>Controls posture, data governance and the tamper-evident audit trail for this workspace.</p></div></div>
            <div className="content">
              <div className="charts-grid">
                <div className="panel"><div className="panel-head"><h4>Framework controls</h4><span>continuous checks</span></div>
                  {[["SOC 2 · logging", "passing"], ["PII scrubber", "on"], ["SSO enforced", theme === "dark" ? "on" : "on"], ["Retention 90d", "team plan"]].map(([k, v]) => (
                    <div key={k} className="ctrl-row"><span>{k}</span><span className="ok">{v}</span></div>
                  ))}
                </div>
                <div className="panel"><div className="panel-head"><h4>Data governance</h4><span>workspace scope</span></div>
                  <div className="ctrl-row"><span>Data residency</span><span className="mono-num">us-east-1 · eu-central-1</span></div>
                  <div className="ctrl-row"><span>PII &amp; secret scrubber</span><span className="ok">on</span></div>
                  <div className="ctrl-row"><span>Retention (Team)</span><span className="mono-num">90 days</span></div>
                </div>
              </div>
              <div className="sec-head"><h2>Immutable audit log</h2><span className="meta">chain-hash · SHA-256</span></div>
              <div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Hash</th></tr></thead><tbody>
                {activity.slice(0, 8).map((a, i) => (
                  <tr key={i}><td className="mono-num">{a.t}</td><td>{a.who}</td><td><span dangerouslySetInnerHTML={{ __html: a.txt }} /></td><td className="mono-num">fleet</td><td className="hashcell">{(i * 2654435761 % 65536).toString(16).padStart(8, "0")}</td></tr>
                ))}
              </tbody></table></div>
              <div className="verify-banner show">✓ chain intact — {activity.length + 120} entries verified · 0 anomalies</div>
            </div>
          </div>
        )}

        {page === "copilot" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>Fleet Copilot</h1><p>Continuous AIOps analysis of your fleet — findings ranked by impact, each with a one-click remediation.</p></div><div className="ph-right"><span className="mono-num">scan idle</span></div></div>
            <div className="content">
              <div className="sec-head"><h2>Findings</h2><span className="meta">newest first · scan every 9s</span></div>
              {findings.map((f) => (
                <div key={f.id} className={`find-card sev-${f.sev}`}>
                  <div className="find-head"><span className="sev">{f.sev}</span><span className="find-t">{f.ev}</span></div>
                  <div className="find-title">{f.title}</div>
                  <div className="find-body">{f.body}</div>
                  <div className="find-actions">
                    {f.agentId && <button className="btn sm" onClick={() => revive(f.agentId!)}>Restart agent</button>}
                    <button className="btn sm" onClick={() => setFindings((x) => x.filter((y) => y.id !== f.id))}>Dismiss</button>
                  </div>
                </div>
              ))}
              {findings.length === 0 && <div className="empty-state">No findings — fleet healthy.</div>}
              <div className="callout">◆ <span>Remediations run through the same guardrails as humans — Copilot never spends tokens on its own.</span></div>
            </div>
          </div>
        )}

        {page === "slas" && (
          <div className="page active">
            <div className="page-header"><div className="ph-left"><h1>SLAs &amp; error budgets</h1><p>Success-rate targets per agent class with live burn-down — page on-call before the budget is gone.</p></div><div className="ph-right"><span className="mono-num">window: 30d rolling</span></div></div>
            <div className="content">
              <div className="table-wrap"><table><thead><tr><th>Service / Agent</th><th>Target</th><th>Success rate</th><th>Error budget</th><th>Burn</th><th>Status</th></tr></thead><tbody>
                {agents.slice(0, 8).map((a) => {
                  const target = a.tags.includes("security") ? 99.5 : 98;
                  const sr = Math.min(100, a.health + rand(-1, 1));
                  const remaining = Math.max(4, Math.round((sr - (100 - (100 - target) * 4)) * 8));
                  return <tr key={a.id}><td><b>{a.name}</b><div className="tag">{a.tags[0]}</div></td><td className="mono-num">{target}%</td><td className="mono-num">{sr.toFixed(1)}%</td><td className="mono-num">{remaining}% left</td><td>{remaining < 25 ? <span className="slo-burn">fast burn</span> : <span className="mono-num">normal</span>}</td><td>{sr >= target ? "healthy" : "at risk"}</td></tr>;
                })}
              </tbody></table></div>
              <div className="callout">◆ <span>Error budget = allowed failures at target × tool-call volume. At <b>&lt;25% remaining</b> the on-call rotation is paged via PagerDuty.</span></div>
            </div>
          </div>
        )}
        <div className="app-footer">Built in California by Subodh</div>
      </div>

      {/* agent drawer */}
      <div className={`scrim${drawer ? " open" : ""}`} onClick={() => setDrawerId(null)} />
      <div className={`drawer${drawer ? " open" : ""}`}>
        {drawer && (
          <>
            <div className="drawer-head"><div><h3>{drawer.name}</h3><span className={`status ${drawer.status}`}><i />{drawer.status} · <span className="row-model">{drawer.model}</span></span></div><button className="drawer-close" onClick={() => setDrawerId(null)}>✕</button></div>
            <div className="drawer-body">
              <div className="stat-grid">
                <div><div className="l">Cost</div><div className="v">${costOf(drawer).toFixed(4)}</div></div>
                <div><div className="l">Health</div><div className="v">{drawer.health}%</div></div>
                <div><div className="l">Time</div><div className="v">{fmtTime(drawer.elapsed)}</div></div>
              </div>
              <div className="drawer-sub">Context budget</div>
              <BarList rows={[
                { label: "core", value: drawer.context.core, display: `${drawer.context.core.toFixed(0)}%`, color: "#6669e8" },
                { label: "skills", value: drawer.context.skills, display: `${drawer.context.skills.toFixed(0)}%`, color: "#4cc2dd" },
                { label: "history", value: drawer.context.history, display: `${drawer.context.history.toFixed(0)}%`, color: "#c97fd6" },
              ]} />
              <div className="drawer-sub" style={{ marginTop: 14 }}>Tool call waterfall</div>
              {drawer.waterfall.map((w, i) => (
                <div key={i} className="wf-row"><span className="wf-tool">{w.tool}</span><span className="wf-track"><span className={`wf-bar${w.err ? " err" : ""}`} style={{ width: `${Math.min(100, w.dur)}%` }} /></span><span className="wf-dur">{w.dur.toFixed(0)}ms</span></div>
              ))}
              <div className="drawer-sub" style={{ marginTop: 14 }}>Log tail</div>
              <div className="log-box">
                <div>[{nowHM()}] agent={drawer.name} model={drawer.model}</div>
                <div>tokens in={Math.round(drawer.tokensIn)} out={Math.round(drawer.tokensOut)}</div>
                {drawer.lastError ? <div className="log-line err">{drawer.lastError}</div> : <div>no errors — nominal</div>}
              </div>
            </div>
            <div className="drawer-actions">
              <button className="btn sm" onClick={() => { revive(drawer.id); }}>Restart</button>
              <button className="btn sm" onClick={() => { setPage("factory"); setDrawerId(null); }}>Fork → Factory</button>
              <button className="btn danger sm" onClick={() => { kill(drawer.id); setDrawerId(null); }}>Kill</button>
            </div>
          </>
        )}
      </div>

      {/* settings drawer */}
      <div className={`scrim${settingsOpen ? " open" : ""}`} onClick={() => setSettingsOpen(false)} />
      <div className={`drawer${settingsOpen ? " open" : ""}`}>
        <div className="drawer-head"><div><h3>Settings</h3><span style={{ color: "var(--text-3)", fontSize: 12 }}>Guardrails · API · integrations</span></div><button className="drawer-close" onClick={() => setSettingsOpen(false)}>✕</button></div>
        <div className="drawer-body">
          <div className="drawer-sub">Guardrails</div>
          <div className="ctrl-row"><span>Session budget cap ($)</span><input type="text" value={capDollars} onChange={(e) => setCapDollars(Number(e.target.value) || 0)} style={{ width: 90 }} /></div>
          <div className="ctrl-row"><span>Max concurrency — {maxCon} agents</span><input type="range" min={1} max={10} value={maxCon} onChange={(e) => setMaxCon(Number(e.target.value))} style={{ width: 140 }} /></div>
          <div className="ctrl-row"><span>Approval threshold — runs above this go to Approvals</span><input type="text" value={approvalThreshold} onChange={(e) => setApprovalThreshold(Number(e.target.value) || 0)} style={{ width: 90 }} /></div>
          <div className="drawer-sub" style={{ marginTop: 14 }}>API &amp; CLI</div>
          <div className="token-row"><div><div className="token-name">ci-pipeline</div><div className="token-meta">created Aug 12 · last used 2h ago</div></div><button className="btn sm">Revoke</button></div>
          <div className="token-row"><div><div className="token-name">local-dev</div><div className="token-meta">created Jul 30 · last used 5d ago</div></div><button className="btn sm">Revoke</button></div>
          <div style={{ marginTop: 10 }}><button className="btn sm primary" onClick={() => pushToast("Token generated")}>Generate new token</button></div>
          <div className="drawer-sub" style={{ marginTop: 16 }}>Chaos drills</div>
          <div className="ctrl-row"><span>Run a controlled fault drill on a random live agent</span><button className="btn danger sm" onClick={() => { injectFault(); }}>Run drill</button></div>
        </div>
      </div>

      {/* triage modal */}
      {triageOpen && (() => {
        const sorted = critical.slice().sort((a, b) => a.health - b.health);
        const worst = sorted[0];
        const projects = [...new Set(sorted.map((a) => a.proj))];
        return (
          <div className="rep-scrim open" onClick={() => setTriageOpen(false)}>
            <div className="rep-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rep-head">
                <div>
                  <h3>Incident triage</h3>
                  <div className="mono-num" style={{ color: "var(--text-3)" }}>
                    {sorted.length === 0
                      ? "no open incidents"
                      : `${sorted.length >= 2 ? "SEV-2" : "SEV-3"} · opened ${nowHM()} · health gate <55% · ${projects.join(" · ")}`}
                  </div>
                </div>
                <button className="drawer-close" onClick={() => setTriageOpen(false)}>✕</button>
              </div>
              <div className="rep-body">
                {sorted.length === 0 && <div>incident resolved ✓</div>}
                {sorted.length > 0 && worst && (
                  <div className="rep-sum">
                    <b>{sorted.length} agent{sorted.length > 1 ? "s" : ""}</b> below the 55% health gate.
                    Worst: <b>{worst.name}</b> at <b>{worst.health}%</b> ({worst.model}) — {worst.lastError || "elevated tool errors"}.
                    Blast radius: <b>{projects.join(", ")}</b>.
                  </div>
                )}
                {sorted.map((a) => {
                  const errs = Object.values(a.toolErrors).reduce((s, n) => s + n, 0);
                  return (
                    <div key={a.id} className="ap-card" style={{ borderLeftColor: "var(--danger)" }}>
                      <div className="ap-main">
                        <div className="ap-name">{a.name}<span className="mono-num" style={{ color: "var(--danger)" }}>{a.health}% health</span></div>
                        <div className="ap-meta">{a.model} · {a.proj} · {errs}/{a.toolCalls} errors · {fmtTime(a.elapsed)}/{fmtTime(a.estSeconds)} · ${costOf(a).toFixed(4)}</div>
                        <div className="ap-meta" style={{ color: "var(--text-2)" }}>{a.lastError || "degraded — no single fatal error"}</div>
                        <div style={{ marginTop: 8 }}><Health h={a.health} /></div>
                      </div>
                      <div className="ap-actions">
                        <button className="btn sm" onClick={() => { setTriageOpen(false); setDrawerId(a.id); }}>Inspect</button>
                        <button className="btn sm" onClick={() => revive(a.id)}>Restart</button>
                        <button className="btn danger sm" onClick={() => kill(a.id)}>Kill</button>
                      </div>
                    </div>
                  );
                })}
                {sorted.length > 0 && (
                  <div className="callout">◆ <span>Restart preserves run history and re-queues the agent. The incident auto-resolves when every live agent recovers above 55%.</span></div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* board report modal */}
      {reportOpen && (
        <div className="rep-scrim open" onClick={() => setReportOpen(false)}>
          <div className="rep-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rep-head"><div><h3>Weekly fleet report</h3><div className="mono-num" style={{ color: "var(--text-3)" }}>{new Date().toDateString()} · {running.length} running</div></div><button className="drawer-close" onClick={() => setReportOpen(false)}>✕</button></div>
            <div className="rep-body"><div className="rep-sum">Fleet cost <b>${fleetCost.toFixed(3)}</b> · avg health <b>{avgHealth}%</b> · error rate <b>{errRate.toFixed(1)}%</b> · throughput <b>{avgSpd.toFixed(0)} tok/s</b>. Top spend: <b>{[...agents].sort((a, b) => costOf(b) - costOf(a))[0]?.name}</b>.</div>
              <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(`Fleet cost $${fleetCost.toFixed(3)}, health ${avgHealth}%`); pushToast("Report copied"); }}>Copy markdown</button>
            </div>
          </div>
        </div>
      )}

      {/* palette */}
      <div className={`palette-scrim${paletteOpen ? " open" : ""}`} onClick={() => setPaletteOpen(false)}>
        <div className="palette" onClick={(e) => e.stopPropagation()}>
          <div className="palette-input"><span>⌕</span><input autoFocus={paletteOpen} placeholder="Search or jump to…" value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} /></div>
          <div className="palette-list">
            <div className="palette-group-label">Commands</div>
            {paletteItems.map((c, i) => (
              <div key={i} className="palette-item" onClick={c.run}><span className="ic">→</span>{c.label}<span className="k">{c.group}</span></div>
            ))}
            {paletteItems.length === 0 && <div className="palette-item">No matches</div>}
          </div>
        </div>
      </div>

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
