"use client";

import { cn, getScoreLabel } from "@/lib/utils";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  label: string;
  score: number;
  icon?: LucideIcon;
  accent?: string;
  hint?: string;
  className?: string;
}

export function ScoreCard({ label, score, icon: Icon, accent, hint, className }: ScoreCardProps) {
  const status = getScoreLabel(score);

  return (
    <div
      className={cn(
        "flex items-center gap-5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] p-5",
        className
      )}
    >
      <ScoreRing score={score} size={96} strokeWidth={7} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className="w-4 h-4 flex-shrink-0"
              style={{ color: accent || "var(--m3-on-surface-variant)" }}
            />
          )}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)]">
            {label}
          </p>
        </div>
        <p className="mt-1 text-lg font-semibold tracking-tight truncate">{status}</p>
        {hint && (
          <p className="mt-0.5 text-xs text-[var(--m3-on-surface-variant)] truncate">{hint}</p>
        )}
      </div>
    </div>
  );
}
