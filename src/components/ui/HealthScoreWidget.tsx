"use client";

import { ScoreRing } from "@/components/ui/ScoreRing";
import { getScoreLabel } from "@/lib/utils";

interface HealthScoreWidgetProps {
  sleepScore: number;
  activityScore: number;
  readinessScore: number;
}

export function HealthScoreWidget({
  sleepScore,
  activityScore,
  readinessScore,
}: HealthScoreWidgetProps) {
  const scores = [sleepScore, activityScore, readinessScore].filter((s) => s > 0);
  if (scores.length === 0) return null;

  const combined = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const label = getScoreLabel(combined);

  const getColor = (s: number) => {
    if (s >= 85) return "#10b981";
    if (s >= 70) return "#f59e0b";
    return "#f43f5e";
  };

  return (
    <div className="premium-card p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Combined score - hero */}
        <div className="flex flex-col items-center">
          <ScoreRing score={combined} size={120} strokeWidth={8} />
          <div className="mt-2 text-center">
            <p
              className="text-sm font-semibold"
              style={{ color: getColor(combined) }}
            >
              {label}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
              Overall Health
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-24 bg-[var(--border)]" />
        <div className="sm:hidden w-24 h-px bg-[var(--border)]" />

        {/* Individual scores */}
        <div className="flex items-center gap-6">
          {sleepScore > 0 && (
            <ScoreRing score={sleepScore} size={72} strokeWidth={5} label="Sleep" />
          )}
          {activityScore > 0 && (
            <ScoreRing score={activityScore} size={72} strokeWidth={5} label="Activity" />
          )}
          {readinessScore > 0 && (
            <ScoreRing score={readinessScore} size={72} strokeWidth={5} label="Readiness" />
          )}
        </div>
      </div>
    </div>
  );
}
