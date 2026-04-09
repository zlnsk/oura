"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeSelector } from "@/components/ui/DateRangeSelector";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportButton } from "@/components/ui/ExportButton";
import { LoadingGrid } from "@/components/ui/LoadingGrid";
import { LazyScoreLineChart as ScoreLineChart, LazyBarChartComponent as BarChartComponent, LazyMultiLineChart as MultiLineChart, LazyDualIntradayChart as DualIntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import {
  Activity,
  Footprints,
  Flame,
  Timer,
  Target,
  RefreshCw,
} from "lucide-react";
import { average, trend, formatDuration } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import { AISummaryCard } from "@/components/ui/AISummaryCard";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ActivityPage() {
  const { data, loading, fetchData } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    if (!data) fetchData();
  }, [data, fetchData]);

  const activities = data?.activity || [];
  const selected = activities.find((a) => a.day === selectedDate);

  // Find wake-up time from sleep period (check selected date and previous day)
  const prevDate = useMemo(() => getPrevDate(selectedDate), [selectedDate]);
  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  // Combined HR + MET data from wake time until bedtime
  const combinedIntradayData = useMemo(() => {
    const timeMap = new Map<string, { time: string; hr?: number; met?: number; ts: number }>();
    const wakeTs = wakeTime?.getTime() || 0;

    // Find next bedtime (when user goes to sleep) to cap chart
    const nextBedtime = data?.sleepPeriods?.find(sp =>
      sp.type === 'long_sleep' && sp.bedtime_start?.startsWith(selectedDate)
    );
    const endTs = nextBedtime ? new Date(nextBedtime.bedtime_start).getTime() : Date.now();

    // Add HR data
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

    // Add MET data
    if (selected?.met) {
      const { interval, items, timestamp } = selected.met;
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
  }, [data?.heartRate, data?.sleepPeriods, selected?.met, selectedDate, wakeTime]);

  const avgSteps = average(activities.map((a) => a.steps));
  const avgCalories = average(activities.map((a) => a.total_calories));

  return (
    <DashboardShell>
      <PageHeader
        title="Activity"
        subtitle="Movement, steps, and calorie tracking"
        icon={Activity}
        iconColor={COLORS.activity}
        action={
          <div className="flex items-center gap-3">
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <ExportButton page="activity" />
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-full p-2 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {loading && !data && <LoadingGrid />}
      {!loading && !data && <EmptyState page="activity" />}

      {data && (
        <div className="space-y-6">
          <AISummaryCard page="activity" data={data} />

          {/* Selected day overview */}
          <div className="premium-card p-6">
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
              <ScoreRing
                score={selected?.score || 0}
                size={140}
                strokeWidth={10}
                label="Activity Score"
              />
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {selected ? (
                  <>
                    <div>
                      <p className="stat-label">Steps</p>
                      <p className="text-xl font-semibold mt-1">{selected.steps?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="stat-label">Total Burn (incl. BMR)</p>
                      <p className="text-xl font-semibold mt-1">{selected.total_calories?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="stat-label">Active Calories</p>
                      <p className="text-xl font-semibold mt-1">{selected.active_calories?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="stat-label">Walking Distance</p>
                      <p className="text-xl font-semibold mt-1">
                        {((selected.equivalent_walking_distance || 0) / 1000).toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="stat-label">High Activity</p>
                      <p className="text-xl font-semibold mt-1">{formatDuration(selected.high_activity_time || 0)}</p>
                    </div>
                    <div>
                      <p className="stat-label">Medium Activity</p>
                      <p className="text-xl font-semibold mt-1">{formatDuration(selected.medium_activity_time || 0)}</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-sm text-gray-400">No activity data for this date</div>
                )}
              </div>
            </div>
          </div>

          {/* Combined HR & MET chart */}
          {combinedIntradayData.length > 0 && (
            <DualIntradayChart
              data={combinedIntradayData}
              title={wakeTime ? `Heart Rate & MET (since ${wakeTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})` : "Heart Rate & MET"}
            />
          )}

          {/* Trends */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trends</h2>
            <DateRangeSelector />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Avg Daily Steps"
              value={avgSteps.toLocaleString()}
              icon={Footprints}
              color={COLORS.steps}
              trend={trend(activities.map((a) => a.steps))}
              trendPositive={trend(activities.map((a) => a.steps)) === "up"}
            />
            <StatCard
              label="Avg Calories"
              value={avgCalories.toLocaleString()}
              unit="cal"
              icon={Flame}
              color={COLORS.activity}
            />
            <StatCard
              label="Avg Active Time"
              value={formatDuration(
                average(
                  activities.map(
                    (a) =>
                      (a.high_activity_time || 0) + (a.medium_activity_time || 0)
                  )
                )
              )}
              icon={Timer}
              color={COLORS.spo2}
            />
            <StatCard
              label="Inactivity Alerts"
              value={selected?.inactivity_alerts || 0}
              icon={Target}
              color={COLORS.attention}
            />
          </div>

          {/* Charts */}
          <Suspense fallback={<ChartSkeleton />}>
            <ScoreLineChart
              data={activities}
              title="Activity Score Trend"
              color={COLORS.activity}
              gradientId="actScoreGrad"
              domain={[40, 100]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <BarChartComponent
                data={activities.map((a) => ({ day: a.day, steps: a.steps }))}
                dataKey="steps"
                title="Daily Steps"
                color={COLORS.steps}
              />
              <BarChartComponent
                data={activities.map((a) => ({
                  day: a.day,
                  calories: a.total_calories,
                }))}
                dataKey="calories"
                title="Daily Calories"
                color={COLORS.activity}
                unit=" cal"
              />
            </div>

            <MultiLineChart
              data={activities.map((a) => ({
                day: a.day,
                high: Math.round((a.high_activity_time || 0) / 60),
                medium: Math.round((a.medium_activity_time || 0) / 60),
                low: Math.round((a.low_activity_time || 0) / 60),
              }))}
              lines={[
                { key: "high", color: COLORS.attention, name: "High (min)" },
                { key: "medium", color: COLORS.good, name: "Medium (min)" },
                { key: "low", color: COLORS.spo2, name: "Low (min)" },
              ]}
              title="Activity Levels Over Time"
              unit=" min"
            />
          </Suspense>

          {/* Contributors */}
          {selected?.contributors && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Activity Score Contributors
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(selected.contributors).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <ScoreRing
                      score={value as number}
                      size={64}
                      strokeWidth={5}
                      className="mx-auto"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 capitalize">
                      {key.replace(/_/g, " ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
