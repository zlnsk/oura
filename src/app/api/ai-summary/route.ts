import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import {
  AI_DAILY_LIMIT,
  AI_REQUEST_MAX_BYTES,
  ALLOWED_AI_PAGES,
} from "@/lib/constants";
import { audit, getClientIP } from "@/lib/audit";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

function hashKey(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------
// Atomic rate limiter – uses a lock flag to prevent concurrent bypass.
// Falls back to in-memory when the filesystem is unavailable (e.g. edge).
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

let memoryStore: RateLimitStore = {};
let writeLock = false;

async function loadStore(): Promise<RateLimitStore> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), ".rate-limit-store.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as RateLimitStore;
  } catch {
    return { ...memoryStore };
  }
}

async function saveStore(store: RateLimitStore): Promise<void> {
  memoryStore = store;
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), ".rate-limit-store.json");
    const tmp = filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(store), "utf-8");
    await fs.rename(tmp, filePath); // atomic rename
  } catch {
    // filesystem unavailable – memory-only
  }
}

async function checkRateLimit(
  key: string
): Promise<{ allowed: boolean; remaining: number }> {
  // Wait for lock with timeout
  const start = Date.now();
  while (writeLock && Date.now() - start < 2000) {
    await new Promise((r) => setTimeout(r, 10));
  }

  if (writeLock) {
    return { allowed: false, remaining: 0 };
  }
  writeLock = true;
  try {
    const store = await loadStore();
    const now = Date.now();
    const entry = store[key];

    if (!entry || now > entry.resetAt) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      store[key] = { count: 1, resetAt: tomorrow.getTime() };
      await saveStore(store);
      return { allowed: true, remaining: AI_DAILY_LIMIT - 1 };
    }

    if (entry.count >= AI_DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    entry.count++;
    await saveStore(store);
    return { allowed: true, remaining: AI_DAILY_LIMIT - entry.count };
  } finally {
    writeLock = false;
  }
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "AI summary is not configured on this server" },
      { status: 503 }
    );
  }

  // Validate request body size by reading the actual body (not trusting Content-Length header)
  let rawBody: string;
  try {
    const bodyBytes = await req.arrayBuffer();
    if (bodyBytes.byteLength > AI_REQUEST_MAX_BYTES) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }
    rawBody = new TextDecoder().decode(bodyBytes);
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  // Rate limit per user (hash PII before using as key)
  const userEmail = req.headers.get("x-user-email") || req.headers.get("remote-email");
  const rateLimitKey = hashKey(userEmail || `ip:${getClientIP(req.headers) || "unknown"}`);
  const { allowed, remaining } = await checkRateLimit(rateLimitKey);
  if (!allowed) {
    audit("rate_limit.hit", userEmail || "anonymous", {
      ip: getClientIP(req.headers),
      details: "ai_summary",
    });
    return NextResponse.json(
      {
        error: `Daily AI summary limit reached (${AI_DAILY_LIMIT}/day). Resets at midnight UTC.`,
      },
      { status: 429 }
    );
  }

  audit("ai_summary.request", userEmail || "anonymous", {
    ip: getClientIP(req.headers),
    details: `remaining=${remaining}`,
  });

  let body: { data: DataRecord; page: string; consent?: boolean };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Require explicit consent before sending health data to AI provider
  if (!body.consent) {
    return NextResponse.json(
      { error: "User consent is required to send health data to the AI provider. Please acknowledge the data sharing notice." },
      { status: 403 }
    );
  }

  const { data, page } = body;
  const pageType = ALLOWED_AI_PAGES.includes(page as typeof ALLOWED_AI_PAGES[number])
    ? page
    : "dashboard";

  const prompt = buildPrompt(data, pageType);

  try {
    let text: string;
    try {
      const { chatText } = require("shared-ai");
      text = await chatText({
        apiKey: OPENROUTER_API_KEY,
        model: "openrouter/auto",
        maxTokens: 512,
        appName: "Oura",
        referer: process.env.NEXT_PUBLIC_APP_URL || "",
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err: any) {
      console.error(`OpenRouter API error: ${err?.message || err}`);
      throw new Error("Failed to generate summary");
    }

    const rateLimitHeaders = {
      "X-RateLimit-Limit": String(AI_DAILY_LIMIT),
      "X-RateLimit-Remaining": String(remaining),
    };

    try {
      const parsed = JSON.parse(text);
      // Validate shape before trusting the payload.
      if (parsed && typeof parsed === "object" && typeof parsed.overall === "string") {
        return NextResponse.json(
          { summary: parsed, remaining },
          { headers: rateLimitHeaders }
        );
      }
    } catch {
      // fall through to the safe fallback below
    }
    return NextResponse.json(
      {
        summary: {
          overall: "Unable to parse AI response. Please try again.",
          sleep: "",
          activity: "",
          readiness: "",
          tip: "",
        },
        remaining,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("AI summary error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to generate AI summary. Please try again later." },
      { status: 500 }
    );
  }
}

// ---- Data extraction helpers ----

type DataRecord = Record<string, unknown>;

function extractSleep(data: DataRecord) {
  return (data.sleep as Array<{ day: string; score: number }>) || [];
}
function extractActivity(data: DataRecord) {
  return (
    (data.activity as Array<{
      day: string;
      score: number;
      steps: number;
      total_calories: number;
      active_calories: number;
      high_activity_time: number;
      medium_activity_time: number;
      low_activity_time: number;
      equivalent_walking_distance: number;
    }>) || []
  );
}
function extractReadiness(data: DataRecord) {
  return (
    (data.readiness as Array<{
      day: string;
      score: number;
      temperature_deviation: number;
      temperature_trend_deviation: number;
      contributors: Record<string, number>;
    }>) || []
  );
}
function extractStress(data: DataRecord) {
  return (
    (data.stress as Array<{
      day: string;
      stress_high: number;
      recovery_high: number;
      daytime_recovery: number;
      day_summary: string;
    }>) || []
  );
}
function extractSleepPeriods(data: DataRecord) {
  return (
    (data.sleepPeriods as Array<{
      day: string;
      total_sleep_duration: number;
      deep_sleep_duration: number;
      rem_sleep_duration: number;
      light_sleep_duration: number;
      awake_time: number;
      average_hrv: number;
      average_heart_rate: number;
      lowest_heart_rate: number;
      efficiency: number;
      bedtime_start: string;
      bedtime_end: string;
    }>) || []
  );
}
function extractWorkouts(data: DataRecord) {
  return (
    (data.workouts as Array<{
      day: string;
      activity: string;
      calories: number;
      distance: number;
      intensity: string;
      start_datetime: string;
      end_datetime: string;
    }>) || []
  );
}
function extractSpo2(data: DataRecord) {
  return (
    (data.spo2 as Array<{
      day: string;
      spo2_percentage: { average: number };
    }>) || []
  );
}
function extractWeight(data: DataRecord) {
  return (
    (data.weight as Array<{
      day: string;
      weight: number;
      fat_mass_weight?: number;
      fat_ratio?: number;
      muscle_mass?: number;
      bone_mass?: number;
      hydration?: number;
    }>) || []
  );
}
function extractCardiovascularAge(data: DataRecord) {
  return (
    (data.cardiovascularAge as Array<{
      day: string;
      vascular_age: number;
    }>) || []
  );
}

function formatSleepDetails(
  periods: ReturnType<typeof extractSleepPeriods>,
  count = 7
) {
  return (
    periods
      .slice(-count)
      .map(
        (s) =>
          `${s.day}: total=${Math.round(s.total_sleep_duration / 60)}min deep=${Math.round(s.deep_sleep_duration / 60)}min rem=${Math.round(s.rem_sleep_duration / 60)}min light=${Math.round(s.light_sleep_duration / 60)}min awake=${Math.round(s.awake_time / 60)}min efficiency=${s.efficiency}% hrv=${s.average_hrv} hr=${s.average_heart_rate} lowest_hr=${s.lowest_heart_rate}`
      )
      .join("\n") || "No data"
  );
}

// ---- Time context helper ----

function timeContext(): string {
  const now = new Date();
  const hours = now.getHours();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dayPart = hours < 12 ? "morning" : hours < 17 ? "afternoon" : "evening";
  return `Current time: ${timeStr} (${dayPart}). When analyzing today's data, note the day is still in progress — do not judge incomplete daily totals as "low" or concerning.`;
}

// ---- Prompt builders per page ----

function buildPrompt(data: DataRecord, page: string): string {
  switch (page) {
    case "sleep":
      return buildSleepPrompt(data);
    case "activity":
      return buildActivityPrompt(data);
    case "readiness":
      return buildReadinessPrompt(data);
    case "heart-rate":
      return buildHeartRatePrompt(data);
    case "stress":
      return buildStressPrompt(data);
    case "workouts":
      return buildWorkoutsPrompt(data);
    case "weight":
      return buildWeightPrompt(data);
    default:
      return buildDashboardPrompt(data);
  }
}

function jsonInstructions() {
  return `Respond with ONLY valid JSON (no markdown, no code fences):
{
  "overall": "2-3 concise sentences with specific numbers from the data. Focus on what stands out and actionable observations.",
  "tip": "One specific, actionable tip based on the data."
}`;
}

function buildDashboardPrompt(data: DataRecord): string {
  const sleep = extractSleep(data);
  const activity = extractActivity(data);
  const readiness = extractReadiness(data);
  const stress = extractStress(data);
  const sleepPeriods = extractSleepPeriods(data);

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const todaySleep =
    sleep.find((s) => s.day === todayStr) || sleep.find((s) => s.day === yesterdayStr) || sleep[sleep.length - 1];
  const todayActivity =
    activity.find((a) => a.day === todayStr) || null;
  const mostRecentActivity =
    activity[activity.length - 1] || null;
  const todayReadiness =
    readiness.find((r) => r.day === todayStr) || readiness.find((r) => r.day === yesterdayStr) || readiness[readiness.length - 1];
  const lastNight =
    sleepPeriods.find((s) => s.day === todayStr) ||
    sleepPeriods[sleepPeriods.length - 1];

  const todaySection = [
    todaySleep
      ? `Sleep score: ${todaySleep.score} (${todaySleep.day})`
      : null,
    todayActivity
      ? `TODAY activity score: ${todayActivity.score}, steps so far: ${todayActivity.steps}, calories: ${todayActivity.total_calories} (${todayActivity.day})`
      : mostRecentActivity
        ? `Most recent activity (${mostRecentActivity.day}, NOT today): score=${mostRecentActivity.score}, steps=${mostRecentActivity.steps}, calories=${mostRecentActivity.total_calories}. Today's activity data is not yet available — do NOT report these as today's steps.`
        : null,
    todayReadiness
      ? `Readiness score: ${todayReadiness.score} (${todayReadiness.day})`
      : null,
    lastNight
      ? `Last night: total=${Math.round(lastNight.total_sleep_duration / 60)}min deep=${Math.round(lastNight.deep_sleep_duration / 60)}min rem=${Math.round(lastNight.rem_sleep_duration / 60)}min hrv=${lastNight.average_hrv} hr=${lastNight.average_heart_rate} lowest_hr=${lastNight.lowest_heart_rate}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a concise health analyst for an Oura Ring dashboard. ${timeContext()} The user is on the Dashboard overview. Focus on the selected day's data. Use recent trends only for context. ${jsonInstructions()}

Also include these additional fields in the JSON:
  "sleep": "One sentence about last night's sleep with specific numbers.",
  "activity": "One sentence about today's activity progress.",
  "readiness": "One sentence about today's recovery status."

## Today's Data
${todaySection || "No data yet today"}

## Recent Sleep (last 7 nights)
${formatSleepDetails(sleepPeriods)}

## Recent Activity
${activity.slice(-7).map((a) => `${a.day}: score=${a.score} steps=${a.steps} cal=${a.total_calories}`).join("\n") || "No data"}

## Recent Readiness
${readiness.slice(-7).map((r) => `${r.day}: ${r.score}`).join(", ") || "No data"}

## Stress
${stress.slice(-7).map((s) => `${s.day}: stress=${Math.round((s.stress_high || 0) / 60)}min recovery=${Math.round((s.recovery_high || 0) / 60)}min`).join(", ") || "No data"}`;
}

function buildSleepPrompt(data: DataRecord): string {
  const sleep = extractSleep(data);
  const sleepPeriods = extractSleepPeriods(data);

  return `You are a sleep analyst for an Oura Ring dashboard. ${timeContext()} The user is viewing their Sleep Analysis page. Analyze their sleep patterns, quality, and trends. Be specific with numbers. ${jsonInstructions()}

## Sleep Scores (recent)
${sleep.slice(-14).map((s) => `${s.day}: ${s.score}`).join(", ") || "No data"}

## Detailed Sleep Data (last 7 nights)
${formatSleepDetails(sleepPeriods)}

Focus on: sleep duration trends, deep/REM balance, HRV during sleep, heart rate patterns, efficiency, and any concerning patterns.`;
}

function buildActivityPrompt(data: DataRecord): string {
  const activity = extractActivity(data);
  const workouts = extractWorkouts(data);

  return `You are an activity analyst for an Oura Ring dashboard. ${timeContext()} The user is viewing their Activity page. Analyze movement, steps, calories, and activity patterns. Be specific with numbers. ${jsonInstructions()}

## Recent Activity (last 14 days)
${activity.slice(-14).map((a) => `${a.day}: score=${a.score} steps=${a.steps} cal=${a.total_calories} active_cal=${a.active_calories} high=${Math.round((a.high_activity_time || 0) / 60)}min med=${Math.round((a.medium_activity_time || 0) / 60)}min low=${Math.round((a.low_activity_time || 0) / 60)}min`).join("\n") || "No data"}

## Recent Workouts
${workouts.slice(-7).map((w) => `${w.day}: ${w.activity} ${Math.round(w.calories)}cal ${w.intensity}`).join("\n") || "No workouts"}

Focus on: step count trends, calorie burn consistency, activity intensity distribution, and workout frequency.`;
}

function buildReadinessPrompt(data: DataRecord): string {
  const readiness = extractReadiness(data);
  const sleepPeriods = extractSleepPeriods(data);

  return `You are a recovery analyst for an Oura Ring dashboard. ${timeContext()} The user is viewing their Readiness page. Analyze recovery status, temperature trends, and readiness contributors. Be specific with numbers. ${jsonInstructions()}

## Recent Readiness (last 14 days)
${readiness.slice(-14).map((r) => `${r.day}: score=${r.score} temp_dev=${r.temperature_deviation?.toFixed(2) || "?"}°C temp_trend=${r.temperature_trend_deviation?.toFixed(2) || "?"}°C`).join("\n") || "No data"}

## Recent Sleep Context
${formatSleepDetails(sleepPeriods)}

Focus on: readiness score trends, temperature deviations (flag anything unusual), recovery patterns, and relationship between sleep quality and readiness.`;
}

function buildHeartRatePrompt(data: DataRecord): string {
  const sleepPeriods = extractSleepPeriods(data);

  return `You are a cardiovascular analyst for an Oura Ring dashboard. ${timeContext()} The user is viewing their Heart Rate page. Analyze resting HR, HRV trends, and cardiovascular patterns. Be specific with numbers. ${jsonInstructions()}

## Heart Rate & HRV During Sleep (last 14 nights)
${sleepPeriods.slice(-14).map((s) => `${s.day}: avg_hr=${s.average_heart_rate} lowest_hr=${s.lowest_heart_rate} avg_hrv=${s.average_hrv}`).join("\n") || "No data"}

Focus on: resting HR trends (lower is generally better), HRV trends (higher is generally better), HR variability between nights, and any notable patterns or anomalies.`;
}

function buildStressPrompt(data: DataRecord): string {
  const stress = extractStress(data);
  const spo2 = extractSpo2(data);
  const cvAge = extractCardiovascularAge(data);

  return `You are a stress & resilience analyst for an Oura Ring dashboard. ${timeContext()} The user is viewing their Stress & Resilience page. Analyze stress levels, recovery, SpO2, and cardiovascular metrics. Be specific with numbers. ${jsonInstructions()}

## Stress Data (last 14 days)
${stress.slice(-14).map((s) => `${s.day}: summary=${s.day_summary} stress=${Math.round((s.stress_high || 0) / 60)}min recovery=${Math.round((s.recovery_high || 0) / 60)}min daytime_recovery=${Math.round((s.daytime_recovery || 0) / 60)}min`).join("\n") || "No data"}

## SpO2 (Blood Oxygen)
${spo2.slice(-14).map((s) => `${s.day}: avg=${s.spo2_percentage?.average || "?"}%`).join(", ") || "No data"}

## Cardiovascular Age
${cvAge.slice(-7).map((c) => `${c.day}: ${c.vascular_age}yrs`).join(", ") || "No data"}

Focus on: stress-to-recovery balance, SpO2 levels (flag if <95%), cardiovascular age relative to chronological age, and stress management patterns.`;
}

function buildWorkoutsPrompt(data: DataRecord): string {
  const workouts = extractWorkouts(data);
  const activity = extractActivity(data);

  return `You are a fitness analyst for an Oura Ring dashboard. ${timeContext()} The user is viewing their Workouts page. Analyze workout patterns, frequency, intensity, and calorie burn. Be specific with numbers. ${jsonInstructions()}

## Recent Workouts (last 14)
${workouts.slice(-14).map((w) => {
    const dur = Math.round(
      (new Date(w.end_datetime).getTime() -
        new Date(w.start_datetime).getTime()) /
        60000
    );
    return `${w.day}: ${w.activity} ${dur}min ${Math.round(w.calories)}cal ${w.intensity} dist=${Math.round(((w.distance || 0) / 1000) * 10) / 10}km`;
  }).join("\n") || "No workouts"}

## Activity Context (last 7 days)
${activity.slice(-7).map((a) => `${a.day}: score=${a.score} steps=${a.steps} cal=${a.total_calories}`).join("\n") || "No data"}

Focus on: workout frequency and consistency, intensity distribution, calorie burn patterns, variety of activities, and recovery between sessions.`;
}

function buildWeightPrompt(data: DataRecord): string {
  const weight = extractWeight(data);
  const activity = extractActivity(data);

  const hasBodyComp = weight.some(
    (w) => w.fat_ratio != null || w.muscle_mass != null
  );

  const weightDetails = weight
    .slice(-30)
    .map((w) => {
      let line = `${w.day}: ${w.weight}kg`;
      if (w.fat_ratio != null) line += ` fat=${w.fat_ratio.toFixed(1)}%`;
      if (w.muscle_mass != null)
        line += ` muscle=${w.muscle_mass.toFixed(1)}kg`;
      if (w.fat_mass_weight != null)
        line += ` fat_mass=${w.fat_mass_weight.toFixed(1)}kg`;
      return line;
    })
    .join("\n");

  return `You are a body composition and weight analyst for a health dashboard. ${timeContext()} The user is viewing their Weight page with data from a Withings smart scale. Analyze weight trends, body composition changes, and provide actionable insights. Be specific with numbers. ${jsonInstructions()}

## Weight Measurements (last 30 entries)
${weightDetails || "No data"}

${
  hasBodyComp
    ? "## Note: Body composition data is available (fat %, muscle mass). Analyze composition trends, not just total weight."
    : "## Note: Only weight data is available (no body composition)."
}

## Activity Context (last 7 days)
${activity.slice(-7).map((a) => `${a.day}: score=${a.score} steps=${a.steps} cal=${a.total_calories}`).join("\n") || "No data"}

Focus on: weight trend direction and rate of change, body composition improvements (if available), correlation with activity levels, consistency of measurements, and realistic goal-setting advice. If body fat and muscle data are available, emphasize body composition over total weight.`;
}
