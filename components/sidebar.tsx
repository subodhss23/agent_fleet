"use client";
import type { ReactElement } from "react";

export type PageKey =
  | "dashboard"
  | "graph"
  | "runs"
  | "alerts"
  | "notifications"
  | "insights"
  | "copilot"
  | "slas"
  | "factory"
  | "marketplace"
  | "schedules"
  | "team"
  | "approvals"
  | "chargeback"
  | "compliance";

const ICONS: Record<string, ReactElement> = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 10.5v6M10 3.5v13M17 7v9.5" strokeLinecap="round" /></svg>
  ),
  graph: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="4" cy="10" r="2" /><circle cx="10" cy="4.5" r="2" /><circle cx="10" cy="15.5" r="2" /><circle cx="16" cy="10" r="2" /><path d="M5.8 9l2.4-3M5.8 11l2.4 3M11.5 5.5l2.6 3M11.5 14.5l2.6-3" /></svg>
  ),
  runs: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 5.5h14M3 10h14M3 14.5h9" strokeLinecap="round" /></svg>
  ),
  alerts: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 3C7 3 6 5.4 6 7.6c0 3.4-1.4 4.3-1.4 5h10.8c0-.7-1.4-1.6-1.4-5C14 5.4 13 3 10 3z" /><path d="M8.2 15.5a1.9 1.9 0 003.6 0" strokeLinecap="round" /></svg>
  ),
  notifications: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4.5" width="14" height="10.5" rx="2" /><path d="M3.5 6l6.5 4.5L16.5 6" /></svg>
  ),
  insights: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2.5 13.5l4-4.5 3.5 3 4-6 3.5 3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  copilot: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2.5l1.7 4.3 4.3 1.7-4.3 1.7L10 14.5l-1.7-4.3L4 8.5l4.3-1.7z" strokeLinejoin="round" /><path d="M15.5 13.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></svg>
  ),
  slas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="2.8" /></svg>
  ),
  factory: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 16.5V11l5-5 3.5 3.5-5 5H3z" strokeLinejoin="round" /><path d="M11 7.5L14.5 4l3 3-3.5 3.5" /></svg>
  ),
  marketplace: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="6" width="15" height="10.5" rx="1.5" /><path d="M2.5 9.5h15M6.5 6V3.5M13.5 6V3.5" /></svg>
  ),
  schedules: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10.5" r="7" /><path d="M10 6.5v4l3 1.8" strokeLinecap="round" /></svg>
  ),
  team: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="2.6" /><circle cx="13.8" cy="8" r="2.1" /><path d="M2.8 16c.5-2.7 2.4-4.2 4.4-4.2s4 1.5 4.5 4.2M12 12.4c1.9.2 3.4 1.5 3.7 3.4" strokeLinecap="round" /></svg>
  ),
  approvals: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3.5 10.5l4 4L16.5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  chargeback: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" /><path d="M2.5 8h15M6 12.5h4" strokeLinecap="round" /></svg>
  ),
  compliance: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2.5l6 2.4v4.6c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V4.9z" strokeLinejoin="round" /><path d="M7.2 10l1.9 1.9 3.8-3.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
};

const SECTIONS: { label: string; items: { key: PageKey; label: string }[] }[] = [
  { label: "Observe", items: [
    { key: "dashboard", label: "Home" },
    { key: "graph", label: "Flows" },
    { key: "runs", label: "Runs" },
    { key: "alerts", label: "Alerts" },
    { key: "notifications", label: "Inbox" },
    { key: "insights", label: "Insights" },
    { key: "copilot", label: "Copilot" },
    { key: "slas", label: "SLAs" },
  ]},
  { label: "Build", items: [
    { key: "factory", label: "Factory" },
    { key: "marketplace", label: "Library" },
    { key: "schedules", label: "Crons" },
  ]},
  { label: "Org", items: [{ key: "team", label: "Team" }] },
  { label: "Gov", items: [
    { key: "approvals", label: "Approvals" },
    { key: "chargeback", label: "Billing" },
    { key: "compliance", label: "Audit" },
  ]},
];

export function Sidebar({
  page, go, runCount, alertCount, notifCount, approvalCount, copilotCount,
  onSettings, mobileOpen, closeMobile,
}: {
  page: PageKey;
  go: (p: PageKey) => void;
  runCount: number; alertCount: number; notifCount: number; approvalCount: number; copilotCount: number;
  onSettings: () => void; mobileOpen: boolean; closeMobile: () => void;
}) {
  const badgeFor = (key: PageKey): string | undefined => {
    if (key === "dashboard") return String(runCount);
    if (key === "alerts") return String(alertCount);
    if (key === "notifications") return notifCount ? String(notifCount) : undefined;
    if (key === "approvals") return approvalsSafe(approvalCount);
    if (key === "copilot") return String(copilotCount);
    return undefined;
  };
  return (
    <div className={`sidebar${mobileOpen ? " open" : ""}`}>
      <div className="sb-top">
        <div className="sb-logo" title="Home" style={{ cursor: "pointer" }} onClick={() => { go("dashboard"); closeMobile(); }}><div className="sb-mark" /></div>
      </div>
      <nav className="sb-nav">
        {SECTIONS.map((s) => (
          <div key={s.label}>
            <div className="sb-section-label">{s.label}</div>
            {s.items.map((it) => (
              <div
                key={it.key}
                title={it.label}
                className={`nav-item${page === it.key ? " active" : ""}${it.key === "dashboard" ? " live" : ""}`}
                onClick={() => { go(it.key); closeMobile(); }}
              >
                {ICONS[it.key]}
                <span>{it.label}</span>
                {badgeFor(it.key) !== undefined && <span className="badge">{badgeFor(it.key)}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-bottom">
        <div className="nav-item" title="Settings & API" onClick={() => { onSettings(); closeMobile(); }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="2.4" /><path d="M10 2.5v2.2M10 15.3v2.2M17.5 10h-2.2M4.7 10H2.5M15.4 4.6l-1.6 1.6M6.2 13.8l-1.6 1.6M15.4 15.4l-1.6-1.6M6.2 6.2L4.6 4.6" strokeLinecap="round" /></svg>
          <span>Setup</span>
        </div>
      </div>
    </div>
  );
}

function approvalsSafe(n: number) {
  return n ? String(n) : undefined;
}
