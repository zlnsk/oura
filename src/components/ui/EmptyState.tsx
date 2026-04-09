"use client";

import { useOuraData } from "@/components/layout/OuraDataProvider";
import { Settings, RefreshCw, AlertCircle, BedDouble, Activity, Heart, Brain, Dumbbell, Scale, Zap } from "lucide-react";
import Link from "next/link";

const contextMessages: Record<string, { icon: typeof Settings; message: string; tip: string }> = {
  sleep: {
    icon: BedDouble,
    message: "No sleep data available for this period.",
    tip: "Make sure your Oura Ring was charged and worn during sleep, then try selecting a wider date range.",
  },
  activity: {
    icon: Activity,
    message: "No activity data recorded for this period.",
    tip: "Wear your Oura Ring throughout the day. Activity data typically syncs after a few hours.",
  },
  readiness: {
    icon: Zap,
    message: "No readiness data available for this period.",
    tip: "Readiness scores require a full night of sleep data. Make sure your ring was worn to bed.",
  },
  "heart-rate": {
    icon: Heart,
    message: "No heart rate data available for this period.",
    tip: "Heart rate data is collected continuously when wearing your Oura Ring. Check your ring connection.",
  },
  stress: {
    icon: Brain,
    message: "No stress data available for this period.",
    tip: "Stress tracking requires daytime wear. This feature may not be available on all Oura Ring generations.",
  },
  workouts: {
    icon: Dumbbell,
    message: "No workouts recorded for this period.",
    tip: "Workouts are auto-detected or can be logged manually in the Oura app.",
  },
  weight: {
    icon: Scale,
    message: "No weight data available.",
    tip: "Connect your Withings smart scale in Settings to see weight and body composition data.",
  },
};

interface EmptyStateProps {
  page?: string;
}

export function EmptyState({ page }: EmptyStateProps) {
  const { error, loading, fetchData } = useOuraData();
  const ctx = page ? contextMessages[page] : undefined;
  const Icon = error ? AlertCircle : ctx?.icon || Settings;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-6"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        {error ? (
          <AlertCircle className="w-8 h-8 text-rose-500" />
        ) : (
          <Icon className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <h2 className="text-xl font-semibold mb-2">
        {error ? "Connection Error" : ctx ? ctx.message : "No Data Available"}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-2">
        {error
          ? error
          : ctx
          ? ctx.tip
          : "Configure your Oura API key in Settings to start viewing your health data."}
      </p>
      {!error && !ctx && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-sm mb-6">
          You&apos;ll need a Personal Access Token from cloud.ouraring.com
        </p>
      )}
      <div className="flex gap-3 mt-4">
        <Link
          href="/settings"
          className="btn-primary text-sm"
        >
          <Settings className="w-4 h-4" />
          Go to Settings
        </Link>
        {(error || ctx) && (
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
