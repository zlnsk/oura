"use client";

import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/Sparkline";
import { DeltaPill } from "@/components/ui/DeltaPill";
import type { LucideIcon } from "lucide-react";

interface TrendRowProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  accent?: string;
  series: number[];
  delta: number;
  deltaUnit?: string;
  deltaPositive?: boolean;
  className?: string;
}

export function TrendRow({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  series,
  delta,
  deltaUnit,
  deltaPositive,
  className,
}: TrendRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-4 px-5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]",
        className
      )}
    >
      {Icon && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: accent ? `color-mix(in srgb, ${accent} 14%, transparent)` : "var(--m3-surface-container)",
            color: accent || "var(--m3-on-surface-variant)",
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)]">
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-[var(--m3-on-surface-variant)]">
              {unit}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:block flex-shrink-0">
        <Sparkline
          data={series}
          width={110}
          height={32}
          color={accent || "var(--m3-primary)"}
          ariaLabel={`${label} trend`}
        />
      </div>

      <div className="flex-shrink-0">
        <DeltaPill value={delta} unit={deltaUnit} positive={deltaPositive} />
      </div>
    </div>
  );
}
