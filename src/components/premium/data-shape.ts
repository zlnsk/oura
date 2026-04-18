import type { DashboardData, SleepPeriod } from "@/types/oura";

export interface Point { i: number; v: number }

/** Return ISO (YYYY-MM-DD) for a Date. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The most recent day we have any Oura daily data for. Fallback: today. */
export function mostRecentDay(data: DashboardData | null): string {
  const today = toDateStr(new Date());
  if (!data) return today;
  const pools = [data.readiness, data.sleep, data.activity];
  const hasToday = pools.some((pool) => pool?.some((d) => d.day === today));
  if (hasToday) return today;
  const all: string[] = [];
  for (const pool of pools) if (pool) for (const d of pool) if (d.day) all.push(d.day);
  if (all.length === 0) return today;
  all.sort();
  return all[all.length - 1];
}

/** Pick the long_sleep period ending on the given day (i.e. last night's sleep). */
export function sleepPeriodFor(data: DashboardData | null, day: string): SleepPeriod | undefined {
  if (!data?.sleepPeriods) return undefined;
  return data.sleepPeriods.find((p) => p.day === day && p.type === "long_sleep") ||
    data.sleepPeriods.find((p) => p.day === day);
}

/** Convert a numeric series to {i, v} points for the charts. */
export function toPoints(values: Array<number | null | undefined>): Point[] {
  const clean: Point[] = [];
  values.forEach((v, i) => {
    if (typeof v === "number" && Number.isFinite(v)) clean.push({ i, v });
  });
  return clean;
}

/** Expand intraday interval-series (items, interval, timestamp) into points with labels. */
export function intradayPoints(
  series: { interval: number; items: number[]; timestamp: string } | undefined,
): { points: Point[]; labels: string[] } {
  if (!series || !series.items) return { points: [], labels: [] };
  const start = new Date(series.timestamp).getTime();
  const points: Point[] = [];
  const labels: string[] = [];
  series.items.forEach((raw, idx) => {
    if (raw === null || raw === undefined || raw <= 0) return;
    const ts = new Date(start + idx * series.interval * 1000);
    points.push({ i: idx, v: Math.round(raw) });
    labels.push(
      ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  });
  return { points, labels };
}

/**
 * Pair two intraday series by source index. Only indices where BOTH values are
 * non-zero/valid are kept, and the output indices are re-based to 0..n so
 * LineChart/HRRibbon scales linearly across the kept range.
 */
export function pairedIntraday(
  a: { interval: number; items: number[]; timestamp: string } | undefined,
  b: { interval: number; items: number[]; timestamp: string } | undefined,
): { a: Point[]; b: Point[]; labels: string[] } {
  if (!a?.items || !b?.items) return { a: [], b: [], labels: [] };
  const start = new Date(a.timestamp).getTime();
  const interval = a.interval;
  const n = Math.min(a.items.length, b.items.length);
  const aOut: Point[] = [];
  const bOut: Point[] = [];
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    const av = a.items[i];
    const bv = b.items[i];
    if (av == null || bv == null || av <= 0 || bv <= 0) continue;
    const ts = new Date(start + i * interval * 1000);
    const outI = aOut.length;
    aOut.push({ i: outI, v: Math.round(av) });
    bOut.push({ i: outI, v: Math.round(bv) });
    labels.push(
      ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  }
  return { a: aOut, b: bOut, labels };
}

export function formatSleepDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatHM(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatClock(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/** Readiness ≥ 75 streak ending on the selected day. */
export function readinessStreak(data: DashboardData | null, onOrBefore: string): number {
  if (!data?.readiness) return 0;
  const asc = [...data.readiness].sort((a, b) => a.day.localeCompare(b.day));
  const idx = asc.findIndex((r) => r.day === onOrBefore);
  const cutoff = idx >= 0 ? idx : asc.length - 1;
  let count = 0;
  for (let i = cutoff; i >= 0; i--) {
    if ((asc[i].score ?? 0) >= 75) count++;
    else break;
  }
  return count;
}

/** data-completeness: fraction of the last 30 days that have a readiness score. */
export function dataCompleteness(data: DashboardData | null, window: number = 30): number {
  if (!data?.readiness || window === 0) return 0;
  const end = new Date();
  const days: string[] = [];
  for (let i = 0; i < window; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  const present = days.filter((d) => data.readiness.some((r) => r.day === d && r.score > 0));
  return Math.round((present.length / window) * 100);
}

export function mean(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!clean.length) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

/** Build a 7-day step series ending on `day`. Missing days get 0. Returns [{d:"Mon", v:N}]. */
export function last7Steps(
  activity: DashboardData["activity"] | null | undefined,
  day: string,
): Array<{ d: string; v: number; isToday: boolean }> {
  const end = new Date(day + "T12:00:00");
  const out: Array<{ d: string; v: number; isToday: boolean }> = [];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = toDateStr(d);
    const hit = activity?.find((a) => a.day === iso);
    out.push({
      d: WEEKDAYS[d.getDay()],
      v: hit?.steps ?? 0,
      isToday: iso === day,
    });
  }
  return out;
}

function timeOfDayGreeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Late night.";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 22) return "Good evening.";
  return "Late evening.";
}

/** Hero coaching status line built from real data. */
export function coachingLine(params: {
  readiness?: number;
  hrv?: number;
  sleepScore?: number;
  tempDev?: number;
  now?: Date;
}): { prefix: string; emphasis: string; suffix: string } {
  const { readiness = 0, hrv = 0, sleepScore = 0, tempDev = 0, now } = params;
  const greeting = timeOfDayGreeting(now);
  if (readiness >= 85 && sleepScore >= 80) {
    return {
      prefix: `${greeting} You slept deeply and your HRV is balanced — `,
      emphasis: "today favors focus and a hard session",
      suffix: ".",
    };
  }
  if (readiness >= 70) {
    return {
      prefix: `${greeting} A solid recovery night. `,
      emphasis: "today favors focus and a moderate session",
      suffix: ".",
    };
  }
  if (tempDev > 0.4) {
    return {
      prefix: `${greeting} Your body temperature is elevated. `,
      emphasis: "keep it light and hydrate well",
      suffix: ".",
    };
  }
  if (hrv > 0 && hrv < 35) {
    return {
      prefix: `${greeting} HRV is low this morning. `,
      emphasis: "take a rest day or keep intensity easy",
      suffix: ".",
    };
  }
  if (readiness === 0) {
    return {
      prefix: `${greeting} No readiness reading yet — `,
      emphasis: "sync your ring and check back",
      suffix: ".",
    };
  }
  return {
    prefix: `${greeting} Your body is in recovery mode. `,
    emphasis: "take it easy, and protect your sleep tonight",
    suffix: ".",
  };
}
