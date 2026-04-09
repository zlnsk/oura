// ---------------------------------------------------------------------------
// Shared constants – single source of truth for magic values
// ---------------------------------------------------------------------------

// Base path — must match next.config.js basePath
export const BASE_PATH = "/Oura";

// API & Data
export const OURA_BASE_URL = "https://api.ouraring.com/v2/usercollection";
export const CHUNK_SIZE_DAYS = 90;
export const DEFAULT_DAYS = 30;
export const MAX_DAYS = 365;
export const MIN_DAYS = 1;

// Cache
export const CACHE_KEY = "oura_data_cache";
export const STALE_MS = 15 * 60 * 1000; // 15 minutes

// Cookie
export const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days (seconds)
export const OURA_COOKIE_NAME = "oura_api_key";
export const AI_KEY_COOKIE_NAME = "anthropic_api_key";
export const WITHINGS_COOKIE_NAME = "withings_api_key";
export const WITHINGS_REFRESH_COOKIE_NAME = "withings_refresh_token";

// Withings OAuth
export const WITHINGS_CLIENT_ID = process.env.WITHINGS_CLIENT_ID || "";
export const WITHINGS_CLIENT_SECRET = process.env.WITHINGS_CLIENT_SECRET || "";
export const WITHINGS_AUTH_URL = "https://account.withings.com/oauth2_user/authorize2";
export const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";

// Rate limits
export const AI_DAILY_LIMIT = parseInt(process.env.AI_SUMMARY_DAILY_LIMIT || "20", 10);
export const AI_REQUEST_MAX_BYTES = 2_000_000; // 2 MB // 500 KB
export const OURA_PROXY_DAILY_LIMIT = 200; // per-user calls to /api/oura

// Validation
export const OURA_TOKEN_MIN_LENGTH = 10;
export const OURA_TOKEN_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const ANTHROPIC_KEY_PREFIX = "sk-ant-";

// Allowed pages for AI summaries
export const ALLOWED_AI_PAGES = [
  "dashboard",
  "sleep",
  "activity",
  "readiness",
  "heart-rate",
  "stress",
  "workouts",
  "weight",
] as const;

// Design tokens – centralized color palette for chart/stat components
export const COLORS = {
  // Score thresholds
  optimal: "#10b981", // emerald-500
  good: "#f59e0b", // amber-500
  attention: "#f43f5e", // rose-500

  // Chart / metric accents
  sleep: "#6366f1", // indigo-500
  readiness: "#10b981", // emerald-500
  activity: "#f59e0b", // amber-500
  heartRate: "#f43f5e", // rose-500
  hrv: "#8b5cf6", // violet-500
  stress: "#ec4899", // pink-500
  steps: "#10b981",
  calories: "#f97316", // orange-500
  spo2: "#06b6d4", // cyan-500
  weight: "#14b8a6", // teal-500
  brand: "#1a73e8", // google blue

  // Sleep stages
  deep: "#6366f1",
  rem: "#8b5cf6",
  light: "#a78bfa",
  awake: "#f43f5e",
} as const;

export type PageType = (typeof ALLOWED_AI_PAGES)[number];
