"use client";

import { useOuraData } from "@/components/layout/OuraDataProvider";
import { cn } from "@/lib/utils";

const ranges = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

export function DateRangeSelector() {
  const { days, setDays, loading } = useOuraData();

  return (
    <div className="flex items-center gap-0.5 p-1 border border-[var(--border)] rounded-full">
      {ranges.map(({ label, days: d }) => (
        <button
          key={d}
          onClick={() => setDays(d)}
          disabled={loading}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-150",
            days === d
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
