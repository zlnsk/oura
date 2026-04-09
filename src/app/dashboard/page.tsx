"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeSelector } from "@/components/ui/DateRangeSelector";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingGrid } from "@/components/ui/LoadingGrid";
import { LazyScoreLineChart as ScoreLineChart, LazyMultiLineChart as MultiLineChart, LazyDualIntradayChart as DualIntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import {
  LayoutDashboard,
  BedDouble,
  Footprints,
  Heart,
  Flame,
  Wind,
  RefreshCw,
  Moon,
  Sun,
  Clock,
  Zap,
  Activity,
  Target,
} from "lucide-react";
import { average, trend, formatDuration } from "@/lib/utils";
import { AISummaryCard } from "@/components/ui/AISummaryCard";
import { OnboardingGuard } from "@/components/ui/OnboardingGuard";
import { HealthScoreWidget } from "@/components/ui/HealthScoreWidget";
import { GoalTracker } from "@/components/ui/GoalTracker";
import { CorrelationInsights } from "@/components/ui/CorrelationInsights";
import { ExportButton } from "@/components/ui/ExportButton";
import { COLORS } from "@/lib/constants";
import type { SleepPeriod, DailySleep, DailyActivity, DailyReadiness } from "@/types/oura";

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
        <div className="premium-card p-6 text-center text-sm text-gray-500 dark:text-gray-400">
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

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function SleepStageBar({
  label,
  minutes,
  totalMinutes,
  color,
}: {
  label: string;
  minutes: number;
  totalMinutes: number;
  color: string;
}) {
  const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium tabular-nums">
          {Math.floor(minutes / 60)}h {minutes % 60}m
          <span className="text-gray-400 dark:text-gray-500 ml-1">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ContributorBar({ label, value }: { label: string; value: number }) {
  const barColor = value >= 85 ? COLORS.optimal : value >= 70 ? COLORS.good : COLORS.attention;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function TodayProgress({
  todaySleep,
  todaySleepPeriod,
  todayActivity,
  todayReadiness,
  combinedIntradayData,
  wakeTimeLabel,
  selectedDate,
}: {
  todaySleep: DailySleep | undefined;
  todaySleepPeriod: SleepPeriod | undefined;
  todayActivity: DailyActivity | undefined;
  todayReadiness: DailyReadiness | undefined;
  combinedIntradayData: { time: string; hr?: number; met?: number }[];
  wakeTimeLabel: string | null;
  selectedDate: string;
}) {
  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const dateStr = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const today = getToday();
  const isToday = selectedDate === today;
  const now = new Date();
  const hour = now.getHours();
  const greeting = isToday
    ? (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening")
    : dateStr;

  // Determine if we're showing today's data or the latest available
  const dataDay = todaySleep?.day || todayActivity?.day || todayReadiness?.day;

  const hasSleep = todaySleepPeriod && todaySleepPeriod.total_sleep_duration > 0;
  const hasActivity = todayActivity && todayActivity.score > 0;
  const hasReadiness = todayReadiness && todayReadiness.score > 0;

  if (!hasSleep && !hasActivity && !hasReadiness) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-[var(--border)] flex items-center justify-center">
            <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{greeting}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{dateStr}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          No data available yet. Your progress will appear here once Oura syncs.
        </p>
      </div>
    );
  }

  // Sleep stage breakdown in minutes
  const deepMin = hasSleep ? Math.round(todaySleepPeriod.deep_sleep_duration / 60) : 0;
  const remMin = hasSleep ? Math.round(todaySleepPeriod.rem_sleep_duration / 60) : 0;
  const lightMin = hasSleep ? Math.round(todaySleepPeriod.light_sleep_duration / 60) : 0;
  const awakeMin = hasSleep ? Math.round(todaySleepPeriod.awake_time / 60) : 0;
  const totalMin = deepMin + remMin + lightMin + awakeMin;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-[var(--border)] flex items-center justify-center">
              <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{greeting}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dateStr}
                {!isToday && dataDay && (
                  <span className="ml-2 text-amber-500">
                    &middot; Showing data from {new Date(dataDay + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {todaySleep && (
              <ScoreRing score={todaySleep.score} size={64} label="Sleep" />
            )}
            {hasActivity && (
              <ScoreRing score={todayActivity.score} size={64} label="Activity" />
            )}
            {hasReadiness && (
              <ScoreRing score={todayReadiness.score} size={64} label="Readiness" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last Night's Sleep */}
        {hasSleep && (
          <div className="premium-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Last Night&apos;s Sleep
              </h3>
            </div>

            {/* Bedtime / Wake time row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center p-3 rounded-xl inset-cell">
                <Clock className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Bedtime</p>
                <p className="text-sm font-semibold mt-0.5">
                  {formatTime(todaySleepPeriod.bedtime_start)}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl inset-cell">
                <Sun className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Wake up</p>
                <p className="text-sm font-semibold mt-0.5">
                  {formatTime(todaySleepPeriod.bedtime_end)}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl inset-cell">
                <BedDouble className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-sm font-semibold mt-0.5">
                  {formatDuration(todaySleepPeriod.total_sleep_duration)}
                </p>
              </div>
            </div>

            {/* Sleep stages */}
            <div className="space-y-2.5">
              <SleepStageBar label="Deep" minutes={deepMin} totalMinutes={totalMin} color={COLORS.deep} />
              <SleepStageBar label="REM" minutes={remMin} totalMinutes={totalMin} color={COLORS.rem} />
              <SleepStageBar label="Light" minutes={lightMin} totalMinutes={totalMin} color={COLORS.light} />
              <SleepStageBar label="Awake" minutes={awakeMin} totalMinutes={totalMin} color={COLORS.awake} />
            </div>

            {/* Sleep vitals */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[var(--border)]">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Efficiency</p>
                <p className="text-sm font-semibold mt-0.5">{todaySleepPeriod.efficiency}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg HR</p>
                <p className="text-sm font-semibold mt-0.5">
                  {Math.round(todaySleepPeriod.average_heart_rate)} <span className="text-xs font-normal text-gray-400">bpm</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">HRV</p>
                <p className="text-sm font-semibold mt-0.5">
                  {Math.round(todaySleepPeriod.average_hrv)} <span className="text-xs font-normal text-gray-400">ms</span>
                </p>
              </div>
            </div>

            {/* Sleep score contributors */}
            {todaySleep && todaySleep.contributors && (
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Score Contributors</p>
                <div className="space-y-2">
                  <ContributorBar label="Deep sleep" value={todaySleep.contributors.deep_sleep} />
                  <ContributorBar label="REM sleep" value={todaySleep.contributors.rem_sleep} />
                  <ContributorBar label="Efficiency" value={todaySleep.contributors.efficiency} />
                  <ContributorBar label="Restfulness" value={todaySleep.contributors.restfulness} />
                  <ContributorBar label="Timing" value={todaySleep.contributors.timing} />
                  <ContributorBar label="Latency" value={todaySleep.contributors.latency} />
                </div>
              </div>
            )}

          </div>
        )}

        {/* Today's Readiness & Activity */}
        <div className="space-y-4">
          {/* Readiness */}
          {hasReadiness && (
            <div className="premium-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Readiness
                </h3>
              </div>
              <div className="space-y-2">
                <ContributorBar label="HRV Balance" value={todayReadiness.contributors.hrv_balance} />
                <ContributorBar label="Resting HR" value={todayReadiness.contributors.resting_heart_rate} />
                <ContributorBar label="Body Temperature" value={todayReadiness.contributors.body_temperature} />
                <ContributorBar label="Recovery Index" value={todayReadiness.contributors.recovery_index} />
                <ContributorBar label="Sleep Balance" value={todayReadiness.contributors.sleep_balance} />
                <ContributorBar label="Previous Night" value={todayReadiness.contributors.previous_night} />
                <ContributorBar label="Activity Balance" value={todayReadiness.contributors.activity_balance} />
              </div>
            </div>
          )}

          {/* Activity */}
          {hasActivity && (
            <div className="premium-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Activity
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl inset-cell">
                  <Footprints className="w-3.5 h-3.5 text-emerald-500 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Steps</p>
                  <p className="text-sm font-semibold">{todayActivity.steps.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl inset-cell">
                  <Flame className="w-3.5 h-3.5 text-orange-500 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Burn</p>
                  <p className="text-sm font-semibold">{todayActivity.total_calories.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl inset-cell">
                  <Target className="w-3.5 h-3.5 text-blue-500 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Calories</p>
                  <p className="text-sm font-semibold">{todayActivity.active_calories.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl inset-cell">
                  <Clock className="w-3.5 h-3.5 text-violet-500 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Time</p>
                  <p className="text-sm font-semibold">
                    {formatDuration(todayActivity.high_activity_time + todayActivity.medium_activity_time + todayActivity.low_activity_time)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <ContributorBar label="Stay Active" value={todayActivity.contributors.stay_active} />
                <ContributorBar label="Move Every Hour" value={todayActivity.contributors.move_every_hour} />
                <ContributorBar label="Daily Targets" value={todayActivity.contributors.meet_daily_targets} />
                <ContributorBar label="Training Frequency" value={todayActivity.contributors.training_frequency} />
                <ContributorBar label="Training Volume" value={todayActivity.contributors.training_volume} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combined HR & MET Chart */}
      {combinedIntradayData.length > 0 && (
        <DualIntradayChart
          data={combinedIntradayData}
          title={wakeTimeLabel ? `Heart Rate & MET (since ${wakeTimeLabel})` : "Heart Rate & MET"}
        />
      )}
    </div>
  );
}


export default function DashboardPage() {
  const { data, loading, error, fetchData, lastUpdated } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute previous day for sleep lookback
  const prevDate = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return getDateStr(d);
  }, [selectedDate]);

  // Consolidate today's metrics into a single useMemo to reduce hook overhead
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

  // Find wake-up time from sleep period
  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  const wakeTimeLabel = useMemo(() => {
    return wakeTime ? wakeTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  }, [wakeTime]);

  // Combined HR + MET data from wake time until bedtime
  const combinedIntradayData = useMemo(() => {
    const timeMap = new Map<string, { time: string; hr?: number; met?: number; ts: number }>();
    const wakeTs = wakeTime?.getTime() || 0;

    // Find next bedtime (when user goes to sleep) to cap chart
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
        const timeLabel = t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
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
        const timeLabel = t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
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

  const sleepScores = useMemo(
    () => data?.sleep?.map((s) => s.score).filter(Boolean) || [],
    [data]
  );
  const avgSteps = useMemo(
    () => average(data?.activity?.map((a) => a.steps) || []),
    [data]
  );

  return (
    <DashboardShell>
      <OnboardingGuard>
      <PageHeader
        title="Dashboard"
        subtitle={new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        icon={LayoutDashboard}
        iconColor={COLORS.brand}
        action={
          <div className="flex items-center gap-3">
            <ExportButton page="dashboard" />
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            {lastUpdated && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">
                Updated {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-full p-2 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
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
        <div className="space-y-6">
          {/* Unified Health Score */}
          <HealthScoreWidget
            sleepScore={todaySleep?.score || 0}
            activityScore={todayActivity?.score || 0}
            readinessScore={todayReadiness?.score || 0}
          />

          {/* AI Summary */}
          <AISummaryCard page="dashboard" data={data} />

          {/* Goals */}
          <GoalTracker
            sleepScore={todaySleep?.score}
            steps={todayActivity?.steps}
            readinessScore={todayReadiness?.score}
          />

          {/* Today's Progress */}
          <TodayProgress
            todaySleep={todaySleep}
            todaySleepPeriod={todaySleepPeriod}
            todayActivity={todayActivity}
            todayReadiness={todayReadiness}
            combinedIntradayData={combinedIntradayData}
            wakeTimeLabel={wakeTimeLabel}
            selectedDate={selectedDate}
          />

          {/* Trends section */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trends</h2>
            <DateRangeSelector />
          </div>

          {/* Period averages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Avg Sleep Score"
              value={average(sleepScores)}
              icon={BedDouble}
              color={COLORS.sleep}
              trend={trend(data.sleep.map((s) => s.score))}
              trendLabel={`Latest ${todaySleep?.score || "--"}`}
              trendPositive={trend(data.sleep.map((s) => s.score)) === "up"}
            />
            <StatCard
              label="Avg Steps"
              value={avgSteps.toLocaleString()}
              icon={Footprints}
              color={COLORS.steps}
              trend={trend(data.activity.map((a) => a.steps))}
              trendLabel={`Latest ${todayActivity?.steps?.toLocaleString() || "--"}`}
              trendPositive={trend(data.activity.map((a) => a.steps)) === "up"}
            />
            <StatCard
              label="Avg Resting HR"
              value={average(data.sleepPeriods.filter((s) => s.type === "long_sleep").map((s) => s.average_heart_rate)) || "--"}
              unit="bpm"
              icon={Heart}
              color={COLORS.heartRate}
              trend={trend(data.sleepPeriods.filter((s) => s.type === "long_sleep").map((s) => s.average_heart_rate))}
              trendLabel={`Last night ${todaySleepPeriod ? Math.round(todaySleepPeriod.average_heart_rate) : "--"}`}
              trendPositive={trend(data.sleepPeriods.filter((s) => s.type === "long_sleep").map((s) => s.average_heart_rate)) === "down"}
            />
            <StatCard
              label="Avg HRV"
              value={average(data.sleepPeriods.filter((s) => s.type === "long_sleep").map((s) => s.average_hrv)) || "--"}
              unit="ms"
              icon={Wind}
              color={COLORS.hrv}
              trend={trend(data.sleepPeriods.filter((s) => s.type === "long_sleep").map((s) => s.average_hrv))}
              trendLabel={`Last night ${todaySleepPeriod ? Math.round(todaySleepPeriod.average_hrv) : "--"}`}
              trendPositive={trend(data.sleepPeriods.filter((s) => s.type === "long_sleep").map((s) => s.average_hrv)) === "up"}
            />
          </div>

          {/* Charts row */}
          <ChartErrorBoundary>
          <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ChartSkeleton /><ChartSkeleton /></div>}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScoreLineChart
                data={data.sleep}
                title="Sleep Score Trend"
                color={COLORS.sleep}
                gradientId="sleepGrad"
                domain={[40, 100]}
              />
              <ScoreLineChart
                data={data.readiness}
                title="Readiness Score Trend"
                color={COLORS.readiness}
                gradientId="readinessGrad"
                domain={[40, 100]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScoreLineChart
                data={data.activity}
                title="Activity Score Trend"
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
                title="Heart Rate & HRV During Sleep"
              />
            </div>
          </Suspense>
          </ChartErrorBoundary>

          {/* Correlation Insights */}
          <CorrelationInsights data={data} />
        </div>
      )}
      </OnboardingGuard>
    </DashboardShell>
  );
}
