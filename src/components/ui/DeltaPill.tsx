"use client";

import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface DeltaPillProps {
  value: number;
  unit?: string;
  positive?: boolean;
  className?: string;
}

export function DeltaPill({ value, unit, positive, className }: DeltaPillProps) {
  const sign = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const Icon = sign === "up" ? ArrowUpRight : sign === "down" ? ArrowDownRight : Minus;
  const isNeutral = positive === undefined || sign === "flat";
  const good = !isNeutral && ((sign === "up" && positive) || (sign === "down" && !positive));

  const tone = isNeutral
    ? "text-[var(--m3-on-surface-variant)] bg-[color-mix(in_srgb,var(--m3-on-surface)_8%,transparent)]"
    : good
    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
    : "text-rose-600 dark:text-rose-400 bg-rose-500/10";

  const display =
    value === 0
      ? "0"
      : `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : value.toFixed(1)}${unit ?? ""}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        tone,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {display}
    </span>
  );
}
