"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import type { DashboardData } from "@/types/oura";

interface Insight {
  text: string;
  positive: boolean;
}

function findCorrelations(data: DashboardData): Insight[] {
  const insights: Insight[] = [];
  if (!data.sleep.length || !data.readiness.length || !data.activity.length) return insights;

  // Build date maps
  const sleepMap = new Map(data.sleep.map((s) => [s.day, s.score]));
  const readinessMap = new Map(data.readiness.map((r) => [r.day, r.score]));
  const activityMap = new Map(data.activity.map((a) => [a.day, { score: a.score, steps: a.steps }]));
  const stressMap = new Map(data.stress.map((s) => [s.day, s]));
  const sleepPeriodMap = new Map(
    data.sleepPeriods
      .filter((p) => p.type === "long_sleep")
      .map((p) => [p.day, p])
  );

  // 1. Sleep score vs next-day readiness
  const sleepReadinessPairs: { sleep: number; readiness: number }[] = [];
  for (const [day, sleepScore] of Array.from(sleepMap.entries())) {
    const nextDay = new Date(day + "T12:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);
    const r = readinessMap.get(nextDayStr);
    if (r && sleepScore > 0) {
      sleepReadinessPairs.push({ sleep: sleepScore, readiness: r });
    }
  }

  if (sleepReadinessPairs.length >= 7) {
    const highSleep = sleepReadinessPairs.filter((p) => p.sleep >= 80);
    const lowSleep = sleepReadinessPairs.filter((p) => p.sleep < 70);
    if (highSleep.length >= 3 && lowSleep.length >= 3) {
      const avgHighReadiness = Math.round(highSleep.reduce((a, b) => a + b.readiness, 0) / highSleep.length);
      const avgLowReadiness = Math.round(lowSleep.reduce((a, b) => a + b.readiness, 0) / lowSleep.length);
      const diff = avgHighReadiness - avgLowReadiness;
      if (Math.abs(diff) >= 5) {
        insights.push({
          text: `Readiness is ${diff}pts higher after good sleep nights (80+) vs poor nights (<70).`,
          positive: diff > 0,
        });
      }
    }
  }

  // 2. Bedtime correlation
  const earlyBed: number[] = [];
  const lateBed: number[] = [];
  for (const [day, period] of Array.from(sleepPeriodMap.entries())) {
    const bedHour = new Date(period.bedtime_start).getHours();
    const sleepScore = sleepMap.get(day);
    if (!sleepScore || sleepScore <= 0) continue;
    if (bedHour <= 22 && bedHour >= 6) { // before 11pm (accounting for midnight crossover)
      earlyBed.push(sleepScore);
    } else {
      lateBed.push(sleepScore);
    }
  }

  if (earlyBed.length >= 3 && lateBed.length >= 3) {
    const avgEarly = Math.round(earlyBed.reduce((a, b) => a + b, 0) / earlyBed.length);
    const avgLate = Math.round(lateBed.reduce((a, b) => a + b, 0) / lateBed.length);
    const diff = avgEarly - avgLate;
    if (Math.abs(diff) >= 3) {
      insights.push({
        text: `Sleep score is ${Math.abs(diff)}pts ${diff > 0 ? "higher" : "lower"} when going to bed before 11 PM.`,
        positive: diff > 0,
      });
    }
  }

  // 3. Activity vs HRV
  const highActivityDays: number[] = [];
  const lowActivityDays: number[] = [];
  for (const [day, activity] of Array.from(activityMap.entries())) {
    const period = sleepPeriodMap.get(day);
    if (!period || period.average_hrv <= 0) continue;
    if (activity.steps >= 8000) {
      highActivityDays.push(period.average_hrv);
    } else if (activity.steps < 5000) {
      lowActivityDays.push(period.average_hrv);
    }
  }

  if (highActivityDays.length >= 3 && lowActivityDays.length >= 3) {
    const avgHighHRV = Math.round(highActivityDays.reduce((a, b) => a + b, 0) / highActivityDays.length);
    const avgLowHRV = Math.round(lowActivityDays.reduce((a, b) => a + b, 0) / lowActivityDays.length);
    const diff = avgHighHRV - avgLowHRV;
    if (Math.abs(diff) >= 3) {
      insights.push({
        text: `HRV is ${Math.abs(diff)}ms ${diff > 0 ? "higher" : "lower"} on active days (8k+ steps) vs sedentary days (<5k steps).`,
        positive: diff > 0,
      });
    }
  }

  // 4. Stress impact on sleep
  const stressSleep: { stress: number; sleep: number }[] = [];
  for (const [day, stressData] of Array.from(stressMap.entries())) {
    const nextDay = new Date(day + "T12:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const nextStr = nextDay.toISOString().slice(0, 10);
    const sleep = sleepMap.get(nextStr);
    if (sleep && sleep > 0 && stressData.stress_high > 0) {
      stressSleep.push({ stress: stressData.stress_high, sleep });
    }
  }

  if (stressSleep.length >= 7) {
    const sorted = [...stressSleep].sort((a, b) => a.stress - b.stress);
    const lowStressThird = sorted.slice(0, Math.floor(sorted.length / 3));
    const highStressThird = sorted.slice(-Math.floor(sorted.length / 3));
    if (lowStressThird.length >= 2 && highStressThird.length >= 2) {
      const avgLowStressSleep = Math.round(lowStressThird.reduce((a, b) => a + b.sleep, 0) / lowStressThird.length);
      const avgHighStressSleep = Math.round(highStressThird.reduce((a, b) => a + b.sleep, 0) / highStressThird.length);
      const diff = avgLowStressSleep - avgHighStressSleep;
      if (Math.abs(diff) >= 3) {
        insights.push({
          text: `Sleep score drops ${Math.abs(diff)}pts after high-stress days compared to low-stress days.`,
          positive: false,
        });
      }
    }
  }

  return insights.slice(0, 4); // Max 4 insights
}

export function CorrelationInsights({ data }: { data: DashboardData }) {
  const insights = useMemo(() => findCorrelations(data), [data]);

  if (insights.length === 0) return null;

  return (
    <div className="premium-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <h3 className="heading-card">Pattern Insights</h3>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
            {insight.positive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
