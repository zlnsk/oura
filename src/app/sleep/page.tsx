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
import { LazyScoreLineChart as ScoreLineChart, LazySleepStagesChart as SleepStagesChart, LazyMultiLineChart as MultiLineChart, LazyIntradayChart as IntradayChart, LazyDualIntradayChart as DualIntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import {
  BedDouble,
  Clock,
  Wind,
  Heart,
  Moon,
  RefreshCw,
} from "lucide-react";
import { average, trend, formatDuration } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import { AISummaryCard } from "@/components/ui/AISummaryCard";
import type { SleepPeriod } from "@/types/oura";

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getToday(): string {
  return getDateStr(new Date());
}

function buildIntradayHR(period: SleepPeriod): { time: string; value: number }[] {
  if (!period.heart_rate) return [];
  const { interval, items, timestamp } = period.heart_rate;
  const start = new Date(timestamp);
  const result: { time: string; value: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i] <= 0) continue;
    const t = new Date(start.getTime() + i * interval * 1000);
    result.push({
      time: t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }),
      value: items[i],
    });
  }
  return result;
}

function buildIntradayHRV(period: SleepPeriod): { time: string; value: number }[] {
  if (!period.hrv) return [];
  const { interval, items, timestamp } = period.hrv;
  const start = new Date(timestamp);
  const result: { time: string; value: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i] <= 0) continue;
    const t = new Date(start.getTime() + i * interval * 1000);
    result.push({
      time: t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }),
      value: Math.round(items[i]),
    });
  }
  return result;
}

export default function SleepPage() {
  const { data, loading, fetchData } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    if (!data) fetchData();
  }, [data, fetchData]);

  const allPeriods = data?.sleepPeriods || [];
  const periods = allPeriods.filter((p) => p.type === "long_sleep");
  const naps = allPeriods.filter(
    (p) => p.type !== "long_sleep" && p.total_sleep_duration > 0
  );
  const dailySleep = data?.sleep || [];

  // Find selected day's sleep data (strict match, no fallback to avoid stale data)
  const selectedPeriod = periods.find((p) => p.day === selectedDate);
  const selectedDailySleep = dailySleep.find((s) => s.day === selectedDate);

  // Intraday HR/HRV for selected night
  const sleepHR = useMemo(() => selectedPeriod ? buildIntradayHR(selectedPeriod) : [], [selectedPeriod]);
  const sleepHRV = useMemo(() => selectedPeriod ? buildIntradayHRV(selectedPeriod) : [], [selectedPeriod]);
  const sleepHRandHRV = useMemo(() => {
    const hrMap = new Map(sleepHR.map(d => [d.time, d.value]));
    const hrvMap = new Map(sleepHRV.map(d => [d.time, d.value]));
    const allTimes = [...new Set([...sleepHR.map(d => d.time), ...sleepHRV.map(d => d.time)])];
    allTimes.sort();
    return allTimes.map(time => ({ time, hr: hrMap.get(time), hrv: hrvMap.get(time) }));
  }, [sleepHR, sleepHRV]);

  const avgTotal = average(periods.map((p) => p.total_sleep_duration));
  const avgDeep = average(periods.map((p) => p.deep_sleep_duration));
  const avgHRV = average(periods.map((p) => p.average_hrv));
  const avgHR = average(periods.map((p) => p.average_heart_rate));

  return (
    <DashboardShell>
      <PageHeader
        title="Sleep Analysis"
        icon={BedDouble}
        iconColor={COLORS.sleep}
        action={
          <div className="flex items-center gap-3">
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <ExportButton page="sleep" />
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
      {!loading && !data && <EmptyState page="sleep" />}

      {data && (
        <div className="space-y-6">
          <AISummaryCard page="sleep" data={data} compact />

          {/* Selected night overview */}
          <div className="premium-card p-6">
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
              <ScoreRing
                score={selectedDailySleep?.score || 0}
                size={140}
                strokeWidth={10}
                label="Sleep Score"
              />
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {selectedPeriod ? (
                  <>
                    <div>
                      <p className="stat-label">Total Sleep</p>
                      <p className="text-xl font-semibold mt-1">{formatDuration(selectedPeriod.total_sleep_duration)}</p>
                    </div>
                    <div>
                      <p className="stat-label">Efficiency</p>
                      <p className="text-xl font-semibold mt-1">{selectedPeriod.efficiency}%</p>
                    </div>
                    <div>
                      <p className="stat-label">Deep Sleep</p>
                      <p className="text-xl font-semibold mt-1 text-indigo-500">{formatDuration(selectedPeriod.deep_sleep_duration)}</p>
                    </div>
                    <div>
                      <p className="stat-label">REM Sleep</p>
                      <p className="text-xl font-semibold mt-1 text-violet-500">{formatDuration(selectedPeriod.rem_sleep_duration)}</p>
                    </div>
                    <div>
                      <p className="stat-label">Bedtime</p>
                      <p className="text-xl font-semibold mt-1">
                        {new Date(selectedPeriod.bedtime_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <div>
                      <p className="stat-label">Wake Time</p>
                      <p className="text-xl font-semibold mt-1">
                        {new Date(selectedPeriod.bedtime_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-sm text-gray-400">No sleep data for this date</div>
                )}
              </div>
            </div>
          </div>

          {/* Naps for selected day */}
          {naps.filter((n) => n.day === selectedDate).length > 0 && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Naps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {naps
                  .filter((n) => n.day === selectedDate)
                  .map((nap) => (
                    <div
                      key={nap.id}
                      className="p-4 rounded-xl inset-cell space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(nap.bedtime_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" — "}
                          {new Date(nap.bedtime_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="text-xs font-medium text-indigo-500">
                          {formatDuration(nap.total_sleep_duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>Deep: {formatDuration(nap.deep_sleep_duration)}</span>
                        <span>REM: {formatDuration(nap.rem_sleep_duration)}</span>
                        <span>Light: {formatDuration(nap.light_sleep_duration)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Nap trends (filtered to selected day) */}
          {naps.filter((n) => n.day === selectedDate).length > 0 && (() => {
            const dayNaps = naps.filter((n) => n.day === selectedDate);
            return (
            <div className="premium-card p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Nap Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="stat-label">Total Naps</p>
                  <p className="text-xl font-semibold mt-1">{dayNaps.length}</p>
                </div>
                <div>
                  <p className="stat-label">Avg Nap Duration</p>
                  <p className="text-xl font-semibold mt-1">
                    {formatDuration(
                      dayNaps.reduce((s, n) => s + n.total_sleep_duration, 0) / dayNaps.length
                    )}
                  </p>
                </div>
                <div>
                  <p className="stat-label">Total Nap Time</p>
                  <p className="text-xl font-semibold mt-1">
                    {formatDuration(dayNaps.reduce((s, n) => s + n.total_sleep_duration, 0))}
                  </p>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Intraday HR & HRV during sleep */}
          {sleepHRandHRV.length > 0 && (
            <DualIntradayChart
              data={sleepHRandHRV}
              title="Heart Rate & HRV During Sleep"
              avgHR={selectedPeriod ? Math.round(selectedPeriod.average_heart_rate) : undefined}
              avgHRV={selectedPeriod ? Math.round(selectedPeriod.average_hrv) : undefined}
            />
          )}
          {/* Period averages */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trends</h2>
            <DateRangeSelector />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Avg Total Sleep"
              value={formatDuration(avgTotal)}
              icon={Clock}
              color={COLORS.sleep}
              trend={trend(periods.map((p) => p.total_sleep_duration))}
              trendPositive={trend(periods.map((p) => p.total_sleep_duration)) === "up"}
            />
            <StatCard
              label="Avg Deep Sleep"
              value={formatDuration(avgDeep)}
              icon={Moon}
              color="#4f46e5"
              trend={trend(periods.map((p) => p.deep_sleep_duration))}
              trendPositive={trend(periods.map((p) => p.deep_sleep_duration)) === "up"}
            />
            <StatCard
              label="Avg HRV"
              value={avgHRV}
              unit="ms"
              icon={Wind}
              color={COLORS.hrv}
              trend={trend(periods.map((p) => p.average_hrv))}
              trendPositive={trend(periods.map((p) => p.average_hrv)) === "up"}
            />
            <StatCard
              label="Avg Resting HR"
              value={avgHR}
              unit="bpm"
              icon={Heart}
              color={COLORS.heartRate}
              trend={trend(periods.map((p) => p.average_heart_rate))}
              trendPositive={trend(periods.map((p) => p.average_heart_rate)) === "down"}
            />
          </div>

          {/* Sleep score chart */}
          <Suspense fallback={<ChartSkeleton />}>
            <ScoreLineChart
              data={dailySleep}
              title="Sleep Score Over Time"
              color={COLORS.sleep}
              gradientId="sleepScoreGrad"
              domain={[40, 100]}
            />
          </Suspense>

          {/* Sleep stages */}
          <Suspense fallback={<ChartSkeleton height={320} />}>
            <SleepStagesChart data={periods} />
          </Suspense>

          {/* HRV & HR during sleep trends */}
          <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ChartSkeleton /><ChartSkeleton /></div>}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScoreLineChart
                data={periods.map((p) => ({ day: p.day, score: p.average_hrv }))}
                dataKey="score"
                title="HRV During Sleep (Trend)"
                color={COLORS.hrv}
                gradientId="hrvGrad"
                unit=" ms"
              />
              <MultiLineChart
                data={periods.map((p) => ({
                  day: p.day,
                  avg: p.average_heart_rate,
                  lowest: p.lowest_heart_rate,
                }))}
                lines={[
                  { key: "avg", color: COLORS.heartRate, name: "Avg HR" },
                  { key: "lowest", color: COLORS.spo2, name: "Lowest HR" },
                ]}
                title="Heart Rate During Sleep (Trend)"
                unit=" bpm"
              />
            </div>
          </Suspense>

          {/* Sleep contributors */}
          {selectedDailySleep?.contributors && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Sleep Score Contributors
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(selectedDailySleep.contributors).map(
                  ([key, value]) => (
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
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
