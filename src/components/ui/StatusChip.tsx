"use client";

import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type StatusVariant = "synced" | "syncing" | "stale" | "offline" | "error";

const variants: Record<StatusVariant, { icon: typeof Wifi; label: string; classes: string }> = {
  synced: {
    icon: CheckCircle2,
    label: "Synced",
    classes: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-800",
  },
  syncing: {
    icon: RefreshCw,
    label: "Syncing",
    classes: "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-700",
  },
  stale: {
    icon: Clock,
    label: "Stale",
    classes: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-800",
  },
  offline: {
    icon: WifiOff,
    label: "Offline",
    classes: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-700",
  },
  error: {
    icon: AlertTriangle,
    label: "Error",
    classes: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10 border-rose-200 dark:border-rose-800",
  },
};

interface StatusChipProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusChip({ variant, label, className }: StatusChipProps) {
  const v = variants[variant];
  const Icon = v.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border",
      v.classes,
      className
    )} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <Icon className={cn("w-3 h-3", variant === "syncing" && "animate-spin")} />
      {label || v.label}
    </span>
  );
}
