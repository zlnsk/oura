"use client";

import { useMemo, Suspense } from "react";
import { Heart, Zap, TrendingUp, Clock, MapPin, Flame, Activity } from "lucide-react";
import { LazyIntradayChart as IntradayChart, LazyDualIntradayChart as DualIntradayChart } from "@/components/charts";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { COLORS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import type { Workout, DailyActivity, HeartRateEntry } from "@/types/oura";

interface WorkoutDetailProps {
  workout: Workout;
  dayActivity?: DailyActivity | null;
  dayHeartRate?: HeartRateEntry[];
}

function intervalToTimeSeries(
  data: { interval: number; items: number[]; timestamp: string } | undefined,
  filterZero = true
): { time: string; value: number }[] {
  if (!data || !data.items?.length) return [];

  const startTime = new Date(data.timestamp).getTime();
  const intervalMs = data.interval * 1000;

  return data.items
    .map((value, i) => ({
      time: new Date(startTime + i * intervalMs).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      value,
    }))
    .filter((d) => !filterZero || d.value > 0);
}

interface TsDataPoint {
  ts: number;
  time: string;
  value: number;
}

export function WorkoutDetail({ workout, dayActivity, dayHeartRate }: WorkoutDetailProps) {
  const duration =
    (new Date(workout.end_datetime).getTime() -
      new Date(workout.start_datetime).getTime()) /
    1000;

  const workoutStartMs = new Date(workout.start_datetime).getTime();
  const workoutEndMs = new Date(workout.end_datetime).getTime();

  // --- HR data with timestamps for time-aligned merge ---
  const hrDataWithTs = useMemo((): TsDataPoint[] => {
    // Prefer workout-level interval data
    if (workout.heart_rate?.items?.length) {
      const startMs = new Date(workout.heart_rate.timestamp).getTime();
      const intervalMs = workout.heart_rate.interval * 1000;
      return workout.heart_rate.items
        .map((value, i) => {
          const ts = startMs + i * intervalMs;
          return {
            ts,
            time: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            value,
          };
        })
        .filter((d) => d.value > 0);
    }
    // Fall back to day-level HR
    if (!dayHeartRate?.length) return [];
    return dayHeartRate
      .filter((hr) => {
        const t = new Date(hr.timestamp).getTime();
        return t >= workoutStartMs && t <= workoutEndMs;
      })
      .map((hr) => ({
        ts: new Date(hr.timestamp).getTime(),
        time: new Date(hr.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        value: hr.bpm,
      }));
  }, [workout.heart_rate, dayHeartRate, workoutStartMs, workoutEndMs]);

  // --- MET data with timestamps for time-aligned merge ---
  const metDataWithTs = useMemo((): TsDataPoint[] => {
    // Prefer workout-level MET
    if (workout.met?.items?.length) {
      const startMs = new Date(workout.met.timestamp).getTime();
      const intervalMs = workout.met.interval * 1000;
      return workout.met.items
        .map((value, i) => {
          const ts = startMs + i * intervalMs;
          return { ts, time: "", value };
        })
        .filter((d) => d.value > 0);
    }
    // Fall back to day-level MET
    const met = dayActivity?.met;
    if (!met?.items?.length || !met.timestamp) return [];
    const metStartMs = new Date(met.timestamp).getTime();
    const intervalMs = met.interval * 1000;
    return met.items
      .map((value, i) => {
        const ts = metStartMs + i * intervalMs;
        return { ts, time: "", value };
      })
      .filter((d) => d.ts >= workoutStartMs && d.ts <= workoutEndMs && d.value > 0);
  }, [workout.met, dayActivity?.met, workoutStartMs, workoutEndMs]);

  // Plain arrays for stats and fallback single charts
  const hrData = useMemo(
    () => hrDataWithTs.map((d) => ({ time: d.time, value: d.value })),
    [hrDataWithTs]
  );
  const metData = useMemo(
    () =>
      metDataWithTs.map((d) => ({
        time:
          d.time ||
          new Date(d.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        value: d.value,
      })),
    [metDataWithTs]
  );

  // --- Combined data: merge HR + MET by nearest timestamp ---
  const combinedData = useMemo(() => {
    if (hrDataWithTs.length === 0 || metDataWithTs.length === 0) return null;

    let metIdx = 0;
    return hrDataWithTs.map((hr) => {
      // Advance MET index to the nearest point
      while (
        metIdx < metDataWithTs.length - 1 &&
        Math.abs(metDataWithTs[metIdx + 1].ts - hr.ts) <
          Math.abs(metDataWithTs[metIdx].ts - hr.ts)
      ) {
        metIdx++;
      }
      const nearest = metDataWithTs[metIdx];
      // Only include MET if within 60 seconds
      const metValue =
        nearest && Math.abs(nearest.ts - hr.ts) < 60000
          ? nearest.value
          : undefined;
      return {
        time: hr.time,
        hr: hr.value,
        met: metValue,
      };
    });
  }, [hrDataWithTs, metDataWithTs]);

  // Compute stats from interval data if summary fields are missing
  const hrValues = hrData.map((d) => d.value).filter((v) => v > 0);
  const avgHR =
    workout.average_heart_rate ||
    (hrValues.length > 0
      ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
      : null);
  const maxHR =
    workout.max_heart_rate ||
    (hrValues.length > 0 ? Math.max(...hrValues) : null);
  const minHR = hrValues.length > 0 ? Math.min(...hrValues) : null;

  const metValues = metData.map((d) => d.value).filter((v) => v > 0);
  const avgMET =
    metValues.length > 0
      ? Math.round((metValues.reduce((a, b) => a + b, 0) / metValues.length) * 10) / 10
      : null;
  const maxMET = metValues.length > 0 ? Math.round(Math.max(...metValues) * 10) / 10 : null;

  const hasDistance = workout.distance > 0;

  const hasAnyDetail = hrData.length > 0 || metData.length > 0 || avgHR || hasDistance || workout.calories > 0;

  if (!hasAnyDetail) {
    return (
      <div className="px-4 pb-4 pt-0">
        <p className="text-xs text-gray-400 italic">
          No detailed data available for this workout.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 pt-1 space-y-4 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatTile icon={Clock} label="Duration" value={formatDuration(duration)} />
        <StatTile
          icon={Flame}
          label="Calories"
          value={`${Math.round(workout.calories || 0)}`}
          unit="cal"
        />
        {hasDistance && (
          <StatTile
            icon={MapPin}
            label="Distance"
            value={(workout.distance / 1000).toFixed(2)}
            unit="km"
          />
        )}
        {avgHR && (
          <StatTile
            icon={Heart}
            label="Avg HR"
            value={String(avgHR)}
            unit="bpm"
            color={COLORS.heartRate}
          />
        )}
        {maxHR && (
          <StatTile
            icon={TrendingUp}
            label="Max HR"
            value={String(maxHR)}
            unit="bpm"
            color={COLORS.heartRate}
          />
        )}
        {minHR && (
          <StatTile
            icon={Heart}
            label="Min HR"
            value={String(minHR)}
            unit="bpm"
          />
        )}
        {avgMET && (
          <StatTile
            icon={Activity}
            label="Avg MET"
            value={String(avgMET)}
            color={COLORS.activity}
          />
        )}
        {maxMET && (
          <StatTile
            icon={TrendingUp}
            label="Max MET"
            value={String(maxMET)}
            color={COLORS.activity}
          />
        )}
      </div>

      {/* Combined HR + MET chart when both available, otherwise individual charts */}
      {combinedData ? (
        <Suspense fallback={<ChartSkeleton />}>
          <DualIntradayChart
            data={combinedData}
            title="Heart Rate & MET"
            height={200}
          />
        </Suspense>
      ) : (
        <>
          {hrData.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <IntradayChart
                data={hrData}
                title="Heart Rate"
                color={COLORS.heartRate}
                unit=" bpm"
                avgValue={avgHR || undefined}
                gradientId={`hr-${workout.id}`}
                height={160}
              />
            </Suspense>
          )}
          {metData.length > 0 && (
            <Suspense fallback={<ChartSkeleton />}>
              <IntradayChart
                data={metData}
                title="MET"
                color={COLORS.activity}
                unit=""
                avgValue={avgMET || undefined}
                gradientId={`met-${workout.id}`}
                height={160}
                domain={[0, 10]}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
      <Icon
        className="w-3.5 h-3.5 mb-1"
        style={color ? { color } : undefined}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold">
        {value}
        {unit && (
          <span className="text-xs font-normal text-gray-400 ml-0.5">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
