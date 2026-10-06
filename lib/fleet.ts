export type AgentStatus = "running" | "queued" | "success" | "failed" | "cancelled";

export type ModelKey =
  | "muse-spark-1.2"
  | "ox-alpha-free"
  | "gpt-4o"
  | "gpt-4.1"
  | "o3"
  | "o4-mini"
  | "gpt-5"
  | "claude-opus-4"
  | "claude-opus-4-1"
  | "claude-sonnet-4"
  | "claude-haiku-4"
  | "glm-4.5"
  | "glm-4.6"
  | "gemini-2.5-pro"
  | "deepseek-r1";

export const MODEL_PRICE: Record<ModelKey, { label: string; inn: number; out: number; color: string }> = {
  "muse-spark-1.2": { label: "muse-spark-1.2 · $1.25 / $4.25 per 1M", inn: 1.25, out: 4.25, color: "#6669e8" },
  "ox-alpha-free": { label: "ox-alpha-free · contributor-free", inn: 0, out: 0, color: "#3fb968" },
  "gpt-4o": { label: "gpt-4o · $2.50 / $10.00 per 1M", inn: 2.5, out: 10, color: "#d3a441" },
  "gpt-4.1": { label: "gpt-4.1 · $2.00 / $8.00 per 1M", inn: 2, out: 8, color: "#e0b15c" },
  o3: { label: "o3 · $2.00 / $8.00 per 1M", inn: 2, out: 8, color: "#f0883e" },
  "o4-mini": { label: "o4-mini · $1.10 / $4.40 per 1M", inn: 1.1, out: 4.4, color: "#ff9d5c" },
  "gpt-5": { label: "gpt-5 · $5.00 / $20.00 per 1M", inn: 5, out: 20, color: "#f5b14c" },
  "claude-opus-4": { label: "claude-opus-4 · $15.00 / $75.00 per 1M", inn: 15, out: 75, color: "#ef6d68" },
  "claude-opus-4-1": { label: "claude-opus-4-1 · $18.00 / $90.00 per 1M", inn: 18, out: 90, color: "#ff7a6e" },
  "claude-sonnet-4": { label: "claude-sonnet-4 · $3.00 / $15.00 per 1M", inn: 3, out: 15, color: "#c97fd6" },
  "claude-haiku-4": { label: "claude-haiku-4 · $0.80 / $3.20 per 1M", inn: 0.8, out: 3.2, color: "#d69af0" },
  "glm-4.5": { label: "glm-4.5 · $0.60 / $2.20 per 1M", inn: 0.6, out: 2.2, color: "#4cc2dd" },
  "glm-4.6": { label: "glm-4.6 · $0.90 / $3.20 per 1M", inn: 0.9, out: 3.2, color: "#57b8ff" },
  "gemini-2.5-pro": { label: "gemini-2.5-pro · $2.50 / $12.00 per 1M", inn: 2.5, out: 12, color: "#6aa8ff" },
  "deepseek-r1": { label: "deepseek-r1 · $0.90 / $3.50 per 1M", inn: 0.9, out: 3.5, color: "#37d0a6" },
};

export interface WaterfallStep {
  tool: string;
  dur: number;
  err?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  tags: string[];
  model: ModelKey;
  status: AgentStatus;
  elapsed: number;
  estSeconds: number;
  tokensIn: number;
  tokensOut: number;
  speedHist: number[];
  inHist: number[];
  outHist: number[];
  toolCalls: number;
  toolErrors: Record<string, number>;
  retries: number;
  health: number;
  lastError: string;
  proj: string;
  context: { core: number; skills: number; history: number; tools: number };
  waterfall: WaterfallStep[];
}

export const TOOLS = ["playwright", "read_file", "write_file", "bash", "http_fetch"];

export function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function fmtK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export function costOf(a: Pick<Agent, "tokensIn" | "tokensOut" | "model">) {
  const p = MODEL_PRICE[a.model];
  return (a.tokensIn / 1_000_000) * p.inn + (a.tokensOut / 1_000_000) * p.out;
}

export function healthColor(h: number) {
  if (h >= 80) return "var(--success)";
  if (h >= 55) return "var(--warning)";
  return "var(--danger)";
}

function baseWaterfall(): WaterfallStep[] {
  return [
    { tool: "read_file", dur: rand(8, 30) },
    { tool: "playwright", dur: rand(20, 80) },
    { tool: "bash", dur: rand(5, 25) },
    { tool: "http_fetch", dur: rand(10, 50) },
    { tool: "write_file", dur: rand(5, 20) },
  ];
}

export function makeAgent(
  id: string,
  name: string,
  tags: string[],
  model: ModelKey,
  estSeconds: number,
  seedHealth: number,
  status: AgentStatus = "running",
  elapsed = 0
): Agent {
  const speed = rand(28, 52);
  return {
    id,
    name,
    tags,
    model,
    status,
    elapsed: elapsed || rand(20, estSeconds * 0.4),
    estSeconds,
    tokensIn: rand(800, 5200),
    tokensOut: rand(300, 2200),
    speedHist: Array.from({ length: 12 }, () => rand(28, 52)),
    inHist: Array.from({ length: 12 }, () => rand(30, 80)),
    outHist: Array.from({ length: 12 }, () => rand(20, 60)),
    toolCalls: Math.floor(rand(6, 30)),
    toolErrors: {},
    retries: Math.floor(rand(0, 3)),
    health: seedHealth,
    lastError: "",
    proj: "Unassigned",
    context: {
      core: rand(18, 30),
      skills: rand(8, 18),
      history: rand(20, 40),
      tools: rand(5, 12),
    },
    waterfall: baseWaterfall(),
  };
}

export function seedAgents(): Agent[] {
  const agents: Agent[] = [
    makeAgent("a1", "Checkout-Tester-01", ["tester", "python"], "muse-spark-1.2", 720, 92),
    makeAgent("a2", "Pricing-Researcher", ["researcher"], "ox-alpha-free", 480, 97),
    makeAgent("a3", "Docs-Sync-04", ["docs"], "muse-spark-1.2", 300, 100, "success"),
    makeAgent("a4", "Auth-Coder-Next", ["nextjs", "coder"], "claude-sonnet-4", 900, 78),
    makeAgent("a5", "Scraper-Stealth-11", ["scraper", "python"], "ox-alpha-free", 600, 61),
    makeAgent("a6", "Security-Audit-02", ["security"], "glm-4.6", 540, 88),
    makeAgent("a7", "Nightly-Regress-0825", ["tester"], "muse-spark-1.2", 210, 44, "failed"),
    makeAgent("a8", "Data-Digest-Mon", ["analyst"], "gpt-4o", 420, 93),
    makeAgent("a9", "Legal-Brief-Draft", ["researcher", "docs"], "claude-opus-4", 640, 96, "success", 512),
    makeAgent("a10", "Infra-Cost-Auditor", ["analyst", "python"], "o3", 760, 81),
    makeAgent("a11", "Embed-Backfill-07", ["analyst"], "gpt-4.1", 420, 94, "queued"),
    makeAgent("a12", "Threat-Hunt-02", ["security"], "glm-4.5", 540, 77),
    makeAgent("a13", "Reason-Planner-XL", ["reasoning", "planner"], "gpt-5", 840, 95),
    makeAgent("a14", "Vision-QA-Bot", ["tester", "vision"], "gemini-2.5-pro", 620, 89),
    makeAgent("a15", "Legal-Redline-v2", ["legal", "docs"], "claude-opus-4-1", 720, 91),
    makeAgent("a16", "Fast-Triage-Haiku", ["analyst", "triage"], "claude-haiku-4", 300, 98, "queued"),
    makeAgent("a17", "Math-Proof-R1", ["researcher", "python"], "deepseek-r1", 560, 87),
    makeAgent("a18", "Cheap-Retry-Mini", ["coder", "nextjs"], "o4-mini", 480, 83),
  ];
  const projs = [
    "Acme Corp",
    "Internal R&D",
    "Acme Corp",
    "Globex Ltd",
    "Platform",
    "Internal R&D",
    "Acme Corp",
    "Platform",
    "Globex Ltd",
    "Acme Corp",
    "Globex Ltd",
    "Internal R&D",
    "Acme Corp",
    "Platform",
    "Globex Ltd",
    "Internal R&D",
    "Acme Corp",
    "Globex Ltd",
  ];
  agents.forEach((a, i) => {
    a.proj = projs[i] || "Unassigned";
  });
  agents[3].toolErrors = { playwright: 3 };
  agents[3].lastError = "playwright: timeout at checkout.spec.ts:42";
  agents[4].toolErrors = { http_fetch: 5, bash: 2 };
  agents[4].lastError = "http_fetch: 403 waf_signal on target host";
  agents[0].toolErrors = { playwright: 2 };
  agents[6].lastError = "playwright: timeout at regress/auth.spec.ts:11";
  agents[6].toolErrors = { playwright: 4 };
  agents[8].toolErrors = { write_file: 1 };
  agents[9].toolErrors = { bash: 3 };
  agents[9].lastError = "bash: ECONNRESET on retry";
  agents[10].lastError = "http_fetch: timeout after 30s";
  agents[10].toolErrors = { http_fetch: 2 };
  return agents;
}

export function stepAgent(a: Agent): { agent: Agent; finished: "success" | "failed" | null; errored: boolean } {
  if (a.status !== "running") return { agent: a, finished: null, errored: false };
  const next: Agent = { ...a, toolErrors: { ...a.toolErrors }, waterfall: a.waterfall.map((w) => ({ ...w })) };
  next.elapsed += 1.4;
  const lastSpd = next.speedHist[next.speedHist.length - 1] ?? 40;
  const speed = Math.max(4, lastSpd + rand(-6, 6));
  next.speedHist = [...next.speedHist, speed].slice(-12);
  const outDelta = speed * 1.4;
  const inDelta = outDelta * rand(0.6, 1.3);
  next.tokensOut += outDelta;
  next.tokensIn += inDelta;
  next.inHist = [...next.inHist, inDelta].slice(-12);
  next.outHist = [...next.outHist, outDelta].slice(-12);

  let errored = false;
  if (Math.random() < 0.35) {
    next.toolCalls += 1;
    const isScr = next.tags.includes("scraper");
    const isNx = next.tags.includes("nextjs");
    const errChance = isScr ? 0.22 : isNx ? 0.16 : 0.05;
    if (Math.random() < errChance) {
      const tool = isScr && Math.random() < 0.6 ? "http_fetch" : TOOLS[Math.floor(Math.random() * TOOLS.length)];
      next.toolErrors[tool] = (next.toolErrors[tool] || 0) + 1;
      const msgs: Record<string, string> = {
        playwright: "playwright: timeout at checkout.spec.ts:42",
        http_fetch: "http_fetch: 403 waf_signal on target host",
        bash: "bash: ECONNRESET on retry",
        read_file: "read_file: ENOENT missing fixture",
        write_file: "write_file: EACCES cache dir",
      };
      next.lastError = msgs[tool] || `${tool}: error`;
      errored = true;
    }
  }
  const totalErr = Object.values(next.toolErrors).reduce((s, n) => s + n, 0);
  next.health = Math.max(20, Math.round(100 - (totalErr / Math.max(1, next.toolCalls)) * 100));
  next.context = {
    core: Math.min(44, next.context.core + rand(0, 0.4)),
    skills: next.context.skills,
    history: Math.min(42, next.context.history + rand(0, 0.5)),
    tools: next.context.tools,
  };

  let finished: "success" | "failed" | null = null;
  if (next.elapsed >= next.estSeconds) {
    if (next.health < 60 || Math.random() < 0.12) {
      next.status = "failed";
      finished = "failed";
      if (!next.lastError) next.lastError = "agent failed health gate";
    } else {
      next.status = "success";
      finished = "success";
    }
  }
  return { agent: next, finished, errored };
}

export const PROJ_BUDGET: Record<string, number> = {
  "Acme Corp": 1.2,
  "Internal R&D": 0.8,
  "Globex Ltd": 0.6,
  Platform: 0.4,
  "New Business": 0.25,
  Unassigned: 0.2,
};

export const BASE_SPENT: Record<string, number> = {
  "Acme Corp": 0.42,
  "Internal R&D": 0.31,
  "Globex Ltd": 0.22,
  Platform: 0.15,
  "New Business": 0,
  Unassigned: 0,
};

export interface TaskStage {
  stage: string;
  label: string;
  x: number;
  y: number;
  agentId: string;
}

export interface FleetTask {
  id: string;
  name: string;
  project: string;
  stages: TaskStage[];
  edges: [number, number][];
  handoffs: Record<string, { artifact: string; size: string; ago: string }>;
}

export const TASKS: FleetTask[] = [
  {
    id: "t1",
    name: "Checkout regression",
    project: "Acme Corp",
    stages: [
      { stage: "plan", label: "Planner", x: 60, y: 160, agentId: "a1" },
      { stage: "build", label: "Coder", x: 300, y: 80, agentId: "a4" },
      { stage: "test", label: "Tester", x: 300, y: 240, agentId: "a1" },
      { stage: "review", label: "Reviewer", x: 560, y: 160, agentId: "a6" },
      { stage: "ship", label: "Ship", x: 780, y: 160, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ],
    handoffs: {
      "0-1": { artifact: "plan.md + acceptance criteria", size: "12kb", ago: "2m" },
      "0-2": { artifact: "test matrix (34 cases)", size: "8kb", ago: "2m" },
      "1-3": { artifact: "diff + fixtures", size: "48kb", ago: "1m" },
      "2-3": { artifact: "playwright report", size: "22kb", ago: "44s" },
      "3-4": { artifact: "signed release notes", size: "6kb", ago: "12s" },
    },
  },
  {
    id: "t2",
    name: "Pricing scrape",
    project: "Globex Ltd",
    stages: [
      { stage: "discover", label: "Scout", x: 60, y: 160, agentId: "a2" },
      { stage: "fetch", label: "Scraper", x: 320, y: 160, agentId: "a5" },
      { stage: "normalize", label: "Analyst", x: 580, y: 160, agentId: "a10" },
      { stage: "report", label: "Digest", x: 800, y: 160, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
    handoffs: {
      "0-1": { artifact: "target list (128 urls)", size: "18kb", ago: "5m" },
      "1-2": { artifact: "raw html snapshot", size: "2.1mb", ago: "3m" },
      "2-3": { artifact: "pricing delta csv", size: "44kb", ago: "1m" },
    },
  },
  {
    id: "t3",
    name: "Docs migration",
    project: "Internal R&D",
    stages: [
      { stage: "audit", label: "Auditor", x: 60, y: 160, agentId: "a3" },
      { stage: "draft", label: "Drafter", x: 330, y: 90, agentId: "a9" },
      { stage: "verify", label: "Verifier", x: 330, y: 240, agentId: "a6" },
      { stage: "publish", label: "Publisher", x: 620, y: 160, agentId: "a3" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
    handoffs: {
      "0-1": { artifact: "stale pages index", size: "9kb", ago: "9m" },
      "1-3": { artifact: "rewritten mdx bundle", size: "310kb", ago: "4m" },
      "2-3": { artifact: "link check report", size: "14kb", ago: "2m" },
    },
  },
  {
    id: "t4",
    name: "Incident response swarm",
    project: "Platform",
    stages: [
      { stage: "triage", label: "Triage", x: 70, y: 160, agentId: "a16" },
      { stage: "forensics", label: "Forensics", x: 260, y: 60, agentId: "a12" },
      { stage: "repro", label: "Repro", x: 260, y: 260, agentId: "a1" },
      { stage: "mitigate", label: "Mitigate", x: 470, y: 100, agentId: "a4" },
      { stage: "patch-verify", label: "Patch-verify", x: 470, y: 235, agentId: "a14" },
      { stage: "postmortem", label: "Postmortem", x: 690, y: 80, agentId: "a9" },
      { stage: "broadcast", label: "Broadcast", x: 690, y: 240, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
    handoffs: {
      "0-1": { artifact: "sev1 ticket + blast radius", size: "6kb", ago: "1m" },
      "0-2": { artifact: "repro script + trace id", size: "18kb", ago: "1m" },
      "1-3": { artifact: "forensic timeline json", size: "210kb", ago: "40s" },
      "2-3": { artifact: "failing canary diff", size: "64kb", ago: "38s" },
      "3-4": { artifact: "hotfix branch + flag", size: "92kb", ago: "22s" },
      "3-5": { artifact: "mitigation notes draft", size: "11kb", ago: "20s" },
      "4-6": { artifact: "verified patch attestation", size: "4kb", ago: "9s" },
      "5-6": { artifact: "postmortem v0 + owners", size: "16kb", ago: "7s" },
    },
  },
  {
    id: "t5",
    name: "Legal redline mesh",
    project: "Globex Ltd",
    stages: [
      { stage: "intake", label: "Intake", x: 70, y: 160, agentId: "a15" },
      { stage: "clause-extract", label: "Clause-extract", x: 270, y: 70, agentId: "a9" },
      { stage: "risk-score", label: "Risk-score", x: 270, y: 250, agentId: "a6" },
      { stage: "redline-draft", label: "Redline-draft", x: 500, y: 160, agentId: "a15" },
      { stage: "counsel-review", label: "Counsel-review", x: 710, y: 70, agentId: "a9" },
      { stage: "file-notify", label: "File+notify", x: 710, y: 250, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 5],
    ],
    handoffs: {
      "0-1": { artifact: "msa v8 + order form pdf", size: "1.2mb", ago: "6m" },
      "0-2": { artifact: "counterparty risk sheet", size: "88kb", ago: "6m" },
      "1-3": { artifact: "clause map (46 clauses)", size: "132kb", ago: "3m" },
      "2-3": { artifact: "risk scores + citations", size: "54kb", ago: "3m" },
      "3-4": { artifact: "redline docx + comments", size: "640kb", ago: "1m" },
      "3-5": { artifact: "filing packet draft", size: "210kb", ago: "50s" },
      "4-5": { artifact: "counsel sign-off memo", size: "9kb", ago: "18s" },
    },
  },
  {
    id: "t6",
    name: "Deep research fan-out",
    project: "Internal R&D",
    stages: [
      { stage: "planner", label: "Planner", x: 70, y: 160, agentId: "a13" },
      { stage: "web-scout", label: "Web-scout", x: 250, y: 50, agentId: "a2" },
      { stage: "paper-hunt", label: "Paper-hunt", x: 250, y: 155, agentId: "a17" },
      { stage: "data-pull", label: "Data-pull", x: 250, y: 265, agentId: "a5" },
      { stage: "synthesize", label: "Synthesize", x: 480, y: 115, agentId: "a10" },
      { stage: "fact-check", label: "Fact-check", x: 480, y: 245, agentId: "a6" },
      { stage: "brief-draft", label: "Brief-draft", x: 700, y: 115, agentId: "a9" },
      { stage: "digest-ship", label: "Digest-ship", x: 700, y: 245, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 5],
      [4, 6],
      [5, 7],
      [6, 7],
    ],
    handoffs: {
      "0-1": { artifact: "research plan + queries", size: "14kb", ago: "8m" },
      "0-2": { artifact: "arxiv shortlist (32)", size: "22kb", ago: "8m" },
      "0-3": { artifact: "dataset manifests", size: "41kb", ago: "8m" },
      "1-4": { artifact: "web notes (128 pages)", size: "890kb", ago: "5m" },
      "2-4": { artifact: "proof sketches + lemmas", size: "310kb", ago: "4m" },
      "3-4": { artifact: "clean parquet snapshot", size: "4.2mb", ago: "4m" },
      "4-5": { artifact: "synthesis memo v1", size: "96kb", ago: "2m" },
      "4-6": { artifact: "exec brief draft", size: "48kb", ago: "2m" },
      "5-7": { artifact: "citation audit pass", size: "18kb", ago: "40s" },
      "6-7": { artifact: "final brief pdf", size: "1.1mb", ago: "30s" },
    },
  },
  {
    id: "t7",
    name: "Release train canary",
    project: "Acme Corp",
    stages: [
      { stage: "build", label: "Build", x: 70, y: 160, agentId: "a4" },
      { stage: "unit-gate", label: "Unit-gate", x: 250, y: 75, agentId: "a1" },
      { stage: "e2e-matrix", label: "E2E-matrix", x: 250, y: 245, agentId: "a14" },
      { stage: "canary-5", label: "Canary-5%", x: 470, y: 160, agentId: "a18" },
      { stage: "metrics-watch", label: "Metrics-watch", x: 650, y: 75, agentId: "a10" },
      { stage: "rollout-100", label: "Rollout-100%", x: 650, y: 245, agentId: "a4" },
      { stage: "announce", label: "Announce", x: 820, y: 160, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
    handoffs: {
      "0-1": { artifact: "build artifact + sbom", size: "84mb", ago: "12m" },
      "0-2": { artifact: "e2e shard plan (8x)", size: "12kb", ago: "12m" },
      "1-3": { artifact: "unit gate: 982 green", size: "3kb", ago: "7m" },
      "2-3": { artifact: "playwright matrix pass", size: "180kb", ago: "6m" },
      "3-4": { artifact: "canary metrics window", size: "64kb", ago: "3m" },
      "3-5": { artifact: "rollout manifest", size: "8kb", ago: "2m" },
      "4-6": { artifact: "SLO guard: p99 ok", size: "2kb", ago: "44s" },
      "5-6": { artifact: "changelog + flags", size: "21kb", ago: "30s" },
    },
  },
  {
    id: "t8",
    name: "Threat-hunt loop",
    project: "Platform",
    stages: [
      { stage: "hunt-plan", label: "Hunt-plan", x: 70, y: 160, agentId: "a12" },
      { stage: "telemetry-pull", label: "Telemetry-pull", x: 260, y: 70, agentId: "a5" },
      { stage: "anomaly-score", label: "Anomaly-score", x: 260, y: 250, agentId: "a17" },
      { stage: "isolate-host", label: "Isolate-host", x: 490, y: 125, agentId: "a6" },
      { stage: "forensic-dump", label: "Forensic-dump", x: 490, y: 250, agentId: "a12" },
      { stage: "close-report", label: "Close+report", x: 720, y: 160, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 5],
    ],
    handoffs: {
      "0-1": { artifact: "hunt hypothesis + iocs", size: "19kb", ago: "9m" },
      "0-2": { artifact: "baseline model v3", size: "2.4mb", ago: "9m" },
      "1-3": { artifact: "suspicious host set (7)", size: "11kb", ago: "5m" },
      "2-3": { artifact: "anomaly scores p95", size: "76kb", ago: "4m" },
      "2-4": { artifact: "memory snapshot refs", size: "900mb", ago: "4m" },
      "3-5": { artifact: "containment receipt", size: "5kb", ago: "1m" },
      "4-5": { artifact: "forensic report pdf", size: "3.1mb", ago: "48s" },
    },
  },
  {
    id: "t9",
    name: "Support ticket mesh",
    project: "Globex Ltd",
    stages: [
      { stage: "triage", label: "Triage", x: 70, y: 160, agentId: "a16" },
      { stage: "repro-frontend", label: "Repro-FE", x: 260, y: 60, agentId: "a4" },
      { stage: "repro-backend", label: "Repro-BE", x: 260, y: 260, agentId: "a18" },
      { stage: "fix-draft", label: "Fix-draft", x: 480, y: 100, agentId: "a13" },
      { stage: "test-verify", label: "Test-verify", x: 480, y: 235, agentId: "a1" },
      { stage: "docs-update", label: "Docs-update", x: 700, y: 100, agentId: "a3" },
      { stage: "reply-ship", label: "Reply-ship", x: 700, y: 235, agentId: "a8" },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
    handoffs: {
      "0-1": { artifact: "ticket #8841 + session replay", size: "34kb", ago: "4m" },
      "0-2": { artifact: "server logs slice", size: "120kb", ago: "4m" },
      "1-3": { artifact: "fe repro + video", size: "8.2mb", ago: "2m" },
      "2-3": { artifact: "be trace + sql", size: "210kb", ago: "2m" },
      "3-4": { artifact: "patch candidate diff", size: "38kb", ago: "1m" },
      "3-5": { artifact: "help-center delta", size: "14kb", ago: "55s" },
      "4-6": { artifact: "green test evidence", size: "26kb", ago: "20s" },
      "5-6": { artifact: "customer reply draft", size: "6kb", ago: "12s" },
    },
  },
];

export const SPECIALISTS = [
  "tester",
  "researcher",
  "coder",
  "nextjs",
  "python-expert",
  "security",
  "analyst",
  "docs",
  "scraper",
  "devops",
  "legal",
];

export const SKILLS = [
  "playwright-testing",
  "prompt-caching",
  "web-scraping",
  "sql-optimizer",
  "pdf-parse",
  "screenshot-diff",
  "api-retry",
  "pii-scrub",
  "vector-recall",
  "chart-render",
  "cron-pack",
  "slack-notify",
];

export interface MarketplaceItem {
  name: string;
  desc: string;
  kind: "skill" | "specialist" | "template";
  installs: string;
  rating: string;
}

export const MARKETPLACE: MarketplaceItem[] = [
  { name: "playwright-testing", desc: "Resilient selectors, trace capture, flake quarantine for e2e suites.", kind: "skill", installs: "2.1k", rating: "4.9" },
  { name: "prompt-caching", desc: "Cache repeat context blocks, cut repeat output cost ~18%.", kind: "skill", installs: "1.8k", rating: "4.8" },
  { name: "web-scraping", desc: "Stealth fetch, robots respect, WAF backoff, snapshot store.", kind: "skill", installs: "1.4k", rating: "4.6" },
  { name: "sql-optimizer", desc: "Query plans, index hints, and slow-query triage for analytics workloads.", kind: "skill", installs: "980", rating: "4.7" },
  { name: "api-retry", desc: "Jittered backoff, idempotency keys, and circuit breaking for flaky APIs.", kind: "skill", installs: "1.2k", rating: "4.7" },
  { name: "pii-scrub", desc: "Redact emails, keys, and secrets from logs, exports, and traces.", kind: "skill", installs: "1.5k", rating: "4.8" },
  { name: "vector-recall", desc: "Embedding retrieval with rerank for docs and runbook memory.", kind: "skill", installs: "870", rating: "4.5" },
  { name: "tester", desc: "Unit + e2e discipline, edge-case matrix, flaky-selector flags.", kind: "specialist", installs: "3.2k", rating: "4.9" },
  { name: "python-expert", desc: "Fixture factories, async discipline, pytest patterns.", kind: "specialist", installs: "2.7k", rating: "4.8" },
  { name: "security", desc: "Threat-model first, secret hygiene, least-privilege tool calls.", kind: "specialist", installs: "1.1k", rating: "4.7" },
  { name: "researcher", desc: "Source triage, citation discipline, and brief-ready synthesis.", kind: "specialist", installs: "1.9k", rating: "4.7" },
  { name: "analyst", desc: "Delta reports, funnel math, and exec-ready chart narratives.", kind: "specialist", installs: "1.6k", rating: "4.6" },
  { name: "devops", desc: "Canary analysis, rollout guards, and incident-first containment.", kind: "specialist", installs: "940", rating: "4.6" },
  { name: "checkout-regression", desc: "Tester + playwright bundle for /app/checkout with discount-code edge.", kind: "template", installs: "860", rating: "4.9" },
  { name: "nightly-audit", desc: "Security + analyst + slack-notify for nightly posture reports.", kind: "template", installs: "640", rating: "4.7" },
  { name: "scrape-to-csv", desc: "Scraper + analyst pipeline with dedupe and delta reports.", kind: "template", installs: "512", rating: "4.6" },
  { name: "release-canary", desc: "Coder + tester + analyst bundle for canary-gated releases.", kind: "template", installs: "480", rating: "4.7" },
  { name: "incident-response", desc: "Triage + forensics + broadcast pipeline for sev1 events.", kind: "template", installs: "390", rating: "4.8" },
  { name: "legal-redline-pack", desc: "Legal + researcher bundle for redlines with risk citations.", kind: "template", installs: "310", rating: "4.7" },
];

export interface ScheduleRow {
  name: string;
  agent: string;
  cadence: string;
  next: string;
  last: string;
  ok: boolean[];
}

export const SCHEDULES: ScheduleRow[] = [
  { name: "nightly-regression", agent: "Checkout-Tester-01", cadence: "daily 02:00", next: "in 4h", last: "passed", ok: [true, true, true, false, true, true, true] },
  { name: "pricing-refresh", agent: "Pricing-Researcher", cadence: "every 6h", next: "in 1h", last: "passed", ok: [true, true, true, true, true, false, true] },
  { name: "security-sweep", agent: "Security-Audit-02", cadence: "weekly Mon", next: "in 2d", last: "failed", ok: [true, false, true, true, true, true, true] },
  { name: "embedding-backfill", agent: "Embed-Backfill-07", cadence: "hourly", next: "in 22m", last: "passed", ok: [true, true, true, true, true, true, true] },
  { name: "threat-hunt", agent: "Threat-Hunt-02", cadence: "every 30m", next: "in 11m", last: "passed", ok: [true, true, false, true, true, true, true] },
  { name: "cost-audit", agent: "Infra-Cost-Auditor", cadence: "weekly Fri", next: "in 4d", last: "passed", ok: [true, true, true, true, true, true, false] },
  { name: "vision-qa", agent: "Vision-QA-Bot", cadence: "daily 03:00", next: "in 5h", last: "passed", ok: [true, true, true, true, false, true, true] },
  { name: "legal-watch", agent: "Legal-Redline-v2", cadence: "daily 06:00", next: "in 8h", last: "passed", ok: [true, true, true, true, true, true, true] },
];

export const MEMBERS = [
  { name: "Subodh B.", role: "Admin", initials: "SB" },
  { name: "Renee Park", role: "Admin", initials: "RP" },
  { name: "Jae Lin", role: "Member", initials: "JL" },
  { name: "CI Bot", role: "Bot", initials: "CI" },
];
