"use client";
import { healthColor } from "@/lib/fleet";

export function Spark({ vals, color, w = 72, h = 20 }: { vals: number[]; color: string; w?: number; h?: number }) {
  if (!vals.length) return <svg width={w} height={h} />;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const pts = vals
    .map((v, i) => {
      const x = (i / Math.max(1, vals.length - 1)) * w;
      const y = h - 2 - ((v - min) / Math.max(1, max - min)) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} />
    </svg>
  );
}

export function AreaChart({
  data,
  id,
  height = 140,
  color = "#6669e8",
}: {
  data: number[];
  id: string;
  height?: number;
  color?: string;
}) {
  const w = 460;
  const h = height;
  if (data.length < 2) return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} />;
  const max = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - 8 - (v / max) * (h - 24)).toFixed(1)}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="var(--grid)" strokeWidth={1} />
      ))}
      <polygon points={area} fill={color} opacity={0.14} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} />
      <circle
        cx={((data.length - 1) * step).toFixed(1)}
        cy={(h - 8 - ((data[data.length - 1] || 0) / max) * (h - 24)).toFixed(1)}
        r={3}
        fill={color}
        id={id}
      />
    </svg>
  );
}

export function BarList({
  rows,
}: {
  rows: { label: string; value: number; display: string; color: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bar-list">
      {rows.map((r) => (
        <div key={r.label} className="bar-list-row">
          <div className="bar-list-label">{r.label}</div>
          <div className="bar-list-track">
            <div className="bar-list-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
          <div className="bar-list-val">{r.display}</div>
        </div>
      ))}
    </div>
  );
}

export function Health({ h }: { h: number }) {
  return (
    <span className="health-cell">
      <span className="health-track">
        <i style={{ width: `${h}%`, background: healthColor(h) }} />
      </span>
      <span className="mono-num">{h}%</span>
    </span>
  );
}
