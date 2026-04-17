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
import {
  LazyScoreLineChart as ScoreLineChart,
  LazyMultiLineChart as MultiLineChart,
} from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Scale, TrendingDown, TrendingUp, Target, Droplets, RefreshCw, Activity, Bone, Dumbbell } from "lucide-react";
import { trend } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import { AISummaryCard } from "@/components/ui/AISummaryCard";
import type { WithingsWeightEntry } from "@/types/oura";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatWeight(kg: number): string {
  return (Math.round(kg * 10) / 10).toFixed(1);
}

export default function WeightPage() {
  const { data, loading, fetchData } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    if (!data) fetchData();
  }, [data, fetchData]);

  const weight = (data?.weight || []) as WithingsWeightEntry[];

  // Compute BMI if user height is available
  // Oura API returns height in meters (e.g. 1.80)
  const heightM = data?.personalInfo?.height
    ? (data.personalInfo.height > 3 ? data.personalInfo.height / 100 : data.personalInfo.height)
    : null;

  const weightWithBmi = weight.map((w) => ({
    ...w,
    bmi:
      heightM && w.weight
        ? Math.round((w.weight / (heightM * heightM)) * 100) / 100
        : w.bmi != null ? Math.round(w.bmi * 100) / 100 : undefined,
  }));

  const latest =
    weightWithBmi.find((w) => w.day === selectedDate) ||
    weightWithBmi[weightWithBmi.length - 1];

  const weights = weight.map((w) => w.weight).filter((v) => v > 0);
  const avgWeight = weights.length
    ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
    : 0;
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const weightTrend = trend(weights);

  const fatRatios = weightWithBmi
    .map((w) => w.fat_ratio)
    .filter((v): v is number => v != null && v > 0);
  const avgFatRatio = fatRatios.length
    ? Math.round((fatRatios.reduce((a, b) => a + b, 0) / fatRatios.length) * 10) / 10
    : null;

  const muscleMasses = weightWithBmi
    .map((w) => w.muscle_mass)
    .filter((v): v is number => v != null && v > 0);
  const avgMuscleMass = muscleMasses.length
    ? Math.round((muscleMasses.reduce((a, b) => a + b, 0) / muscleMasses.length) * 10) / 10
    : null;

  const bmis = weightWithBmi
    .map((w) => w.bmi)
    .filter((v): v is number => v != null && v > 0);
  const avgBmi = bmis.length
    ? Math.round((bmis.reduce((a, b) => a + b, 0) / bmis.length) * 100) / 100
    : null;

  const waterPcts = weightWithBmi
    .map((w) => w.water_percentage)
    .filter((v): v is number => v != null && v > 0);
  const avgWaterPct = waterPcts.length
    ? Math.round((waterPcts.reduce((a, b) => a + b, 0) / waterPcts.length) * 10) / 10
    : null;

  const hasBodyComp = weightWithBmi.some(
    (w) => w.fat_ratio != null || w.muscle_mass != null || w.bone_mass != null
  );

  const noWithingsData = weight.length === 0 && !loading;

  // Wake time (selected date or previous day's long_sleep)
  const prevDate = useMemo(() => getPrevDate(selectedDate), [selectedDate]);
  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  // Weight measurements taken today after wake time
  const measurementsSinceWake = useMemo(() => {
    if (!weightWithBmi.length) return [];
    const wakeTs = wakeTime?.getTime() || 0;
    const endTs = Date.now();
    return weightWithBmi.filter((w) => {
      if (w.day !== selectedDate) return false;
      const ts = new Date(w.timestamp).getTime();
      if (wakeTs && ts < wakeTs) return false;
      if (ts > endTs) return false;
      return true;
    });
  }, [weightWithBmi, wakeTime, selectedDate]);

  return (
    <DashboardShell>
      <PageHeader
        title="Weight"
        icon={Scale}
        iconColor={COLORS.weight}
        action={
          <div className="flex items-center gap-3">
            <DateNavigator
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
            <ExportButton page="weight" />
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-full p-2 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        }
      />

      {loading && !data && <LoadingGrid />}

      {noWithingsData && <EmptyState page="weight" />}

      {data && weight.length > 0 && (
        <div className="space-y-6">
          <AISummaryCard page="weight" data={data} />

          {/* Today's measurements since wake */}
          {wakeTime ? (
            measurementsSinceWake.length > 0 ? (
              <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      Today since wake ({wakeTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}) — Measurements
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {measurementsSinceWake.length} measurement{measurementsSinceWake.length > 1 ? "s" : ""} since wake
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {measurementsSinceWake.map((m) => (
                    <div key={m.timestamp} className="flex flex-wrap items-center gap-6 p-3 rounded-xl inset-cell">
                      <div className="text-xs text-gray-500">
                        {new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </div>
                      <div>
                        <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{formatWeight(m.weight)}</span>
                        <span className="text-xs text-gray-500 ml-1">kg</span>
                      </div>
                      {m.fat_ratio != null && (
                        <div>
                          <span className="text-lg font-bold text-orange-500">{m.fat_ratio.toFixed(1)}%</span>
                          <span className="text-xs text-gray-500 ml-1">fat</span>
                        </div>
                      )}
                      {m.muscle_mass != null && (
                        <div>
                          <span className="text-lg font-bold text-indigo-500">{formatWeight(m.muscle_mass)}</span>
                          <span className="text-xs text-gray-500 ml-1">kg muscle</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="premium-card p-6 text-sm text-gray-400">
                No weight measurements recorded yet today
              </div>
            )
          ) : (
            <div className="premium-card p-6 text-sm text-gray-400">
              No sleep period found — unable to determine wake time
            </div>
          )}

          {/* Today's / Selected measurement */}
          {latest && (
            <div className="premium-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {latest.day === getToday() ? "Today" : latest.day}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Latest measurement
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {formatWeight(latest.weight)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Weight (kg)</p>
                </div>
                {latest.fat_ratio != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">
                      {latest.fat_ratio.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Body Fat</p>
                  </div>
                )}
                {latest.muscle_mass != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-500">
                      {formatWeight(latest.muscle_mass)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Muscle (kg)</p>
                  </div>
                )}
                {latest.fat_mass_weight != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">
                      {formatWeight(latest.fat_mass_weight)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Fat Mass (kg)</p>
                  </div>
                )}
                {latest.bone_mass != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-500">
                      {formatWeight(latest.bone_mass)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Bone Mass (kg)</p>
                  </div>
                )}
                {latest.hydration != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-500">
                      {formatWeight(latest.hydration)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Hydration (kg)</p>
                  </div>
                )}
                {latest.water_percentage != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-sky-500">
                      {latest.water_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Water %</p>
                  </div>
                )}
                {latest.bmi != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-500">
                      {latest.bmi.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">BMI</p>
                  </div>
                )}
                {latest.fat_free_mass != null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-500">
                      {formatWeight(latest.fat_free_mass)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Fat-Free (kg)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Average Weight"
              value={avgWeight ? formatWeight(avgWeight) : "--"}
              unit="kg"
              icon={Scale}
              color={COLORS.weight}
            />
            <StatCard
              label="Weight Trend"
              value={
                weightTrend === "up"
                  ? "Gaining"
                  : weightTrend === "down"
                  ? "Losing"
                  : "Stable"
              }
              icon={weightTrend === "down" ? TrendingDown : TrendingUp}
              color={COLORS.weight}
              trend={weightTrend}
            />
            <StatCard
              label="Range"
              value={
                minWeight && maxWeight
                  ? `${formatWeight(minWeight)} – ${formatWeight(maxWeight)}`
                  : "--"
              }
              unit="kg"
              icon={Target}
              color={COLORS.weight}
            />
            <StatCard
              label="Avg Body Fat"
              value={avgFatRatio != null ? avgFatRatio.toFixed(1) : "--"}
              unit="%"
              icon={Droplets}
              color={COLORS.calories}
            />
          </div>

          {/* Additional body composition averages */}
          {(avgMuscleMass != null || avgBmi != null || avgWaterPct != null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {avgMuscleMass != null && (
                <StatCard
                  label="Avg Muscle Mass"
                  value={formatWeight(avgMuscleMass)}
                  unit="kg"
                  icon={Dumbbell}
                  color="#6366f1"
                />
              )}
              {avgBmi != null && (
                <StatCard
                  label="Avg BMI"
                  value={avgBmi.toFixed(1)}
                  icon={Activity}
                  color="#10b981"
                />
              )}
              {avgWaterPct != null && (
                <StatCard
                  label="Avg Water %"
                  value={avgWaterPct.toFixed(1)}
                  unit="%"
                  icon={Droplets}
                  color="#0ea5e9"
                />
              )}
            </div>
          )}

          {/* Trends header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Trends
            </h3>
            <DateRangeSelector />
          </div>

          {/* Weight trend chart */}
          <Suspense fallback={<ChartSkeleton />}>
            <ScoreLineChart
              data={weightWithBmi.map((w) => ({
                day: w.day,
                score: w.weight,
              }))}
              title="Weight Over Time"
              color={COLORS.weight}
              gradientId="weightGrad"
            />
          </Suspense>

          {/* Body composition chart */}
          {hasBodyComp && (
            <Suspense fallback={<ChartSkeleton />}>
              <MultiLineChart
                data={weightWithBmi
                  .filter(
                    (w) => w.fat_ratio != null || w.muscle_mass != null
                  )
                  .map((w) => ({
                    day: w.day,
                    fat: w.fat_ratio ?? 0,
                    muscle: w.muscle_mass ?? 0,
                    fatMass: w.fat_mass_weight ?? 0,
                  }))}
                lines={[
                  {
                    key: "muscle",
                    color: "#6366f1",
                    name: "Muscle Mass (kg)",
                  },
                  {
                    key: "fatMass",
                    color: "#f59e0b",
                    name: "Fat Mass (kg)",
                  },
                ]}
                title="Body Composition Over Time"
              />

              <ScoreLineChart
                data={weightWithBmi
                  .filter((w) => w.fat_ratio != null)
                  .map((w) => ({
                    day: w.day,
                    score: w.fat_ratio!,
                  }))}
                title="Body Fat % Over Time"
                color={COLORS.calories}
                gradientId="fatRatioGrad"
              />

              {weightWithBmi.some((w) => w.bmi != null) && (
                <ScoreLineChart
                  data={weightWithBmi
                    .filter((w) => w.bmi != null)
                    .map((w) => ({
                      day: w.day,
                      score: w.bmi!,
                    }))}
                  title="BMI Over Time"
                  color="#10b981"
                  gradientId="bmiGrad"
                />
              )}

              {weightWithBmi.some((w) => w.water_percentage != null) && (
                <ScoreLineChart
                  data={weightWithBmi
                    .filter((w) => w.water_percentage != null)
                    .map((w) => ({
                      day: w.day,
                      score: w.water_percentage!,
                    }))}
                  title="Water % Over Time"
                  color="#0ea5e9"
                  gradientId="waterPctGrad"
                />
              )}
            </Suspense>
          )}

          {/* Measurement log */}
          <div className="premium-card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Recent Measurements
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Weight</th>
                    {hasBodyComp && (
                      <>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Body Fat</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Muscle</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500 hidden md:table-cell">Fat Mass</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500 hidden md:table-cell">Bone</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500 hidden lg:table-cell">Water %</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500 hidden lg:table-cell">BMI</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {weightWithBmi
                    .slice()
                    .reverse()
                    .slice(0, 30)
                    .map((w) => (
                      <tr
                        key={w.timestamp}
                        className="border-b border-[var(--border)] hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{w.day}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatWeight(w.weight)} kg</td>
                        {hasBodyComp && (
                          <>
                            <td className="py-2 px-3 text-right text-gray-500">
                              {w.fat_ratio != null ? `${w.fat_ratio.toFixed(1)}%` : "–"}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500">
                              {w.muscle_mass != null ? `${formatWeight(w.muscle_mass)} kg` : "–"}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500 hidden md:table-cell">
                              {w.fat_mass_weight != null ? `${formatWeight(w.fat_mass_weight)} kg` : "–"}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500 hidden md:table-cell">
                              {w.bone_mass != null ? `${formatWeight(w.bone_mass)} kg` : "–"}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500 hidden lg:table-cell">
                              {w.water_percentage != null ? `${w.water_percentage.toFixed(1)}%` : "–"}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500 hidden lg:table-cell">
                              {w.bmi != null ? w.bmi.toFixed(1) : "–"}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
