"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeSelector } from "@/components/ui/DateRangeSelector";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportButton } from "@/components/ui/ExportButton";
import { LoadingGrid } from "@/components/ui/LoadingGrid";
import { LazyBarChartComponent as BarChartComponent, LazyMultiLineChart as MultiLineChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import {
  Dumbbell,
  Flame,
  Clock,
  MapPin,
  Tag,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { average, formatDuration, cn } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import { AISummaryCard } from "@/components/ui/AISummaryCard";
import { WorkoutDetail } from "@/components/ui/WorkoutDetail";
import type { Workout, DailyActivity, HeartRateEntry } from "@/types/oura";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function workoutDuration(w: Workout): number {
  return (new Date(w.end_datetime).getTime() - new Date(w.start_datetime).getTime()) / 1000;
}

export default function WorkoutsPage() {
  const { data, loading, fetchData } = useOuraData();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);

  useEffect(() => {
    if (!data) fetchData();
  }, [data, fetchData]);

  const allWorkouts = data?.workouts || [];
  const sessions = data?.sessions || [];
  const tags = data?.tags || [];

  // Workouts for the selected day
  const dayWorkouts = useMemo(
    () => allWorkouts.filter((w) => w.day === selectedDate),
    [allWorkouts, selectedDate]
  );
  const daySessions = useMemo(
    () => sessions.filter((s) => s.day === selectedDate),
    [sessions, selectedDate]
  );
  const dayTags = useMemo(
    () => tags.filter((t) => t.day === selectedDate),
    [tags, selectedDate]
  );

  // Day activity and heart rate for workout detail charts
  const dayActivity = useMemo(
    () => (data?.activity || []).find((a) => a.day === selectedDate) || null,
    [data?.activity, selectedDate]
  );
  const dayHeartRate = useMemo(
    () => (data?.heartRate || []).filter((hr) => hr.timestamp.startsWith(selectedDate)),
    [data?.heartRate, selectedDate]
  );

  // Wake time (selected date or previous day's long_sleep)
  const prevDate = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [selectedDate]);
  const wakeTime = useMemo(() => {
    if (!data?.sleepPeriods) return null;
    const period =
      data.sleepPeriods.find((p) => p.day === selectedDate && p.type === "long_sleep") ||
      data.sleepPeriods.find((p) => p.day === prevDate && p.type === "long_sleep");
    return period ? new Date(period.bedtime_end) : null;
  }, [data?.sleepPeriods, selectedDate, prevDate]);

  // Workouts started after wake time today
  const workoutsSinceWake = useMemo(() => {
    if (!allWorkouts.length) return [];
    const wakeTs = wakeTime?.getTime() || 0;
    const endTs = Date.now();
    return allWorkouts
      .filter((w) => {
        if (w.day !== selectedDate) return false;
        if (!w.start_datetime) return false;
        const ts = new Date(w.start_datetime).getTime();
        if (wakeTs && ts < wakeTs) return false;
        if (ts > endTs) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [allWorkouts, wakeTime, selectedDate]);

  // Day stats
  const dayCalories = dayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  const dayDistance = dayWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const dayDurations = dayWorkouts.map(workoutDuration);
  const dayTotalDuration = dayDurations.reduce((a, b) => a + b, 0);

  // Period stats (for trends section)
  const periodCalories = allWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  const periodAvgDuration = average(allWorkouts.map(workoutDuration));

  // Calories per day for chart
  const caloriesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of allWorkouts) {
      map.set(w.day, (map.get(w.day) || 0) + (w.calories || 0));
    }
    return Array.from(map.entries())
      .map(([day, calories]) => ({ day, calories: Math.round(calories) }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [allWorkouts]);

  const durationByDay = useMemo(() => {
    const map: Record<string, number> = {};
    allWorkouts.forEach(w => {
      if (!w.start_datetime || !w.end_datetime) return;
      const day = w.day;
      const dur = (new Date(w.end_datetime).getTime() - new Date(w.start_datetime).getTime()) / 60000;
      map[day] = (map[day] || 0) + dur;
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value: Math.round(value) }));
  }, [allWorkouts]);

  const distanceByDay = useMemo(() => {
    const map: Record<string, number> = {};
    allWorkouts.forEach(w => {
      if (!w.distance || w.distance <= 0) return;
      const day = w.day;
      map[day] = (map[day] || 0) + w.distance / 1000;
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value: Math.round(value * 10) / 10 }));
  }, [allWorkouts]);

  const progressByDay = useMemo(() => {
    const map = new Map<string, { avgHR: number[]; maxHR: number[]; avgMET: number[] }>();
    for (const w of allWorkouts) {
      if (!map.has(w.day)) map.set(w.day, { avgHR: [], maxHR: [], avgMET: [] });
      const entry = map.get(w.day)!;
      if (w.average_heart_rate) entry.avgHR.push(w.average_heart_rate);
      if (w.max_heart_rate) entry.maxHR.push(w.max_heart_rate);
      if (w.met?.items?.length) {
        const vals = w.met.items.filter((v: number) => v > 0);
        if (vals.length > 0) entry.avgMET.push(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
      }
    }
    return Array.from(map.entries())
      .map(([day, d]) => ({
        day,
        avgHR: d.avgHR.length > 0 ? Math.round(d.avgHR.reduce((a, b) => a + b, 0) / d.avgHR.length) : null,
        maxHR: d.maxHR.length > 0 ? Math.max(...d.maxHR) : null,
        avgMET: d.avgMET.length > 0 ? Math.round((d.avgMET.reduce((a, b) => a + b, 0) / d.avgMET.length) * 10) / 10 : null,
      }))
      .filter((d) => d.avgHR !== null || d.maxHR !== null || d.avgMET !== null)
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [allWorkouts]);

  return (
    <DashboardShell>
      <PageHeader
        title="Workouts & Sessions"
        icon={Dumbbell}
        iconColor={COLORS.heartRate}
        action={
          <div className="flex items-center gap-3">
            <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <ExportButton page="workouts" />
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
      {!loading && !data && <EmptyState page="workouts" />}

      {data && (
        <div className="space-y-6">
          <AISummaryCard page="workouts" data={data} />

          {/* Workouts since wake */}
          {wakeTime ? (
            workoutsSinceWake.length > 0 ? (
              <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      Today since wake ({wakeTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}) — Workouts
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {workoutsSinceWake.length} workout{workoutsSinceWake.length > 1 ? "s" : ""} since wake
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                  {workoutsSinceWake.map((w) => (
                    <div key={w.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {w.activity?.replace(/_/g, " ") || "Workout"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(w.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          {" \u2014 "}
                          {formatDuration(workoutDuration(w))}
                        </p>
                      </div>
                      <span
                        className={`badge ${
                          w.intensity === "high"
                            ? "badge-danger"
                            : w.intensity === "medium"
                            ? "badge-warning"
                            : "badge-success"
                        }`}
                      >
                        {w.intensity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="premium-card p-6 text-sm text-gray-400">
                No workouts recorded yet today
              </div>
            )
          ) : (
            <div className="premium-card p-6 text-sm text-gray-400">
              No sleep period found — unable to determine wake time
            </div>
          )}

          {/* Day stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Workouts"
              value={dayWorkouts.length}
              icon={Dumbbell}
              color={COLORS.heartRate}
            />
            <StatCard
              label="Calories Burned"
              value={Math.round(dayCalories).toLocaleString()}
              unit="cal"
              icon={Flame}
              color={COLORS.good}
            />
            <StatCard
              label="Total Duration"
              value={dayWorkouts.length > 0 ? formatDuration(dayTotalDuration) : "\u2014"}
              icon={Clock}
              color={COLORS.spo2}
            />
            <StatCard
              label="Distance"
              value={dayWorkouts.length > 0 ? (dayDistance / 1000).toFixed(1) : "\u2014"}
              unit={dayWorkouts.length > 0 ? "km" : ""}
              icon={MapPin}
              color={COLORS.steps}
            />
          </div>

          {/* Day workouts list */}
          <div className="premium-card overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="font-semibold">
                Workouts on {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </h3>
            </div>
            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
              {dayWorkouts.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No workouts on this day
                </div>
              ) : (
                dayWorkouts.map((w) => {
                  const isExpanded = expandedWorkout === w.id;
                  return (
                    <div key={w.id}>
                      <button
                        onClick={() => setExpandedWorkout(isExpanded ? null : w.id)}
                        className="w-full p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                              <Dumbbell className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm capitalize">
                                {w.activity?.replace(/_/g, " ") || "Workout"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(w.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                {" \u2014 "}
                                {new Date(w.end_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-right">
                              <p className="font-semibold">{Math.round(w.calories || 0)} cal</p>
                              <p className="text-xs text-gray-400">
                                {formatDuration(workoutDuration(w))}
                              </p>
                            </div>
                            <span
                              className={`badge ${
                                w.intensity === "high"
                                  ? "badge-danger"
                                  : w.intensity === "medium"
                                  ? "badge-warning"
                                  : "badge-success"
                              }`}
                            >
                              {w.intensity}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-gray-400 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </div>
                      </button>
                      {isExpanded && <WorkoutDetail workout={w} dayActivity={dayActivity} dayHeartRate={dayHeartRate} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Day sessions */}
          {daySessions.length > 0 && (
            <div className="premium-card overflow-hidden">
              <div className="p-6 border-b border-[var(--border)]">
                <h3 className="font-semibold">Sessions (Meditation/Breathing)</h3>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-slate-800/40">
                {daySessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {s.type?.replace(/_/g, " ") || "Session"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <p className="font-semibold">
                        {formatDuration(
                          (new Date(s.end_datetime).getTime() -
                            new Date(s.start_datetime).getTime()) /
                            1000
                        )}
                      </p>
                      {s.mood && (
                        <span className="badge badge-success mt-1">{s.mood}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day tags */}
          {dayTags.length > 0 && (
            <div className="premium-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {dayTags.map((t) => (
                  <div
                    key={t.id}
                    className="badge bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
                  >
                    <Tag className="w-3 h-3" />
                    {t.text || t.tag_type_code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trends</h3>
            <DateRangeSelector />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Period Workouts"
              value={allWorkouts.length}
              icon={Dumbbell}
              color={COLORS.heartRate}
            />
            <StatCard
              label="Period Calories"
              value={Math.round(periodCalories).toLocaleString()}
              unit="cal"
              icon={Flame}
              color={COLORS.good}
            />
            <StatCard
              label="Avg Duration"
              value={allWorkouts.length > 0 ? formatDuration(periodAvgDuration) : "\u2014"}
              icon={Clock}
              color={COLORS.spo2}
            />
            <StatCard
              label="Total Distance"
              value={allWorkouts.length > 0 ? (allWorkouts.reduce((s, w) => s + (w.distance || 0), 0) / 1000).toFixed(1) : "\u2014"}
              unit={allWorkouts.length > 0 ? "km" : ""}
              icon={MapPin}
              color={COLORS.steps}
            />
          </div>

          {/* Calories chart */}
          {caloriesByDay.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <BarChartComponent
                data={caloriesByDay}
                dataKey="calories"
                title="Workout Calories"
                color={COLORS.good}
                unit=" cal"
              />
            </Suspense>
          )}
          {durationByDay.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <BarChartComponent
                data={durationByDay}
                dataKey="value"
                title="Workout Duration (min)"
                color="#6366f1"
                height={220}
              />
            </Suspense>
          )}
          {distanceByDay.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <BarChartComponent
                data={distanceByDay}
                dataKey="value"
                title="Distance (km)"
                color="#06b6d4"
                height={220}
              />
            </Suspense>
          )}

          {progressByDay.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <MultiLineChart
                data={progressByDay}
                lines={[
                  { key: "avgHR", color: "#ef4444", name: "Avg HR" },
                  { key: "maxHR", color: "#f97316", name: "Max HR" },
                  { key: "avgMET", color: "#8b5cf6", name: "Avg MET" },
                ]}
                title="Workout Progress"
                unit=""
              />
            </Suspense>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
