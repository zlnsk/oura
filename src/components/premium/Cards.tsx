"use client";

import { useEffect, useState, type ReactNode, type KeyboardEvent } from "react";
import type {
  DailyActivity,
  DailyReadiness,
  DailySleep,
  DailyStress,
  DashboardData,
  SleepPeriod,
  WithingsWeightEntry,
} from "@/types/oura";
import { HRRibbon, LineChart, RingChart, Sparkline, type Point } from "./Charts";
import { formatHM, formatClock, last7Steps, pairedIntraday } from "./data-shape";

/** Shared keyboard handler so Enter AND Space both trigger the card action. */
function cardKey(onExpand: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onExpand();
    }
  };
}

interface CardHeadProps {
  title: string;
  sub: string;
  badge?: string;
  onExpand?: () => void;
}

export function CardHead({ title, sub, badge, onExpand }: CardHeadProps) {
  return (
    <div className="card-head">
      <div className="card-title">
        <span className="s">{sub}</span>
        <span className="t">{title}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {badge && <span className="card-badge">{badge}</span>}
        {onExpand && (
          <button
            className="close"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            title="Expand"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              color: "var(--ink-2)",
            }}
            aria-label={`Open ${title} details`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M2 2h3M2 2v3M8 8H5M8 8V5"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function CoachNote({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <div className="ic">↺</div>
      <p>{children}</p>
    </div>
  );
}

export function KV({ k, v, hint }: { k: string; v: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>
        {k}
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 400 }}>
        {v}
      </div>
      {hint && (
        <div className="meta" style={{ marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

interface VitalProps {
  label: string;
  value: string;
  unit: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: Point[];
  onClick?: () => void;
}

export function Vital({ label, value, unit, delta, deltaDir = "up", spark, onClick }: VitalProps) {
  const clickable = Boolean(onClick);
  const handleKey = (e: KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className="vital"
      tabIndex={clickable ? 0 : -1}
      role={clickable ? "button" : undefined}
      aria-label={clickable ? `${label} — open detail` : undefined}
      onClick={onClick}
      onKeyDown={handleKey}
      style={clickable ? undefined : { cursor: "default" }}
    >
      <div className="label">{label}</div>
      <div className="vital-row">
        <div className="num">{value}</div>
        {unit && <div className="unit">{unit}</div>}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} />}
      {delta && (
        <div className={`vital-delta ${deltaDir === "down" ? "down" : ""}`}>
          <span className="arrow">{deltaDir === "up" ? "↗" : "↘"}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Sleep ----------
export function SleepCard({
  sleep,
  period,
  onExpand,
}: {
  sleep: DailySleep | undefined;
  period: SleepPeriod | undefined;
  onExpand: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, [sleep?.id, period?.id]);

  const total = period?.total_sleep_duration ?? 0;
  const light = period?.light_sleep_duration ?? 0;
  const deep = period?.deep_sleep_duration ?? 0;
  const rem = period?.rem_sleep_duration ?? 0;
  const awake = period?.awake_time ?? 0;
  const denom = total + awake || 1;

  const stages = [
    { k: "REM", cls: "stage-rem", pct: rem / denom, dur: formatHM(rem) },
    { k: "Deep", cls: "stage-deep", pct: deep / denom, dur: formatHM(deep) },
    { k: "Light", cls: "stage-light", pct: light / denom, dur: formatHM(light) },
    { k: "Awake", cls: "stage-awake", pct: awake / denom, dur: formatHM(awake) },
  ];

  const coachCopy = !sleep
    ? "No sleep recorded for this night. Make sure your ring has synced."
    : sleep.score >= 85
      ? "A strong night. Deep sleep concentrated early in the window — exactly where it belongs."
      : sleep.score >= 70
        ? "Solid recovery, with a few light-sleep pockets late in the night. A consistent bedtime will sharpen this further."
        : "Your body under-recovered. Prioritise an earlier wind-down and a cool, dark room tonight.";

  const bedtimeLine =
    period?.bedtime_start && period?.bedtime_end
      ? `${formatClock(period.bedtime_start)} → ${formatClock(period.bedtime_end)}`
      : "—";

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  return (
    <div className="card col-5" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Sleep" title="Last night" badge="Oura" onExpand={onExpand} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center" }}>
        <RingChart value={sleep?.score ?? 0} size={200} color="var(--ring-sleep)" label="Sleep score" />
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div className="num" style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-0.03em" }}>
              {total > 0 ? `${hours}h` : "—"}
            </div>
            <div className="num" style={{ fontSize: 24, fontWeight: 300, color: "var(--ink-3)" }}>
              {total > 0 ? `${String(minutes).padStart(2, "0")}m` : ""}
            </div>
          </div>
          <div className="meta" style={{ marginTop: 2 }}>{bedtimeLine}</div>
          <div className="stages" style={{ marginTop: 18 }}>
            {stages.map((s) => (
              <div className={`stage-row ${s.cls}`} key={s.k}>
                <div className="l">{s.k}</div>
                <div className="stage-bar">
                  <div
                    className="fill"
                    style={{ transform: mounted ? `scaleX(${Math.max(0.02, s.pct)})` : "scaleX(0)" }}
                  />
                </div>
                <div className="v">{s.dur}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <CoachNote>{coachCopy}</CoachNote>
    </div>
  );
}

// ---------- Readiness ----------
export function ReadinessCard({
  readiness,
  sleepPeriod,
  history,
  rangeDays = 14,
  onExpand,
}: {
  readiness: DailyReadiness | undefined;
  sleepPeriod: SleepPeriod | undefined;
  history: DailyReadiness[];
  rangeDays?: number;
  onExpand: () => void;
}) {
  const trend: Point[] = history
    .slice(-rangeDays)
    .map((r, i) => ({ i, v: r.score }))
    .filter((p) => Number.isFinite(p.v) && p.v > 0);

  const hrvLabel = sleepPeriod?.average_hrv != null
    ? `${Math.round(sleepPeriod.average_hrv)} ms overnight`
    : "no HRV reading";
  const hrLabel = sleepPeriod?.average_heart_rate != null
    ? `${Math.round(sleepPeriod.average_heart_rate)} bpm`
    : "—";

  const tempDev = readiness?.temperature_deviation;
  const tempStr = tempDev != null
    ? `${tempDev > 0 ? "+" : ""}${tempDev.toFixed(1)} °C`
    : "—";
  const tempHint = tempDev != null && Math.abs(tempDev) < 0.3 ? "within range" : "track closely";

  const score = readiness?.score ?? 0;
  const status = score >= 85 ? "Optimal" : score >= 70 ? "Good" : score >= 55 ? "Fair" : "Low";

  const coachCopy = score === 0
    ? "No readiness score yet for today. Check back after your ring syncs."
    : score >= 85
      ? "You're in peak recovery. Today is a strong day for focused work or a hard session."
      : score >= 70
        ? "You're trending well. A moderate workload and a protected sleep window will nudge this higher."
        : "Recovery is below your baseline. Keep intensity easy and guard your wind-down window tonight.";

  return (
    <div className="card col-7" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Readiness" title="Recovery trend" badge={`${rangeDays} days`} onExpand={onExpand} />
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 36, alignItems: "center" }}>
        <RingChart value={score} size={180} color="var(--ring-ready)" label="Ready" subLabel={status} />
        <div>
          <div style={{ display: "flex", gap: 32, marginBottom: 14, flexWrap: "wrap" }}>
            <KV k="Resting HR" v={hrLabel} hint={hrLabel === "—" ? undefined : "overnight avg"} />
            <KV k="HRV balance" v={hrvLabel} hint={readiness?.contributors?.hrv_balance ? `score ${readiness.contributors.hrv_balance}` : undefined} />
            <KV k="Body temp" v={tempStr} hint={tempDev != null ? tempHint : undefined} />
          </div>
          <LineChart
            data={trend}
            height={140}
            color="var(--ring-ready)"
            xFmt={(d) => `day ${d.i + 1}`}
            yFmt={(v) => `${v} score`}
          />
        </div>
      </div>
      <CoachNote>{coachCopy}</CoachNote>
    </div>
  );
}

// ---------- Activity ----------
export function ActivityCard({
  activity,
  history,
  today,
  onExpand,
}: {
  activity: DailyActivity | undefined;
  history: DashboardData["activity"];
  today: string;
  onExpand: () => void;
}) {
  const bars = last7Steps(history, today);
  const maxSteps = Math.max(...bars.map((b) => b.v), 1);
  const goal = 10000;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, [today]);

  const steps = activity?.steps ?? 0;
  const activeKcal = activity?.active_calories ?? 0;
  const mediumPlus = Math.round(
    ((activity?.medium_activity_time ?? 0) + (activity?.high_activity_time ?? 0)) / 60,
  );

  const goalDays = bars.filter((b) => b.v >= goal).length;
  const copy =
    steps === 0
      ? "No activity recorded yet today. Go for a short walk and watch your streak build."
      : steps >= goal
        ? `You've hit goal today — ${goalDays} of 7 days this week. Keep this rhythm and your baseline will climb.`
        : `${goalDays} of 7 days on target this week. A brisk 20-minute walk before lunch closes today's gap.`;

  return (
    <div className="card col-6" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Movement" title="Activity · 7 days" badge="Oura" onExpand={onExpand} />
      <div style={{ display: "flex", gap: 32, alignItems: "flex-end", marginBottom: 6, flexWrap: "wrap" }}>
        <div>
          <div className="num" style={{ fontSize: 48, fontWeight: 300, letterSpacing: "-0.03em" }}>
            {steps.toLocaleString()}
          </div>
          <div className="label" style={{ marginTop: 4 }}>Steps today</div>
        </div>
        <div>
          <div className="num" style={{ fontSize: 22, fontWeight: 400 }}>{activeKcal.toLocaleString()}</div>
          <div className="label" style={{ marginTop: 4 }}>Active kcal</div>
        </div>
        <div>
          <div className="num" style={{ fontSize: 22, fontWeight: 400 }}>
            {mediumPlus}
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>min</span>
          </div>
          <div className="label" style={{ marginTop: 4 }}>Medium+</div>
        </div>
      </div>
      <div className="bars">
        {bars.map((b, i) => (
          <div className="bar-col" key={`${b.d}-${i}`}>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  height: `${(b.v / maxSteps) * 100}%`,
                  transform: mounted ? "scaleY(1)" : "scaleY(0)",
                  background: b.v >= goal ? "var(--ink)" : "var(--ink-4)",
                }}
              />
            </div>
            <div className="d">{b.d}</div>
          </div>
        ))}
      </div>
      <CoachNote>{copy}</CoachNote>
    </div>
  );
}

// ---------- Heart ----------
export function HeartCard({
  sleepPeriod,
  onExpand,
}: {
  sleepPeriod: SleepPeriod | undefined;
  onExpand: () => void;
}) {
  const { a: hr, b: hrv, labels } = pairedIntraday(sleepPeriod?.heart_rate, sleepPeriod?.hrv);

  const avgHr = sleepPeriod?.average_heart_rate ?? 0;
  const lowestHr = sleepPeriod?.lowest_heart_rate ?? 0;
  const avgHrv = sleepPeriod?.average_hrv ?? 0;

  return (
    <div className="card col-6" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Cardiac" title="Heart rate & HRV · overnight" badge="Oura" onExpand={onExpand} />
      <div style={{ display: "flex", gap: 28, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div className="num" style={{ fontSize: 32, fontWeight: 350 }}>
            {lowestHr > 0 ? lowestHr : "—"}
            <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 4 }}>bpm</span>
          </div>
          <div className="label" style={{ marginTop: 4 }}>Lowest HR</div>
        </div>
        <div>
          <div className="num" style={{ fontSize: 32, fontWeight: 350, color: "var(--accent)" }}>
            {avgHrv > 0 ? Math.round(avgHrv) : "—"}
            <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 4 }}>ms</span>
          </div>
          <div className="label" style={{ marginTop: 4 }}>Avg HRV</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <Legend color="var(--ink)" label="HR" />
          <Legend color="var(--accent)" label="HRV" dashed />
        </div>
      </div>
      <HRRibbon hr={hr} hrv={hrv} hrLabels={labels} />
      {labels.length > 2 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span className="meta">{labels[0]}</span>
          <span className="meta">{labels[Math.floor(labels.length / 2)]}</span>
          <span className="meta">{labels[labels.length - 1]}</span>
        </div>
      )}
      {avgHr > 0 && (
        <div className="meta" style={{ marginTop: 10 }}>Avg HR: {Math.round(avgHr)} bpm</div>
      )}
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="18" height="4">
        <line x1="0" y1="2" x2="18" y2="2" stroke={color} strokeWidth="1.4" strokeDasharray={dashed ? "2 3" : ""} />
      </svg>
      <span className="label">{label}</span>
    </div>
  );
}

// ---------- Weight ----------
export function WeightCard({
  weight,
  onExpand,
}: {
  weight: WithingsWeightEntry[];
  onExpand: () => void;
}) {
  const sorted = [...weight].sort((a, b) => a.day.localeCompare(b.day));
  const cur = sorted.length ? sorted[sorted.length - 1].weight : 0;
  const start = sorted.length ? sorted[0].weight : 0;
  const delta = cur && start ? Number((cur - start).toFixed(1)) : 0;

  const points: Point[] = sorted.map((w, i) => ({ i, v: w.weight }));
  const bodyFat = sorted.length ? sorted[sorted.length - 1].fat_ratio : undefined;
  const muscle = sorted.length ? sorted[sorted.length - 1].muscle_mass : undefined;

  if (sorted.length === 0) {
    return (
      <div className="card col-4" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
        <CardHead sub="Body" title="Weight · 30 days" badge="Withings" onExpand={onExpand} />
        <div style={{ padding: "28px 0", textAlign: "center" }}>
          <div className="meta">No Withings data available.</div>
          <div className="meta" style={{ marginTop: 6 }}>Connect in Settings.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card col-4" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Body" title="Weight · 30 days" badge="Withings" onExpand={onExpand} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div className="num" style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-0.03em" }}>
          {cur.toFixed(1)}
        </div>
        <div className="unit label">kg</div>
        <div className="meta" style={{ marginLeft: "auto" }}>
          {delta > 0 ? `+${delta}` : delta} kg
        </div>
      </div>
      <LineChart
        data={points}
        height={110}
        color="var(--ink)"
        xFmt={(d) => `${points.length - d.i - 1}d ago`}
        yFmt={(v) => `${v.toFixed(1)} kg`}
      />
      <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
        {bodyFat != null && <KV k="Body fat" v={`${bodyFat.toFixed(1)}%`} />}
        {muscle != null && <KV k="Muscle" v={`${muscle.toFixed(1)} kg`} />}
      </div>
    </div>
  );
}

// ---------- Temp ----------
export function TempCard({
  readiness,
  history,
  onExpand,
}: {
  readiness: DailyReadiness | undefined;
  history: DailyReadiness[];
  onExpand: () => void;
}) {
  const sorted = [...history].sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  const points: Point[] = sorted.map((r, i) => ({
    i,
    v: Number((r.temperature_deviation ?? 0).toFixed(2)),
  }));

  const today = readiness?.temperature_deviation;
  const todayStr = today != null ? `${today > 0 ? "+" : ""}${today.toFixed(1)}` : "—";
  const todayHint = today != null && Math.abs(today) < 0.3 ? "within range" : "monitor";

  return (
    <div className="card col-4" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Temperature" title="Deviation · 14 days" badge="Oura" onExpand={onExpand} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div className="num" style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-0.03em" }}>
          {todayStr}
        </div>
        <div className="unit label">°C</div>
        <div className="meta" style={{ marginLeft: "auto" }}>{todayHint}</div>
      </div>
      <LineChart
        data={points}
        height={110}
        color="var(--warm)"
        area={false}
        xFmt={(d) => `day ${d.i + 1}`}
        yFmt={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} °C`}
      />
      <div className="meta" style={{ marginTop: 8 }}>
        Baseline {points.length >= 7 ? "stable" : "building"}. {points.length < 7 && "Add more nights for a clearer trend."}
      </div>
    </div>
  );
}

// ---------- Stress ----------
export function StressCard({
  stress,
  today,
  onExpand,
}: {
  stress: DailyStress[];
  today: string;
  onExpand: () => void;
}) {
  const todayStress = stress.find((s) => s.day === today);
  const recent = [...stress].sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, [today]);

  const label = todayStress?.day_summary || "no reading";
  const high = todayStress?.stress_high ?? 0;
  const recovery = todayStress?.daytime_recovery ?? 0;
  const barMax = Math.max(high, recovery, 1);
  const avgIndicator = Math.round((high / (high + recovery || 1)) * 100) || 0;

  return (
    <div className="card col-4" onClick={onExpand} role="button" tabIndex={0} onKeyDown={cardKey(onExpand)}>
      <CardHead sub="Resilience" title="Stress today" badge="live" onExpand={onExpand} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div className="num" style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-0.03em" }}>
          {avgIndicator || "—"}
        </div>
        <div className="unit label">stress load</div>
        <div className="meta" style={{ marginLeft: "auto" }}>{label}</div>
      </div>
      <div style={{ display: "flex", gap: 3, alignItems: "end", height: 70, marginTop: 14 }}>
        {recent.length === 0 && (
          <div className="meta" style={{ margin: "auto" }}>No stress history</div>
        )}
        {recent.map((s, i) => {
          const ratio = (s.stress_high ?? 0) / (((s.stress_high ?? 0) + (s.daytime_recovery ?? 0)) || 1);
          const height = Math.max(8, ratio * 100);
          const color = ratio > 0.6 ? "var(--warm)" : ratio > 0.4 ? "var(--ink-3)" : "var(--accent-soft)";
          return (
            <div
              key={s.day}
              title={`${s.day} · ${s.day_summary}`}
              style={{
                flex: 1,
                height: mounted ? `${height}%` : "0%",
                background: color,
                borderRadius: 2,
                transition: `height .8s cubic-bezier(.2,.7,.2,1) ${i * 20}ms`,
              }}
            />
          );
        })}
      </div>
      <div className="meta" style={{ marginTop: 10 }}>
        {todayStress
          ? `High-stress ${Math.round(high / 60)}m · recovery ${Math.round(recovery / 60)}m`
          : "Stress history builds as your ring syncs."}
      </div>
      <noscript>{barMax}</noscript>
    </div>
  );
}
