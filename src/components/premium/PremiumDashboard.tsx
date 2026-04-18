"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { LineChart, type Point } from "./Charts";
import {
  ActivityCard,
  HeartCard,
  ReadinessCard,
  SleepCard,
  StressCard,
  TempCard,
  Vital,
  WeightCard,
} from "./Cards";
import { Drawer, KVRow } from "./Drawer";
import {
  coachingLine,
  dataCompleteness,
  formatHM,
  formatSleepDuration,
  formatClock,
  mean,
  mostRecentDay,
  readinessStreak,
  sleepPeriodFor,
  toDateStr,
} from "./data-shape";

type DrawerKey =
  | "sleep"
  | "readiness"
  | "activity"
  | "heart"
  | "weight"
  | "temp"
  | "stress"
  | null;

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Today" },
  { href: "/sleep", label: "Sleep" },
  { href: "/readiness", label: "Readiness" },
  { href: "/activity", label: "Activity" },
  { href: "/heart-rate", label: "Trends" },
];

export function PremiumDashboard() {
  const { data, loading, error, lastUpdated, isOffline, isStale, fetchData } = useOuraData();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [range, setRange] = useState<"Day" | "Week" | "Month">("Week");

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Activate scandi mode — adds body.scandi-active + html[data-app-mode="scandi"]
  // so our CSS can beat m3-overlay's !important rules on html/body/a.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-app-mode", "scandi");
    document.body.classList.add("scandi-active");
    return () => {
      document.documentElement.removeAttribute("data-app-mode");
      document.body.classList.remove("scandi-active");
    };
  }, []);

  // Scroll reveal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll(".scandi .reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [data]);

  const today = useMemo(() => mostRecentDay(data), [data]);
  const todayDate = useMemo(() => new Date(today + "T12:00:00"), [today]);
  const dateStr = todayDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayReadiness = data?.readiness?.find((r) => r.day === today);
  const todaySleep = data?.sleep?.find((s) => s.day === today);
  const todayActivity = data?.activity?.find((a) => a.day === today);
  const todaySleepPeriod = sleepPeriodFor(data, today);

  // Range → window (days). Day=3 so sparklines have at least a few points.
  const rangeDays = range === "Day" ? 3 : range === "Week" ? 7 : 30;

  // --- Sparkline series (length follows the range toggle) ---
  const sleepScoreSeries: Point[] = useMemo(() => {
    const sorted = (data?.sleep || []).slice().sort((a, b) => a.day.localeCompare(b.day)).slice(-rangeDays);
    return sorted.map((s, i) => ({ i, v: s.score })).filter((p) => p.v > 0);
  }, [data?.sleep, rangeDays]);

  const readinessSeries: Point[] = useMemo(() => {
    const sorted = (data?.readiness || []).slice().sort((a, b) => a.day.localeCompare(b.day)).slice(-rangeDays);
    return sorted.map((r, i) => ({ i, v: r.score })).filter((p) => p.v > 0);
  }, [data?.readiness, rangeDays]);

  const stepsSeries: Point[] = useMemo(() => {
    const sorted = (data?.activity || []).slice().sort((a, b) => a.day.localeCompare(b.day)).slice(-rangeDays);
    return sorted.map((a, i) => ({ i, v: a.steps ?? 0 })).filter((p) => p.v > 0);
  }, [data?.activity, rangeDays]);

  const hrSeries: Point[] = useMemo(() => {
    const sorted = (data?.sleepPeriods || [])
      .filter((p) => p.type === "long_sleep")
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-rangeDays);
    return sorted.map((p, i) => ({ i, v: p.average_heart_rate })).filter((p) => p.v > 0);
  }, [data?.sleepPeriods, rangeDays]);

  const hrvSeries: Point[] = useMemo(() => {
    const sorted = (data?.sleepPeriods || [])
      .filter((p) => p.type === "long_sleep")
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-rangeDays);
    return sorted.map((p, i) => ({ i, v: p.average_hrv })).filter((p) => p.v > 0);
  }, [data?.sleepPeriods, rangeDays]);

  // Fixed 14-day baselines, used for vital deltas (don't change with the toggle).
  const hrBaseline14: number[] = useMemo(() => {
    const sorted = (data?.sleepPeriods || [])
      .filter((p) => p.type === "long_sleep")
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-14);
    return sorted.map((p) => p.average_heart_rate).filter((v) => v > 0);
  }, [data?.sleepPeriods]);
  const hrvBaseline14: number[] = useMemo(() => {
    const sorted = (data?.sleepPeriods || [])
      .filter((p) => p.type === "long_sleep")
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-14);
    return sorted.map((p) => p.average_hrv).filter((v) => v > 0);
  }, [data?.sleepPeriods]);

  const weight30 = data?.weight || [];

  // --- Stat row values ---
  const streak = readinessStreak(data, today);
  const weightChange = useMemo(() => {
    if (!weight30.length) return 0;
    const sorted = [...weight30].sort((a, b) => a.day.localeCompare(b.day));
    return Number((sorted[sorted.length - 1].weight - sorted[0].weight).toFixed(1));
  }, [weight30]);
  const hrvVsBaseline = useMemo(() => {
    if (hrvBaseline14.length < 7) return 0;
    const recent = hrvBaseline14.slice(-7);
    const baseline = hrvBaseline14.slice(0, Math.max(1, hrvBaseline14.length - 7));
    return Math.round(mean(recent) - mean(baseline));
  }, [hrvBaseline14]);
  const completeness = dataCompleteness(data, 30);

  // --- Vital row values (use fixed 14-day baseline so deltas don't collapse at Day/Week range) ---
  const restingHr = todaySleepPeriod?.average_heart_rate || todaySleepPeriod?.lowest_heart_rate || 0;
  const hrRollingAvg = mean(hrBaseline14);
  const hrDelta = restingHr && hrRollingAvg ? Math.round((restingHr - hrRollingAvg) * 10) / 10 : 0;

  const hrvNight = todaySleepPeriod?.average_hrv ?? 0;
  const hrvRollingAvg = mean(hrvBaseline14);
  const hrvDelta = hrvNight && hrvRollingAvg ? Math.round(hrvNight - hrvRollingAvg) : 0;

  // --- Hero status line ---
  const status = coachingLine({
    readiness: todayReadiness?.score,
    hrv: hrvNight,
    sleepScore: todaySleep?.score,
    tempDev: todayReadiness?.temperature_deviation,
  });

  // --- Sync pill states ---
  let ouraPillState: "synced" | "syncing" | "error" = "synced";
  let ouraLabel = "Oura · synced";
  if (loading) {
    ouraPillState = "syncing";
    ouraLabel = "Oura · syncing";
  } else if (error) {
    ouraPillState = "error";
    ouraLabel = "Oura · error";
  } else if (lastUpdated) {
    const mins = Math.round((Date.now() - lastUpdated) / 60000);
    ouraLabel =
      mins < 2 ? "Oura · just now"
        : mins < 60 ? `Oura · ${mins}m ago`
        : `Oura · ${Math.round(mins / 60)}h ago`;
  }
  if (isOffline) {
    ouraPillState = "error";
    ouraLabel = "Oura · offline";
  } else if (isStale) {
    ouraPillState = "syncing";
    ouraLabel = "Oura · stale";
  }

  const hasWithings = weight30.length > 0;
  const withingsPillState: "synced" | "syncing" | "error" = loading
    ? "syncing"
    : hasWithings ? "synced" : "error";
  const withingsLabel = loading
    ? "Withings · syncing"
    : hasWithings
      ? `Withings · ${weight30.length} readings`
      : "Withings · reconnect";

  // --- Briefing ---
  const sleepTime = data?.sleepTime?.find((t) => t.day === today);
  const bedtimeStart = sleepTime?.optimal_bedtime
    ? (() => {
        const s = sleepTime.optimal_bedtime.start_offset;
        const e = sleepTime.optimal_bedtime.end_offset;
        const toClock = (offset: number) => {
          const seconds = ((offset % 86400) + 86400) % 86400;
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        };
        return `${toClock(s)}–${toClock(e)}`;
      })()
    : "22:30–23:30";

  const briefingBig =
    todayReadiness && todayReadiness.score >= 80
      ? "Tonight, protect what's already working — a steady wind-down and a cool bedroom will bank another optimal recovery."
      : "Tonight, protect your sleep window. A 30-minute wind-down and a cool bedroom will push your recovery back into the optimal band.";

  const briefing: Array<{ t: string; v: string }> = [
    { t: "Dim lights after 9:30 pm", v: "tonight" },
    { t: "Finish caffeine before noon", v: "daily" },
    { t: "Short walk at sundown", v: "15 min" },
    { t: "Target bedtime", v: bedtimeStart.split("–")[0] },
    { t: "Wake window", v: bedtimeStart.includes("–") ? "06:45–07:15" : "07:00–07:30" },
  ];

  // --- Drawer contents helpers ---
  const closeDrawer = () => setDrawer(null);

  return (
    <div className="scandi scandi-root">
      <div className="scandi-page">
        <nav className="nav" aria-label="Primary">
          <div className="nav-left">
            <Link href="/dashboard" className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">Oura</span>
            </Link>
            <div className="nav-right" style={{ marginLeft: 32 }}>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link ${pathname === l.href || (l.href === "/dashboard" && pathname === "/") ? "is-active" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/settings" className="nav-link">
                Settings
              </Link>
            </div>
          </div>
          <div className="sync-group">
            <button
              className={`sync-pill ${ouraPillState === "syncing" ? "is-syncing" : ouraPillState === "error" ? "is-error" : ""}`}
              type="button"
              onClick={() => fetchData()}
              title="Refresh from Oura"
            >
              <span className="sync-dot" />
              <span>{ouraLabel}</span>
            </button>
            <Link
              href="/settings"
              className={`sync-pill ${withingsPillState === "syncing" ? "is-syncing" : withingsPillState === "error" ? "is-error" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <span className="sync-dot" />
              <span>{withingsLabel}</span>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className="hero-left">
            <div className="eyebrow">Today · {dateStr}</div>
            <div className="hero-score">
              <div className="value">{todayReadiness?.score || "—"}</div>
              <div className="out-of">/ 100 · Readiness</div>
            </div>
            <div className="hero-status">
              {status.prefix}
              <em>{status.emphasis}</em>
              {status.suffix}
            </div>
          </div>
          <div className="hero-right">
            <Vital
              label="Resting HR"
              value={restingHr ? String(Math.round(restingHr)) : "—"}
              unit="bpm"
              delta={
                hrRollingAvg
                  ? `${hrDelta >= 0 ? "+" : ""}${hrDelta} vs 14d avg`
                  : "no baseline yet"
              }
              deltaDir={hrDelta <= 0 ? "up" : "down"}
              spark={hrSeries}
              onClick={() => setDrawer("heart")}
            />
            <Vital
              label="HRV overnight"
              value={hrvNight ? String(Math.round(hrvNight)) : "—"}
              unit="ms"
              delta={
                hrvRollingAvg
                  ? `${hrvDelta >= 0 ? "+" : ""}${hrvDelta} vs baseline`
                  : "no baseline yet"
              }
              deltaDir={hrvDelta >= 0 ? "up" : "down"}
              spark={hrvSeries}
              onClick={() => setDrawer("heart")}
            />
            <Vital
              label="Sleep"
              value={formatSleepDuration(todaySleepPeriod?.total_sleep_duration)}
              unit=""
              delta={todaySleep?.score ? `Score ${todaySleep.score}` : "no score"}
              deltaDir={todaySleep && todaySleep.score >= 75 ? "up" : "down"}
              spark={sleepScoreSeries}
              onClick={() => setDrawer("sleep")}
            />
            <Vital
              label="Steps"
              value={(todayActivity?.steps ?? 0).toLocaleString()}
              unit=""
              delta={
                (todayActivity?.steps ?? 0) >= 10000
                  ? "Goal met"
                  : `${Math.max(0, 10000 - (todayActivity?.steps ?? 0)).toLocaleString()} to goal`
              }
              deltaDir={(todayActivity?.steps ?? 0) >= 10000 ? "up" : "down"}
              spark={stepsSeries}
              onClick={() => setDrawer("activity")}
            />
          </div>
        </section>

        {/* Stat row */}
        <div className="stat-row reveal">
          <div className="stat">
            <div className="v num">{streak}d</div>
            <div className="l">Streak · Readiness ≥ 75</div>
          </div>
          <div className="stat">
            <div className="v num">
              {weightChange > 0 ? "+" : ""}
              {weightChange || "0.0"}
              <span style={{ fontSize: 20, color: "var(--ink-3)" }}> kg</span>
            </div>
            <div className="l">Weight · {weight30.length}d</div>
          </div>
          <div className="stat">
            <div className="v num">
              {hrvVsBaseline > 0 ? "+" : ""}
              {hrvVsBaseline || 0}
              <span style={{ fontSize: 20, color: "var(--ink-3)" }}> ms</span>
            </div>
            <div className="l">HRV · 7d vs baseline</div>
          </div>
          <div className="stat">
            <div className="v num">{completeness}%</div>
            <div className="l">Data completeness · 30d</div>
          </div>
        </div>

        {/* Section head */}
        <div className="section-head reveal">
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              {range === "Day" ? "Today" : range === "Week" ? "This week" : "This month"}
            </div>
            <h2>A clearer picture of your body today.</h2>
            <div className="sub" style={{ marginTop: 10 }}>
              Synthesized from Oura and Withings. Hover any chart to inspect a point; click a card to drill in.
            </div>
          </div>
          <div className="range" role="tablist" aria-label="Time range">
            {(["Day", "Week", "Month"] as const).map((r) => (
              <button
                key={r}
                className={range === r ? "is-active" : ""}
                onClick={() => setRange(r)}
                role="tab"
                aria-selected={range === r}
                type="button"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid reveal">
          <SleepCard
            sleep={todaySleep}
            period={todaySleepPeriod}
            onExpand={() => setDrawer("sleep")}
          />
          <ReadinessCard
            readiness={todayReadiness}
            sleepPeriod={todaySleepPeriod}
            history={(data?.readiness || []).slice().sort((a, b) => a.day.localeCompare(b.day))}
            rangeDays={rangeDays}
            onExpand={() => setDrawer("readiness")}
          />
          <ActivityCard
            activity={todayActivity}
            history={data?.activity || []}
            today={today}
            onExpand={() => setDrawer("activity")}
          />
          <HeartCard sleepPeriod={todaySleepPeriod} onExpand={() => setDrawer("heart")} />
          <WeightCard weight={weight30} onExpand={() => setDrawer("weight")} />
          <TempCard
            readiness={todayReadiness}
            history={data?.readiness || []}
            onExpand={() => setDrawer("temp")}
          />
          <StressCard
            stress={data?.stress || []}
            today={today}
            onExpand={() => setDrawer("stress")}
          />
        </div>

        {/* Briefing */}
        <section className="briefing reveal">
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>Evening briefing</div>
            <div className="big">{briefingBig}</div>
          </div>
          <ul>
            {briefing.map((b, i) => (
              <li key={b.t}>
                <span className="idx num">{String(i + 1).padStart(2, "0")}</span>
                <span className="t">{b.t}</span>
                <span className="v">{b.v}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Drawers */}
      <Drawer
        open={drawer === "sleep"}
        title={`Sleep · ${dateStr}`}
        subtitle={todaySleepPeriod ? `${formatClock(todaySleepPeriod.bedtime_start)} → ${formatClock(todaySleepPeriod.bedtime_end)}` : undefined}
        onClose={closeDrawer}
      >
        <div className="kv-list">
          <KVRow k="Score" v={todaySleep?.score ?? "—"} />
          <KVRow k="Duration" v={formatSleepDuration(todaySleepPeriod?.total_sleep_duration)} />
          <KVRow k="Efficiency" v={todaySleepPeriod?.efficiency != null ? `${todaySleepPeriod.efficiency}%` : "—"} />
          <KVRow k="Latency" v={formatHM(todaySleepPeriod?.latency)} />
          <KVRow k="REM" v={formatHM(todaySleepPeriod?.rem_sleep_duration)} />
          <KVRow k="Deep" v={formatHM(todaySleepPeriod?.deep_sleep_duration)} />
          <KVRow k="Light" v={formatHM(todaySleepPeriod?.light_sleep_duration)} />
          <KVRow k="Awake" v={formatHM(todaySleepPeriod?.awake_time)} />
          <KVRow
            k="Lowest HR"
            v={todaySleepPeriod?.lowest_heart_rate ? `${todaySleepPeriod.lowest_heart_rate} bpm` : "—"}
          />
          <KVRow
            k="Avg HRV"
            v={todaySleepPeriod?.average_hrv ? `${Math.round(todaySleepPeriod.average_hrv)} ms` : "—"}
          />
          <KVRow
            k="Temperature"
            v={
              todayReadiness?.temperature_deviation != null
                ? `${todayReadiness.temperature_deviation > 0 ? "+" : ""}${todayReadiness.temperature_deviation.toFixed(1)} °C`
                : "—"
            }
          />
          <KVRow
            k="Respiratory rate"
            v={todaySleepPeriod?.average_breath ? `${todaySleepPeriod.average_breath.toFixed(1)} /min` : "—"}
          />
        </div>
        <Link href="/sleep" className="deep-link" onClick={closeDrawer}>
          Open full sleep page →
        </Link>
      </Drawer>

      <Drawer
        open={drawer === "readiness"}
        title="Readiness · Last 14 days"
        subtitle={todayReadiness ? `Today: ${todayReadiness.score}` : undefined}
        onClose={closeDrawer}
      >
        <LineChart
          data={readinessSeries}
          height={220}
          color="var(--ring-ready)"
          xFmt={(d) => `day ${d.i + 1}`}
          yFmt={(v) => `${v} score`}
        />
        <div className="kv-list" style={{ marginTop: 24 }}>
          <KVRow
            k="Today"
            v={todayReadiness ? `${todayReadiness.score} · ${todayReadiness.score >= 85 ? "optimal" : todayReadiness.score >= 70 ? "good" : "recovering"}` : "—"}
          />
          <KVRow k="7-day avg" v={Math.round(mean(readinessSeries.slice(-7).map((p) => p.v))) || "—"} />
          <KVRow k="30-day avg" v={Math.round(mean(readinessSeries.map((p) => p.v))) || "—"} />
          <KVRow k="Streak ≥ 75" v={`${streak} days`} />
        </div>
        <Link href="/readiness" className="deep-link" onClick={closeDrawer}>
          Open full readiness page →
        </Link>
      </Drawer>

      <Drawer
        open={drawer === "activity"}
        title="Activity · This week"
        onClose={closeDrawer}
      >
        <div className="kv-list">
          <KVRow k="Steps today" v={(todayActivity?.steps ?? 0).toLocaleString()} />
          <KVRow k="Active kcal" v={(todayActivity?.active_calories ?? 0).toLocaleString()} />
          <KVRow k="Total kcal" v={(todayActivity?.total_calories ?? 0).toLocaleString()} />
          <KVRow
            k="Medium+ minutes"
            v={Math.round(((todayActivity?.medium_activity_time ?? 0) + (todayActivity?.high_activity_time ?? 0)) / 60)}
          />
          <KVRow k="Inactive time" v={formatHM(todayActivity?.sedentary_time)} />
          <KVRow
            k="Weekly goal"
            v={(() => {
              const lastSeven = (data?.activity || [])
                .slice()
                .sort((a, b) => a.day.localeCompare(b.day))
                .slice(-7);
              const hits = lastSeven.filter((a) => (a.steps ?? 0) >= 10000).length;
              return `${hits} of ${lastSeven.length || 7} days`;
            })()}
          />
        </div>
        <Link href="/activity" className="deep-link" onClick={closeDrawer}>
          Open full activity page →
        </Link>
      </Drawer>

      <Drawer
        open={drawer === "heart"}
        title="Cardiac · overnight"
        onClose={closeDrawer}
      >
        <div className="kv-list">
          <KVRow
            k="Lowest HR"
            v={todaySleepPeriod?.lowest_heart_rate ? `${todaySleepPeriod.lowest_heart_rate} bpm` : "—"}
          />
          <KVRow
            k="Avg HR"
            v={todaySleepPeriod?.average_heart_rate ? `${Math.round(todaySleepPeriod.average_heart_rate)} bpm` : "—"}
          />
          <KVRow
            k="Avg HRV"
            v={todaySleepPeriod?.average_hrv ? `${Math.round(todaySleepPeriod.average_hrv)} ms` : "—"}
          />
          <KVRow
            k="HR 14d avg"
            v={hrRollingAvg ? `${Math.round(hrRollingAvg)} bpm` : "—"}
          />
          <KVRow
            k="HRV 14d avg"
            v={hrvRollingAvg ? `${Math.round(hrvRollingAvg)} ms` : "—"}
          />
        </div>
        <Link href="/heart-rate" className="deep-link" onClick={closeDrawer}>
          Open full heart-rate page →
        </Link>
      </Drawer>

      <Drawer
        open={drawer === "weight"}
        title="Weight · 30 days"
        onClose={closeDrawer}
      >
        {weight30.length > 0 ? (
          <>
            <LineChart
              data={weight30
                .slice()
                .sort((a, b) => a.day.localeCompare(b.day))
                .map((w, i) => ({ i, v: w.weight }))}
              height={220}
              color="var(--ink)"
              xFmt={(d) => `${weight30.length - d.i - 1}d ago`}
              yFmt={(v) => `${v.toFixed(1)} kg`}
            />
            <div className="kv-list" style={{ marginTop: 24 }}>
              <KVRow
                k="Current"
                v={`${weight30[weight30.length - 1].weight.toFixed(1)} kg`}
              />
              <KVRow k={`${weight30.length}d change`} v={`${weightChange >= 0 ? "+" : ""}${weightChange} kg`} />
              {weight30[weight30.length - 1].fat_ratio != null && (
                <KVRow k="Body fat" v={`${weight30[weight30.length - 1].fat_ratio!.toFixed(1)}%`} />
              )}
              {weight30[weight30.length - 1].muscle_mass != null && (
                <KVRow k="Muscle" v={`${weight30[weight30.length - 1].muscle_mass!.toFixed(1)} kg`} />
              )}
              {weight30[weight30.length - 1].water_percentage != null && (
                <KVRow k="Water" v={`${weight30[weight30.length - 1].water_percentage!.toFixed(1)}%`} />
              )}
              {weight30[weight30.length - 1].bmi != null && (
                <KVRow k="BMI" v={weight30[weight30.length - 1].bmi!.toFixed(1)} />
              )}
            </div>
          </>
        ) : (
          <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }}>
            No Withings weight readings yet. Connect your Withings account in Settings to start tracking body composition.
          </p>
        )}
        <Link href="/weight" className="deep-link" onClick={closeDrawer}>
          Open full weight page →
        </Link>
      </Drawer>

      <Drawer
        open={drawer === "temp"}
        title="Temperature · 14 days"
        onClose={closeDrawer}
      >
        <LineChart
          data={(data?.readiness || [])
            .slice()
            .sort((a, b) => a.day.localeCompare(b.day))
            .slice(-14)
            .map((r, i) => ({ i, v: Number((r.temperature_deviation ?? 0).toFixed(2)) }))}
          height={220}
          color="var(--warm)"
          area={false}
          xFmt={(d) => `day ${d.i + 1}`}
          yFmt={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} °C`}
        />
        <p style={{ marginTop: 24, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Body-temperature deviation tracks how far today drifts from your own rolling baseline. Stable thermoregulation
          within ±0.3 °C is a sign of good recovery; persistent drift can signal illness, overtraining, or cycle phase.
        </p>
      </Drawer>

      <Drawer
        open={drawer === "stress"}
        title="Stress · today"
        onClose={closeDrawer}
      >
        {(() => {
          const s = data?.stress?.find((x) => x.day === today);
          if (!s) {
            return (
              <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }}>
                No stress reading for today yet. Stress data builds from your heart-rate variability and skin-temperature
                patterns while you wear the ring.
              </p>
            );
          }
          return (
            <div className="kv-list">
              <KVRow k="Day summary" v={s.day_summary} />
              <KVRow k="Stress high" v={formatHM(s.stress_high)} />
              <KVRow k="Recovery high" v={formatHM(s.recovery_high)} />
              <KVRow k="Daytime recovery" v={formatHM(s.daytime_recovery)} />
            </div>
          );
        })()}
        <Link href="/stress" className="deep-link" onClick={closeDrawer}>
          Open full stress page →
        </Link>
      </Drawer>
    </div>
  );
}
