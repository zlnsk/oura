"use client";

export function LoadingGrid() {
  return (
    <div className="space-y-6">
      {/* Stat cards with staggered animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="premium-card p-5 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <div className="h-3 w-20 skeleton rounded-lg" />
            <div className="h-8 w-16 skeleton rounded-lg mt-3" />
            <div className="h-2 w-24 skeleton rounded-lg mt-3" />
          </div>
        ))}
      </div>
      {/* Chart placeholders with staggered animation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="premium-card p-6 h-64 animate-fade-in"
            style={{ animationDelay: `${320 + i * 100}ms`, animationFillMode: "both" }}
          >
            <div className="h-4 w-32 skeleton rounded-lg" />
            <div className="h-full mt-4 skeleton rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
