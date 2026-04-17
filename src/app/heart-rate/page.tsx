"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeSelector } from "@/components/ui/DateRangeSelector";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportButton } from "@/components/ui/ExportButton";
import { LoadingGrid } from "@/components/ui/LoadingGrid";
import { LazyScoreLineChart as ScoreLineChart, LazyMultiLineChart as MultiLineChart, LazyBarChartComponent as BarChartComponent, LazyIntradayChart as IntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Heart, TrendingDown, Activity, Wind, RefreshCw } from "lucide-react";
import { trend } from "@/lib/utils";
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

export default function HeartRatePage() {
  const { data, loading, fetchData } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    if (!data) fetchData();
  }, [data, fetchData]);

  const heartRate = data?.heartRate || [];
  const sleepPeriods = data?.sleepPeriods || [];

  // Aggregate HR data by day
  const dailyHR = useMemo(() => {
    const byDay: Record<string, number[]> = {};
    heartRate.forEach((hr) => {
      const day = hr.timestamp.split("T")[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(hr.bpm);
    });
    return Object.entries(byDay)
      .map(([day, bpms]) => ({
        day,
        avg: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
        max: Math.max(...bpms),
        min: Math.min(...bpms),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [heartRate]);

  // Selected day's data
  const selectedSleepPeriod = sleepPeriods.find((s) => s.day === selectedDate && s.type === "long_sleep");
  const selectedDayHR = dailyHR.find((d) => d.day === selectedDate);

  // Wake time (from selected date or previous day's long_sleep)
  const prevDate = useMemo(() => getPrevDate(selectedDate), [selectedDate]);
  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  // Intraday HR from wake until now (only for selectedDate and capped at now)
  const intradayHRSinceWake = useMemo(() => {
    if (!data?.heartRate) return [];
    const wakeTs = wakeTime?.getTime() || 0;
    const endTs = Date.now();
    const points: { time: string; value: number; ts: number }[] = [];
    for (const hr of data.heartRate) {
      if (!hr.timestamp.startsWith(selectedDate)) continue;
      const t = new Date(hr.timestamp);
      const ts = t.getTime();
      if (wakeTs && ts < wakeTs) continue;
      if (ts > endTs) continue;
      points.push({
        time: t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
        value: hr.bpm,
        ts,
      });
    }
    return points.sort((a, b) => a.ts - b.ts).map(({ time, value }) => ({ time, value }));
  }, [data?.heartRate, wakeTime, selectedDate]);

  // HR distribution for selected day only
  const hrDistribution = useMemo(() => {
    const dayReadings = heartRate.filter((hr) => hr.timestamp.startsWith(selectedDate));
    const ranges = [
      { label: "<50", min: 0, max: 50 },
      { label: "50-60", min: 50, max: 60 },
      { label: "60-70", min: 60, max: 70 },
      { label: "70-80", min: 70, max: 80 },
      { label: "80-90", min: 80, max: 90 },
      { label: "90-100", min: 90, max: 100 },
      { label: "100+", min: 100, max: 999 },
    ];
    return ranges.map(({ label, min, max }) => ({
      day: label,
      count: dayReadings.filter((hr) => hr.bpm >= min && hr.bpm < max).length,
    }));
  }, [heartRate, selectedDate]);

  return (
    <DashboardShell>
      <PageHeader
        title="Heart Rate"
        icon={Heart}
        iconColor={COLORS.heartRate}
        action={
          <div className="flex items-center gap-3">
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <ExportButton page="heart-rate" />
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
      {!loading && !data && <EmptyState page="heart-rate" />}

      {data && (
        <div className="space-y-6">
          <AISummaryCard page="heart-rate" data={data} />

          {/* Since wake intraday HR */}
          {wakeTime ? (
            intradayHRSinceWake.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <IntradayChart
                  data={intradayHRSinceWake}
                  title={`Since wake (${wakeTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}) — Heart Rate`}
                  color={COLORS.heartRate}
                  unit=" bpm"
                  gradientId="hrSinceWakeGrad"
                />
              </Suspense>
            ) : (
              <div className="premium-card p-6 text-sm text-gray-400">
                No heart rate recorded yet today
              </div>
            )
          ) : (
            <div className="premium-card p-6 text-sm text-gray-400">
              No sleep period found — unable to determine wake time
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Resting HR"
              value={selectedSleepPeriod ? Math.round(selectedSleepPeriod.average_heart_rate) : "--"}
              unit="bpm"
              icon={Heart}
              color={COLORS.heartRate}
              trend={trend(sleepPeriods.filter(s => s.type === "long_sleep").map((s) => s.average_heart_rate))}
              trendPositive={trend(sleepPeriods.filter(s => s.type === "long_sleep").map((s) => s.average_heart_rate)) === "down"}
            />
            <StatCard
              label="Lowest HR"
              value={selectedSleepPeriod ? Math.round(selectedSleepPeriod.lowest_heart_rate) : "--"}
              unit="bpm"
              icon={TrendingDown}
              color={COLORS.spo2}
              trend={trend(sleepPeriods.filter(s => s.type === "long_sleep").map((s) => s.lowest_heart_rate))}
              trendPositive={trend(sleepPeriods.filter(s => s.type === "long_sleep").map((s) => s.lowest_heart_rate)) === "down"}
            />
            <StatCard
              label="Daytime HR"
              value={selectedDayHR?.avg || "--"}
              unit="bpm"
              icon={Activity}
              color={COLORS.good}
            />
            <StatCard
              label="HRV"
              value={selectedSleepPeriod ? Math.round(selectedSleepPeriod.average_hrv) : "--"}
              unit="ms"
              icon={Wind}
              color={COLORS.hrv}
              trend={trend(sleepPeriods.filter(s => s.type === "long_sleep").map((s) => s.average_hrv))}
              trendPositive={trend(sleepPeriods.filter(s => s.type === "long_sleep").map((s) => s.average_hrv)) === "up"}
            />
          </div>

          {/* Trends */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trends</h3>
            <DateRangeSelector />
          </div>

          {/* Daily HR trends */}
          <Suspense fallback={<ChartSkeleton height={320} />}>
            <MultiLineChart
              data={dailyHR}
              lines={[
                { key: "max", color: COLORS.heartRate, name: "Max HR" },
                { key: "avg", color: COLORS.good, name: "Avg HR" },
                { key: "min", color: COLORS.spo2, name: "Min HR" },
              ]}
              title="Daily Heart Rate Range"
              unit=" bpm"
              height={320}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Resting HR during sleep */}
              <MultiLineChart
                data={sleepPeriods.map((s) => ({
                  day: s.day,
                  avg: s.average_heart_rate,
                  lowest: s.lowest_heart_rate,
                }))}
                lines={[
                  { key: "avg", color: COLORS.heartRate, name: "Avg HR" },
                  { key: "lowest", color: COLORS.spo2, name: "Lowest HR" },
                ]}
                title="Heart Rate During Sleep"
                unit=" bpm"
              />

              {/* HRV trend */}
              <ScoreLineChart
                data={sleepPeriods.map((s) => ({
                  day: s.day,
                  score: s.average_hrv,
                }))}
                dataKey="score"
                title="HRV Trend"
                color={COLORS.hrv}
                gradientId="hrvTrendGrad"
                unit=" ms"
              />
            </div>

            {/* HR distribution */}
            <BarChartComponent
              data={hrDistribution}
              dataKey="count"
              title="Heart Rate Distribution"
              color={COLORS.heartRate}
              unit=" readings"
            />
          </Suspense>
        </div>
      )}
    </DashboardShell>
  );
}
