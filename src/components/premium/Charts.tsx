"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

export interface Point { i: number; v: number }

interface LineChartProps {
  data: Point[];
  height?: number;
  area?: boolean;
  color?: string;
  xFmt?: (d: Point) => string;
  yFmt?: (v: number) => string;
}

export function LineChart({ data, height = 180, area = true, color = "var(--ink)", xFmt, yFmt }: LineChartProps) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number; d: Point } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { w, h, pad, path, areaPath, sx, sy, gradientId } = useMemo(() => {
    const w = 600;
    const h = height;
    const pad = { l: 8, r: 8, t: 14, b: 22 };

    if (!data || data.length === 0) {
      return { w, h, pad, path: "", areaPath: "", sx: () => 0, sy: () => 0, gradientId: "g" };
    }

    const xs = data.map((d) => d.i);
    const ys = data.map((d) => d.v);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yRange = Math.max(...ys) - Math.min(...ys) || 1;
    const yMin = Math.min(...ys) - yRange * 0.15;
    const yMax = Math.max(...ys) + yRange * 0.15;

    const sx = (i: number) => pad.l + ((i - xMin) / (xMax - xMin || 1)) * (w - pad.l - pad.r);
    const sy = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (h - pad.t - pad.b);
    const path = data.map((d, idx) => `${idx === 0 ? "M" : "L"} ${sx(d.i)} ${sy(d.v)}`).join(" ");
    const last = data[data.length - 1];
    const first = data[0];
    const areaPath = `${path} L ${sx(last.i)} ${h - pad.b} L ${sx(first.i)} ${h - pad.b} Z`;
    const gradientId = `scandi-area-${Math.random().toString(36).slice(2, 9)}`;
    return { w, h, pad, path, areaPath, sx, sy, gradientId };
  }, [data, height]);

  const onMove = (e: MouseEvent) => {
    if (!wrapRef.current || !data || data.length === 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    data.forEach((d, idx) => {
      const dx = Math.abs(sx(d.i) - relX);
      if (dx < bestDist) {
        bestDist = dx;
        best = idx;
      }
    });
    const d = data[best];
    setHover({
      i: best,
      x: (sx(d.i) / w) * rect.width,
      y: (sy(d.v) / h) * rect.height,
      d,
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="chart" style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="meta">No data</span>
      </div>
    );
  }

  return (
    <div className="chart" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="grid">
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={pad.l}
              x2={w - pad.r}
              y1={pad.t + p * (h - pad.t - pad.b)}
              y2={pad.t + p * (h - pad.t - pad.b)}
            />
          ))}
        </g>
        {area && <path d={areaPath} fill={`url(#${gradientId})`} />}
        <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
        {hover && (
          <>
            <line
              x1={sx(hover.d.i)}
              x2={sx(hover.d.i)}
              y1={pad.t}
              y2={h - pad.b}
              stroke="var(--ink)"
              strokeWidth="0.6"
              opacity="0.4"
            />
            <circle cx={sx(hover.d.i)} cy={sy(hover.d.v)} r="3.5" fill="var(--ink)" />
            <circle cx={sx(hover.d.i)} cy={sy(hover.d.v)} r="7" fill="var(--ink)" opacity="0.12" />
          </>
        )}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: hover.x, top: hover.y, opacity: 1 }}>
          <span className="tt-l">{xFmt ? xFmt(hover.d) : `Day ${hover.d.i}`} · </span>
          <span className="tt-v">{yFmt ? yFmt(hover.d.v) : String(hover.d.v)}</span>
        </div>
      )}
    </div>
  );
}

interface RingProps {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: string;
  subLabel?: string;
}

export function RingChart({ value, max = 100, size = 240, thickness = 8, color = "var(--ink)", label, subLabel }: RingProps) {
  const r = size / 2 - thickness * 1.5;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);
  const offset = c * (1 - (mounted ? pct : 0));

  return (
    <div className="ring-wrap" style={{ maxWidth: size, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness * 0.6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="ring-center">
        <div className="v num">{value || "—"}</div>
        {label && <div className="l">{label}</div>}
        {subLabel && <div className="meta" style={{ marginTop: 4 }}>{subLabel}</div>}
      </div>
    </div>
  );
}

interface HRRibbonProps {
  hr: Point[];
  hrv: Point[];
  hrLabels?: string[];
}

export function HRRibbon({ hr, hrv, hrLabels }: HRRibbonProps) {
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const w = 600;
  const h = 110;
  const pad = { l: 8, r: 8, t: 10, b: 18 };

  const n = Math.min(hr.length, hrv.length);
  const hasData = n > 0;

  const hrVals = hr.slice(0, n).map((d) => d.v).filter((v) => Number.isFinite(v) && v > 0);
  const hrvVals = hrv.slice(0, n).map((d) => d.v).filter((v) => Number.isFinite(v) && v > 0);

  const hrMin = hrVals.length ? Math.min(...hrVals) - 2 : 40;
  const hrMax = hrVals.length ? Math.max(...hrVals) + 2 : 80;
  const hrvMin = hrvVals.length ? Math.min(...hrvVals) - 4 : 20;
  const hrvMax = hrvVals.length ? Math.max(...hrvVals) + 4 : 100;

  const sx = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const syHR = (v: number) => pad.t + (1 - (v - hrMin) / (hrMax - hrMin || 1)) * (h - pad.t - pad.b);
  const syHRV = (v: number) => pad.t + (1 - (v - hrvMin) / (hrvMax - hrvMin || 1)) * (h - pad.t - pad.b);

  const hrPath = hr
    .slice(0, n)
    .map((d, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${syHR(d.v)}`)
    .join(" ");
  const hrvPath = hrv
    .slice(0, n)
    .map((d, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${syHRV(d.v)}`)
    .join(" ");

  const onMove = (e: MouseEvent) => {
    if (!wrapRef.current || !hasData) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = Math.abs(sx(i) - relX);
      if (dx < bestDist) {
        bestDist = dx;
        best = i;
      }
    }
    setHover({ i: best, x: (sx(best) / w) * rect.width });
  };

  if (!hasData) {
    return (
      <div className="chart" style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="meta">No overnight data</span>
      </div>
    );
  }

  return (
    <div className="chart" ref={wrapRef} style={{ height: h }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={hrPath} fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
        <path d={hrvPath} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
        {hover && (
          <>
            <line x1={sx(hover.i)} x2={sx(hover.i)} y1={pad.t} y2={h - pad.b} stroke="var(--ink)" opacity="0.4" />
            <circle cx={sx(hover.i)} cy={syHR(hr[hover.i].v)} r="3" fill="var(--ink)" />
            <circle cx={sx(hover.i)} cy={syHRV(hrv[hover.i].v)} r="3" fill="var(--accent)" />
          </>
        )}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: hover.x, top: 40, opacity: 1 }}>
          <span className="tt-l">
            {hrLabels?.[hover.i] ?? `${String(hover.i).padStart(2, "0")}`} ·{" "}
          </span>
          <span className="tt-v">
            {hr[hover.i].v}bpm · {hrv[hover.i].v}ms
          </span>
        </div>
      )}
    </div>
  );
}

interface SparklineProps {
  data: Point[];
  stroke?: string;
  fill?: boolean;
}

export function Sparkline({ data, stroke = "var(--ink)", fill = true }: SparklineProps) {
  if (!data || data.length < 2) {
    return <svg className="spark" viewBox="0 0 120 34" />;
  }
  const w = 120;
  const h = 34;
  const xs = data.map((d) => d.i);
  const ys = data.map((d) => d.v);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const sx = (i: number) => ((i - xMin) / (xMax - xMin || 1)) * w;
  const sy = (v: number) => h - ((v - yMin) / (yMax - yMin || 1)) * h;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.i)} ${sy(d.v)}`).join(" ");
  const area = `${path} L ${sx(xs[xs.length - 1])} ${h} L ${sx(xs[0])} ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && <path d={area} fill={stroke} fillOpacity="0.08" />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}
