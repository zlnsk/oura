"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Settings, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  label: string;
  target: number;
  unit: string;
  color: string;
}

const DEFAULT_GOALS: Goal[] = [
  { id: "sleep_score", label: "Sleep Score", target: 80, unit: "", color: "#6366f1" },
  { id: "steps", label: "Steps", target: 10000, unit: "", color: "#10b981" },
  { id: "readiness_score", label: "Readiness", target: 80, unit: "", color: "#10b981" },
];

const GOALS_KEY = "oura_goals";

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

interface GoalTrackerProps {
  sleepScore?: number;
  steps?: number;
  readinessScore?: number;
}

export function GoalTracker({ sleepScore, steps, readinessScore }: GoalTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  const updateGoal = useCallback((id: string, target: number) => {
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, target } : g));
      saveGoals(next);
      return next;
    });
  }, []);

  const getValue = (id: string): number => {
    switch (id) {
      case "sleep_score": return sleepScore || 0;
      case "steps": return steps || 0;
      case "readiness_score": return readinessScore || 0;
      default: return 0;
    }
  };

  if (goals.length === 0) return null;

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <h3 className="heading-card">Daily Goals</h3>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label={editing ? "Done editing" : "Edit goals"}
        >
          {editing ? <Check className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const current = getValue(goal.id);
          const pct = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;
          const achieved = current >= goal.target;

          return (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">{goal.label}</span>
                  {achieved && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <input
                      type="number"
                      value={goal.target}
                      onChange={(e) => updateGoal(goal.id, Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-2 py-0.5 text-xs text-right rounded-md bg-gray-50 dark:bg-white/5 border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  ) : (
                    <span className="font-medium tabular-nums">
                      {current.toLocaleString()} <span className="text-gray-400">/ {goal.target.toLocaleString()}{goal.unit}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    achieved && "animate-glow-pulse"
                  )}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: goal.color,
                    boxShadow: achieved ? `0 0 8px ${goal.color}40` : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
