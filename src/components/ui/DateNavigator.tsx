"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOuraData } from "@/components/layout/OuraDataProvider";

type Granularity = "day" | "week" | "month" | "year";

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

const granularities: { label: string; value: Granularity }[] = [
  { label: "D", value: "day" },
  { label: "W", value: "week" },
  { label: "M", value: "month" },
  { label: "Y", value: "year" },
];

// Minimum days to fetch for each granularity so the user has enough data
const granularityDays: Record<Granularity, number> = {
  day: 30,
  week: 30,
  month: 90,
  year: 365,
};

function shiftDate(dateStr: string, granularity: Granularity, direction: -1 | 1): string {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid DST issues
  switch (granularity) {
    case "day":
      d.setDate(d.getDate() + direction);
      break;
    case "week":
      d.setDate(d.getDate() + 7 * direction);
      break;
    case "month":
      d.setMonth(d.getMonth() + direction);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + direction);
      break;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (dateStr === todayStr) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (dateStr === yesterdayStr) return "Yesterday";

  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function daysBetween(dateStr: string, todayStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const t = new Date(todayStr + "T12:00:00");
  return Math.round((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const { days, setDays } = useOuraData();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isToday = selectedDate === todayStr;

  // When granularity changes, ensure we have enough data loaded
  const handleGranularityChange = (g: Granularity) => {
    setGranularity(g);
    const minDays = granularityDays[g];
    if (days < minDays) {
      setDays(minDays);
    }
  };

  // When navigating to a date outside the loaded range, auto-expand
  useEffect(() => {
    const daysBack = daysBetween(selectedDate, todayStr);
    if (daysBack > 0 && daysBack > days) {
      // Expand to cover the selected date plus some buffer
      setDays(Math.min(365, daysBack + 7));
    }
  }, [selectedDate, todayStr, days, setDays]);

  return (
    <div className="flex items-center gap-2">
      {/* Prev/Next arrows with date */}
      <div className="flex items-center gap-0.5 p-1 border border-[var(--border)] rounded-full">
        <button
          onClick={() => onDateChange(shiftDate(selectedDate, granularity, -1))}
          className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
          title={`Previous ${granularity}`}
          aria-label={`Previous ${granularity}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => isToday ? null : onDateChange(todayStr)}
          className={cn(
            "px-3 py-1 text-xs font-semibold rounded-full min-w-[100px] text-center transition-all",
            isToday
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          )}
          title="Click to go to today"
          aria-label="Click to go to today"
        >
          {formatDisplayDate(selectedDate)}
        </button>
        <button
          onClick={() => onDateChange(shiftDate(selectedDate, granularity, 1))}
          disabled={isToday}
          className={cn(
            "p-1.5 rounded-full transition-all",
            isToday
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
          )}
          title={`Next ${granularity}`}
          aria-label={`Next ${granularity}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Granularity selector */}
      <div className="flex items-center gap-0.5 p-1 border border-[var(--border)] rounded-full">
        {granularities.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleGranularityChange(value)}
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold rounded-full transition-all duration-150 uppercase",
              granularity === value
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
