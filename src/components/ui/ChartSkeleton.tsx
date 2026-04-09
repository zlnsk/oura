"use client";

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="premium-card p-6">
      <div className="h-4 w-40 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse mb-4" />
      <div
        className="w-full bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse"
        style={{ height }}
      />
    </div>
  );
}
