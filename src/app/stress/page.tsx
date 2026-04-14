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
import { LazyScoreLineChart as ScoreLineChart, LazyMultiLineChart as MultiLineChart, LazyIntradayChart as IntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Brain, Shield, Gauge, Wind, RefreshCw } from "lucide-react";
import { average } from "@/lib/utils";
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

export default function StressPage() {
  const { data, loading, fetchData } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    if (!data) fetchData();
  }, [data, fetchData]);

  const stress = data?.stress || [];
  const resilience = data?.resilience || [];
  const spo2 = data?.spo2 || [];
  const cardiovascularAge = data?.cardiovascularAge || [];
  const vo2Max = data?.vo2Max || [];

  const latest = stress.find((s) => s.day === selectedDate) || stress[stress.length - 1];

  // Wake time (selected date or previous day's long_sleep)
  const prevDate = useMemo(() => getPrevDate(selectedDate), [selectedDate]);
  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  // Intraday stress level from wake until now
  const intradayStressSinceWake = useMemo(() => {
    if (!data?.stress) return [];
    const wakeTs = wakeTime?.getTime() || 0;
    const endTs = Date.now();
    const points: { time: string; value: number; ts: number }[] = [];
    for (const s of data.stress) {
      const interval = (s as unknown as { interval?: number }).interval;
      const items = (s as unknown as { items?: number[] }).items;
      const timestamp = (s as unknown as { timestamp?: string }).timestamp;
      if (!interval || !items || !timestamp) continue;
      const start = new Date(timestamp);
      for (let i = 0; i < items.length; i++) {
        const v = items[i];
        if (v == null) continue;
        const t = new Date(start.getTime() + i * interval * 1000);
        const ts = t.getTime();
        if (!t.toISOString().startsWith(selectedDate)) {
          const local = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
          if (local !== selectedDate) continue;
        }
        if (wakeTs && ts < wakeTs) continue;
        if (ts > endTs) continue;
        points.push({
          time: t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }),
          value: Math.round(v * 10) / 10,
          ts,
        });
      }
    }
    return points.sort((a, b) => a.ts - b.ts).map(({ time, value }) => ({ time, value }));
  }, [data?.stress, wakeTime, selectedDate]);

  return (
    <DashboardShell>
      <PageHeader
        title="Stress & Resilience"
        subtitle="Stress levels, SpO2, and cardiovascular metrics"
        icon={Brain}
        iconColor={COLORS.hrv}
        action={
          <div className="flex items-center gap-3">
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <ExportButton page="stress" />
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
      {!loading && !data && <EmptyState page="stress" />}

      {data && (
        <div className="space-y-6">
          <AISummaryCard page="stress" data={data} />

          {/* Since wake intraday stress */}
          {wakeTime ? (
            intradayStressSinceWake.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <IntradayChart
                  data={intradayStressSinceWake}
                  title={`Since wake (${wakeTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}) — Stress Level`}
                  color={COLORS.attention}
                  gradientId="stressSinceWakeGrad"
                />
              </Suspense>
            ) : (
              <div className="premium-card p-6 text-sm text-gray-400">
                No stress level recorded yet today
              </div>
            )
          ) : (
            <div className="premium-card p-6 text-sm text-gray-400">
              No sleep period found — unable to determine wake time
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Stress Level"
              value={latest?.day_summary || "--"}
              icon={Brain}
              color={COLORS.hrv}
            />
            <StatCard
              label="Avg Recovery"
              value={average(stress.map((s) => Math.round((s.recovery_high || 0) / 60)))}
              unit="min"
              icon={Shield}
              color={COLORS.optimal}
            />
            <StatCard
              label="Avg SpO2"
              value={
                spo2.length
                  ? parseFloat(
                      (spo2.map((s) => s.spo2_percentage?.average || 0)
                        .filter((v) => v > 0)
                        .reduce((a, b, _, arr) => a + b / arr.length, 0)
                      ).toFixed(1)
                    )
                  : "--"
              }
              unit="%"
              icon={Wind}
              color={COLORS.spo2}
            />
            <StatCard
              label="Cardiovascular Age"
              value={
                cardiovascularAge.length
                  ? cardiovascularAge[cardiovascularAge.length - 1]?.vascular_age || "--"
                  : "--"
              }
              unit="yrs"
              icon={Gauge}
              color={COLORS.heartRate}
            />
          </div>

          {/* Trends */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trends</h3>
            <DateRangeSelector />
          </div>

          <Suspense fallback={<ChartSkeleton height={320} />}>
            {/* Stress over time */}
            {stress.length > 0 && (
              <MultiLineChart
                data={stress.map((s) => ({
                  day: s.day,
                  stress: Math.round((s.stress_high || 0) / 60),
                  recovery: Math.round((s.recovery_high || 0) / 60),
                  daytime: Math.round((s.daytime_recovery || 0) / 60),
                }))}
                lines={[
                  { key: "stress", color: COLORS.attention, name: "Stress (min)" },
                  { key: "recovery", color: COLORS.optimal, name: "Recovery (min)" },
                  { key: "daytime", color: COLORS.spo2, name: "Daytime Recovery (min)" },
                ]}
                title="Stress vs Recovery Over Time"
                unit=" min"
                height={320}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SpO2 */}
              {spo2.length > 0 && (
                <ScoreLineChart
                  data={spo2.map((s) => ({
                    day: s.day,
                    score: parseFloat((s.spo2_percentage?.average || 0).toFixed(1)),
                  }))}
                  dataKey="score"
                  title="Blood Oxygen (SpO2)"
                  color={COLORS.spo2}
                  gradientId="spo2Grad"
                  unit="%"
                  domain={[90, 100]}
                />
              )}

              {/* VO2 Max */}
              {vo2Max.length > 0 && (
                <ScoreLineChart
                  data={vo2Max.map((v) => ({
                    day: v.day,
                    score: v.vo2_max,
                  }))}
                  dataKey="score"
                  title="VO2 Max"
                  color={COLORS.optimal}
                  gradientId="vo2Grad"
                  unit=" ml/kg/min"
                />
              )}
            </div>
          </Suspense>

          {/* Resilience */}
          {resilience.length > 0 && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Resilience Levels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {resilience.slice(-14).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl inset-cell"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {r.day}
                    </span>
                    <span
                      className={`badge ${
                        r.level === "exceptional" || r.level === "strong"
                          ? "badge-success"
                          : r.level === "adequate"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}
                    >
                      {r.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cardiovascular Age trend */}
          {cardiovascularAge.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <ScoreLineChart
                data={cardiovascularAge.map((c) => ({
                  day: c.day,
                  score: c.vascular_age,
                }))}
                dataKey="score"
                title="Cardiovascular Age Trend"
                color={COLORS.heartRate}
                gradientId="cvAgeGrad"
                unit=" years"
              />
            </Suspense>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
