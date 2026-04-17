import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatHoursMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  return "text-rose-500";
}

export function getScoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

export function getScoreGradient(score: number): string {
  if (score >= 85) return "from-emerald-500 to-emerald-400";
  if (score >= 70) return "from-amber-500 to-amber-400";
  return "from-rose-500 to-rose-400";
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Optimal";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Pay attention";
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function average(arr: number[]): number {
  const valid = arr.filter((v) => v > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export function trend(arr: number[]): "up" | "down" | "stable" {
  if (arr.length < 2) return "stable";
  const firstHalf = arr.slice(0, Math.floor(arr.length / 2));
  const secondHalf = arr.slice(Math.floor(arr.length / 2));
  const avgFirst = average(firstHalf);
  const avgSecond = average(secondHalf);
  const diff = avgSecond - avgFirst;
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "up" : "down";
}
