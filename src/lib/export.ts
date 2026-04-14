import type { DashboardData } from "@/types/oura";

/**
 * Escape a CSV field per RFC 4180:
 * - Wrap in double quotes if the value contains commas, double quotes, or newlines.
 * - Escape double quotes by doubling them.
 * - Prefix fields starting with =, +, -, @ with a single quote to prevent formula injection.
 */
function escapeCSVField(value: unknown): string {
  let str = value == null ? "" : String(value);

  // Formula injection prevention
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }

  // RFC 4180: wrap in quotes if the field contains special characters
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

function csvRow(fields: unknown[]): string {
  return fields.map(escapeCSVField).join(",") + "\n";
}

/**
 * Export data as CSV and trigger a download.
 */
export function exportCSV(data: DashboardData, page: string, days: number) {
  let csv = "";
  const filename = `oura-${page}-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;

  switch (page) {
    case "sleep": {
      csv = "Date,Score,Total Sleep (min),Deep (min),REM (min),Light (min),Awake (min),Efficiency %,Avg HR,Avg HRV\n";
      const periods = data.sleepPeriods.filter((p) => p.type === "long_sleep");
      const scoreMap = new Map(data.sleep.map((s) => [s.day, s.score]));
      for (const p of periods) {
        csv += csvRow([
          p.day,
          scoreMap.get(p.day) || "",
          Math.round(p.total_sleep_duration / 60),
          Math.round(p.deep_sleep_duration / 60),
          Math.round(p.rem_sleep_duration / 60),
          Math.round(p.light_sleep_duration / 60),
          Math.round(p.awake_time / 60),
          p.efficiency,
          Math.round(p.average_heart_rate),
          Math.round(p.average_hrv),
        ]);
      }
      break;
    }
    case "activity": {
      csv = "Date,Score,Steps,Total Calories,Active Calories,High Activity (min),Medium Activity (min),Low Activity (min)\n";
      for (const a of data.activity) {
        csv += csvRow([
          a.day,
          a.score,
          a.steps,
          a.total_calories,
          a.active_calories,
          Math.round(a.high_activity_time / 60),
          Math.round(a.medium_activity_time / 60),
          Math.round(a.low_activity_time / 60),
        ]);
      }
      break;
    }
    case "readiness": {
      csv = "Date,Score,Temperature Deviation\n";
      for (const r of data.readiness) {
        csv += csvRow([
          r.day,
          r.score,
          r.temperature_deviation?.toFixed(2) || "",
        ]);
      }
      break;
    }
    case "heart-rate": {
      csv = "Date,Avg HR (bpm),Lowest HR (bpm),Avg HRV (ms)\n";
      const periods = data.sleepPeriods.filter((p) => p.type === "long_sleep");
      for (const p of periods) {
        csv += csvRow([
          p.day,
          Math.round(p.average_heart_rate),
          p.lowest_heart_rate,
          Math.round(p.average_hrv),
        ]);
      }
      break;
    }
    case "stress": {
      csv = "Date,Stress High (min),Recovery High (min),Daytime Recovery (min),Summary\n";
      for (const s of data.stress) {
        csv += csvRow([
          s.day,
          Math.round((s.stress_high || 0) / 60),
          Math.round((s.recovery_high || 0) / 60),
          Math.round((s.daytime_recovery || 0) / 60),
          s.day_summary || "",
        ]);
      }
      break;
    }
    case "workouts": {
      csv = "Date,Activity,Calories,Distance (km),Intensity,Duration (min)\n";
      for (const w of data.workouts) {
        const dur = Math.round(
          (new Date(w.end_datetime).getTime() - new Date(w.start_datetime).getTime()) / 60000
        );
        csv += csvRow([
          w.day,
          w.activity,
          Math.round(w.calories),
          ((w.distance || 0) / 1000).toFixed(1),
          w.intensity,
          dur,
        ]);
      }
      break;
    }
    case "weight": {
      csv = "Date,Weight (kg),Fat %,Muscle Mass (kg),Fat Mass (kg)\n";
      for (const w of data.weight) {
        csv += csvRow([
          w.day,
          w.weight?.toFixed(1) || "",
          w.fat_ratio?.toFixed(1) || "",
          w.muscle_mass?.toFixed(1) || "",
          w.fat_mass_weight?.toFixed(1) || "",
        ]);
      }
      break;
    }
    default: {
      // Dashboard overview
      csv = "Date,Sleep Score,Activity Score,Readiness Score,Steps,Total Calories\n";
      const sleepMap = new Map(data.sleep.map((s) => [s.day, s.score]));
      const readinessMap = new Map(data.readiness.map((r) => [r.day, r.score]));
      for (const a of data.activity) {
        csv += csvRow([
          a.day,
          sleepMap.get(a.day) || "",
          a.score,
          readinessMap.get(a.day) || "",
          a.steps,
          a.total_calories,
        ]);
      }
      break;
    }
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
