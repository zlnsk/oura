"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeSelector } from "@/components/ui/DateRangeSelector";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { ScoreCard } from "@/components/ui/ScoreCard";
import { TrendRow } from "@/components/ui/TrendRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingGrid } from "@/components/ui/LoadingGrid";
import { LazyScoreLineChart as ScoreLineChart, LazyMultiLineChart as MultiLineChart, LazyDualIntradayChart as DualIntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import {
  LayoutDashboard,
  BedDouble,
  Footprints,
  Heart,
  Wind,
  RefreshCw,
  Zap,
  Activity,
} from "lucide-react";
import { average, trend } from "@/lib/utils";
import { AISummaryCard } from "@/components/ui/AISummaryCard";
import { OnboardingGuard } from "@/components/ui/OnboardingGuard";
import { GoalTracker } from "@/components/ui/GoalTracker";
import { CorrelationInsights } from "@/components/ui/CorrelationInsights";
import { ExportButton } from "@/components/ui/ExportButton";
import { COLORS } from "@/lib/constants";

import { Component, type ReactNode, type ErrorInfo } from "react";

class ChartErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Chart failed to load:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-[var(--m3-outline-variant)] p-6 text-center text-sm text-[var(--m3-on-surface-variant)]">
          Chart failed to load. Try refreshing the page.
        </div>
      );
    }
    return this.props.children;
  }
}

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getToday(): string {
  return getDateStr(new Date());
}

function deltaOf(values: number[]): number {
  const clean = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (clean.length < 2) return 0;
  const last = clean[clean.length - 1];
  const baseline = average(clean.slice(0, -1));
  if (!baseline) return 0;
  return Math.round((last - baseline) * 10) / 10;
}

export default function DashboardPage() {
  const { data, loading, error, fetchData, lastUpdated } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const prevDate = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return getDateStr(d);
  }, [selectedDate]);

  const todayMetrics = useMemo(() => ({
    sleep: data?.sleep?.find((s) => s.day === selectedDate),
    sleepPeriod: data?.sleepPeriods?.find((s) => s.day === selectedDate && s.type === "long_sleep"),
    readiness: data?.readiness?.find((r) => r.day === selectedDate),
    activity: data?.activity?.find((a) => a.day === selectedDate),
  }), [data, selectedDate]);

  const todaySleep = todayMetrics.sleep;
  const todaySleepPeriod = todayMetrics.sleepPeriod;
  const todayReadiness = todayMetrics.readiness;
  const todayActivity = todayMetrics.activity;

  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  const wakeTimeLabel = useMemo(() => {
    return wakeTime ? wakeTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : null;
  }, [wakeTime]);

  const combinedIntradayData = useMemo(() => {
    const timeMap = new Map<string, { time: string; hr?: number; met?: number; ts: number }>();
    const wakeTs = wakeTime?.getTime() || 0;

    const nextBedtime = data?.sleepPeriods?.find(sp =>
      sp.type === 'long_sleep' && sp.bedtime_start?.startsWith(selectedDate)
    );
    const endTs = nextBedtime ? new Date(nextBedtime.bedtime_start).getTime() : Date.now();

    if (data?.heartRate) {
      for (const hr of data.heartRate) {
        if (!hr.timestamp.startsWith(selectedDate)) continue;
        const t = new Date(hr.timestamp);
        if (wakeTs && t.getTime() < wakeTs) continue;
        if (t.getTime() > endTs) continue;
        const timeLabel = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
        const existing = timeMap.get(timeLabel);
        if (existing) {
          existing.hr = hr.bpm;
        } else {
          timeMap.set(timeLabel, { time: timeLabel, hr: hr.bpm, ts: t.getTime() });
        }
      }
    }

    if (todayActivity?.met) {
      const { interval, items, timestamp } = todayActivity.met;
      const start = new Date(timestamp);
      for (let i = 0; i < items.length; i++) {
        if (items[i] <= 0) continue;
        const t = new Date(start.getTime() + i * interval * 1000);
        if (wakeTs && t.getTime() < wakeTs) continue;
        if (t.getTime() > endTs) continue;
        const timeLabel = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
        const val = Math.round(items[i] * 10) / 10;
        const existing = timeMap.get(timeLabel);
        if (existing) {
          existing.met = val;
        } else {
          timeMap.set(timeLabel, { time: timeLabel, met: val, ts: t.getTime() });
        }
      }
    }

    return Array.from(timeMap.values()).sort((a, b) => a.ts - b.ts);
  }, [data?.heartRate, data?.sleepPeriods, todayActivity?.met, selectedDate, wakeTime]);

  // Trend series (last N days)
  const sleepSeries = useMemo(
    () => (data?.sleep?.map((s) => s.score).filter((v) => typeof v === "number") as number[]) || [],
    [data]
  );
  const stepsSeries = useMemo(
    () => (data?.activity?.map((a) => a.steps).filter((v) => typeof v === "number") as number[]) || [],
    [data]
  );
  const hrSeries = useMemo(
    () =>
      (data?.sleepPeriods
        ?.filter((s) => s.type === "long_sleep")
        .map((s) => s.average_heart_rate)
        .filter((v) => typeof v === "number") as number[]) || [],
    [data]
  );
  const hrvSeries = useMemo(
    () =>
      (data?.sleepPeriods
        ?.filter((s) => s.type === "long_sleep")
        .map((s) => s.average_hrv)
        .filter((v) => typeof v === "number") as number[]) || [],
    [data]
  );

  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardShell>
      <OnboardingGuard>
      <PageHeader
        title="Dashboard"
        subtitle={dateLabel}
        icon={LayoutDashboard}
        iconColor={COLORS.brand}
        action={
          <div className="flex items-center gap-3">
            <ExportButton page="dashboard" />
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            {lastUpdated && (
              <span className="text-[10px] text-[var(--m3-on-surface-variant)] hidden sm:block">
                Updated {new Date(lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-full p-2 hover:bg-[color-mix(in_srgb,var(--m3-on-surface)_8%,transparent)] transition-colors"
              title="Refresh data from Oura"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {loading && !data && <LoadingGrid />}

      {!loading && !data && <EmptyState />}
      {error && !data && <EmptyState />}

      {data && (
        <div className="space-y-8">
          {/* Score rings — 3-col on md+ so three score cards fill the row uniformly */}
          <section aria-labelledby="scores-heading" className="space-y-4">
            <h2
              id="scores-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)]"
            >
              Today
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {todaySleep && todaySleep.score > 0 && (
                <ScoreCard
                  label="Sleep"
                  score={todaySleep.score}
                  icon={BedDouble}
                  accent={COLORS.sleep}
                  hint={
                    todaySleepPeriod
                      ? `${Math.floor(todaySleepPeriod.total_sleep_duration / 3600)}h ${Math.floor(
                          (todaySleepPeriod.total_sleep_duration % 3600) / 60
                        )}m in bed`
                      : undefined
                  }
                />
              )}
              {todayReadiness && todayReadiness.score > 0 && (
                <ScoreCard
                  label="Readiness"
                  score={todayReadiness.score}
                  icon={Zap}
                  accent={COLORS.readiness}
                  hint={
                    todayReadiness.contributors?.hrv_balance
                      ? `HRV balance ${todayReadiness.contributors.hrv_balance}`
                      : undefined
                  }
                />
              )}
              {todayActivity && todayActivity.score > 0 && (
                <ScoreCard
                  label="Activity"
                  score={todayActivity.score}
                  icon={Activity}
                  accent={COLORS.activity}
                  hint={
                    typeof todayActivity.steps === "number"
                      ? `${todayActivity.steps.toLocaleString()} steps`
                      : undefined
                  }
                />
              )}
            </div>
          </section>

          {/* Goals */}
          <GoalTracker
            sleepScore={todaySleep?.score}
            steps={todayActivity?.steps}
            readinessScore={todayReadiness?.score}
          />

          {/* AI Summary */}
          <AISummaryCard page="dashboard" data={data} />

          {/* Trends — list of rows with sparkline + delta pill */}
          <section aria-labelledby="trends-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="trends-heading"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)]"
              >
                Trends
              </h2>
              <DateRangeSelector />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {sleepSeries.length > 0 && (
                <TrendRow
                  label="Sleep score"
                  value={Math.round(average(sleepSeries))}
                  icon={BedDouble}
                  accent={COLORS.sleep}
                  series={sleepSeries}
                  delta={deltaOf(sleepSeries)}
                  deltaPositive={trend(sleepSeries) === "up"}
                />
              )}
              {stepsSeries.length > 0 && (
                <TrendRow
                  label="Steps"
                  value={Math.round(average(stepsSeries)).toLocaleString()}
                  icon={Footprints}
                  accent={COLORS.steps}
                  series={stepsSeries}
                  delta={Math.round(deltaOf(stepsSeries))}
                  deltaPositive={trend(stepsSeries) === "up"}
                />
              )}
              {hrSeries.length > 0 && (
                <TrendRow
                  label="Resting heart rate"
                  value={Math.round(average(hrSeries))}
                  unit="bpm"
                  icon={Heart}
                  accent={COLORS.heartRate}
                  series={hrSeries}
                  delta={deltaOf(hrSeries)}
                  deltaUnit=" bpm"
                  deltaPositive={trend(hrSeries) === "down"}
                />
              )}
              {hrvSeries.length > 0 && (
                <TrendRow
                  label="HRV"
                  value={Math.round(average(hrvSeries))}
                  unit="ms"
                  icon={Wind}
                  accent={COLORS.hrv}
                  series={hrvSeries}
                  delta={deltaOf(hrvSeries)}
                  deltaUnit=" ms"
                  deltaPositive={trend(hrvSeries) === "up"}
                />
              )}
            </div>
          </section>

          {/* Intraday */}
          {combinedIntradayData.length > 0 && (
            <ChartErrorBoundary>
              <DualIntradayChart
                data={combinedIntradayData}
                title={wakeTimeLabel ? `Heart Rate & MET (since ${wakeTimeLabel})` : "Heart Rate & MET"}
              />
            </ChartErrorBoundary>
          )}

          {/* Charts — deeper detail */}
          <section aria-labelledby="charts-heading" className="space-y-4">
            <h2
              id="charts-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)]"
            >
              Detail
            </h2>
            <ChartErrorBoundary>
              <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ChartSkeleton /><ChartSkeleton /></div>}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ScoreLineChart
                    data={data.sleep}
                    title="Sleep Score"
                    color={COLORS.sleep}
                    gradientId="sleepGrad"
                    domain={[40, 100]}
                  />
                  <ScoreLineChart
                    data={data.readiness}
                    title="Readiness Score"
                    color={COLORS.readiness}
                    gradientId="readinessGrad"
                    domain={[40, 100]}
                  />
                  <ScoreLineChart
                    data={data.activity}
                    title="Activity Score"
                    color={COLORS.activity}
                    gradientId="activityGrad"
                    domain={[40, 100]}
                  />
                  <MultiLineChart
                    data={data.sleepPeriods.map((s) => ({
                      day: s.day,
                      hr: s.average_heart_rate,
                      hrv: s.average_hrv,
                    }))}
                    lines={[
                      { key: "hr", color: COLORS.heartRate, name: "Heart Rate" },
                      { key: "hrv", color: COLORS.hrv, name: "HRV" },
                    ]}
                    title="Heart Rate & HRV (sleep)"
                  />
                </div>
              </Suspense>
            </ChartErrorBoundary>
          </section>

          <CorrelationInsights data={data} />
        </div>
      )}
      </OnboardingGuard>
    </DashboardShell>
  );
}
