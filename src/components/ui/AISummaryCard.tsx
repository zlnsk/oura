"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Zap, ChevronDown, ChevronUp } from "lucide-react";
import type { DashboardData } from "@/types/oura";
import { BASE_PATH } from "@/lib/constants";
import type { PageType } from "@/lib/constants";
export type { PageType };

interface AISummary {
  overall: string;
  tip: string;
}

/**
 * Trim DashboardData to only include fields relevant to each page's AI prompt,
 * preventing "Request body too large" errors from sending unused bulk data.
 */
function trimDataForPage(data: DashboardData, page: PageType): Partial<DashboardData> {
  switch (page) {
    case "sleep":
      return {
        sleep: data.sleep,
        sleepPeriods: data.sleepPeriods?.map((p: any) => ({
          ...p,
          heart_rate: p.heart_rate ? { ...p.heart_rate, items: undefined, interval: undefined } : undefined,
          hrv: p.hrv ? { ...p.hrv, items: undefined, interval: undefined } : undefined,
          movement: undefined,
          readiness: p.readiness,
        })),
      };
    case "activity":
      return { activity: data.activity, workouts: data.workouts };
    case "readiness":
      return { readiness: data.readiness, sleepPeriods: data.sleepPeriods };
    case "heart-rate":
      return { sleepPeriods: data.sleepPeriods };
    case "stress":
      return { stress: data.stress, spo2: data.spo2, cardiovascularAge: data.cardiovascularAge };
    case "workouts":
      return { workouts: data.workouts, activity: data.activity };
    case "weight":
      return { weight: data.weight, activity: data.activity };
    default:
      // Dashboard overview – send last 7 days to keep payload under size limit
      return {
        sleep: data.sleep?.slice(0, 7),
        activity: data.activity?.slice(0, 7),
        readiness: data.readiness?.slice(0, 7),
        stress: data.stress?.slice(0, 7),
        sleepPeriods: data.sleepPeriods?.slice(0, 7),
      };
  }
}

const AI_CONSENT_KEY = "oura-ai-consent";

export function AISummaryCard({ page, data }: { page: PageType; data: DashboardData }) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showConsent, setShowConsent] = useState(false);

  const hasConsent = () => {
    try {
      return localStorage.getItem(AI_CONSENT_KEY) === "true";
    } catch {
      return false;
    }
  };

  const grantConsent = () => {
    try {
      localStorage.setItem(AI_CONSENT_KEY, "true");
    } catch {
      // localStorage unavailable
    }
    setShowConsent(false);
    doFetchSummary();
  };

  const fetchSummary = async () => {
    if (!hasConsent()) {
      setShowConsent(true);
      return;
    }
    doFetchSummary();
  };

  const doFetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const trimmed = trimDataForPage(data, page);
      const res = await fetch(`${BASE_PATH}/api/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: trimmed, page, consent: true }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to generate summary");
      }
      const json = await res.json();
      setSummary(json.summary || "No summary available.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-card">
      <div className="relative bg-white dark:bg-[var(--bg-card)] rounded-2xl">
        {/* Subtle gradient background tint */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/[0.02] via-transparent to-blue-500/[0.02] dark:from-violet-500/[0.04] dark:to-blue-500/[0.04] pointer-events-none" />

        <div className="relative p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Insight</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-500/20 hover:bg-violet-100 dark:hover:bg-violet-500/15 transition-all disabled:opacity-50"
            >
              {loading ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
              ) : summary ? (
                <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Generate</>
              )}
            </button>
          </div>
        </div>

        {showConsent && (
          <div className="relative px-5 pb-5">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                To generate AI insights, your health data will be sent to Anthropic&apos;s API for processing. This includes sleep, activity, readiness, and other metrics visible on this page. Your data is not stored by Anthropic.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={grantConsent}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  I understand, continue
                </button>
                <button
                  onClick={() => setShowConsent(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {(error || loading || summary) && expanded && (
          <div className="relative px-5 pb-5" role="region" aria-live="polite" aria-label="AI analysis results">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}
            {loading && !summary && (
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-3 bg-violet-100/50 dark:bg-violet-500/5 rounded-lg animate-pulse" style={{ width: `${90 - i * 15}%` }} />
                ))}
              </div>
            )}
            {summary && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {summary.overall}
                </p>
                {summary.tip && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/[0.06] dark:to-indigo-500/[0.06] border border-violet-100 dark:border-violet-500/10">
                    <div className="w-5 h-5 rounded-md bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center mt-0.5 shrink-0">
                      <Zap className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{summary.tip}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
