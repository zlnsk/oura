import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { fetchAllOuraData } from "@/lib/oura-api";
import {
  DEFAULT_DAYS,
  MAX_DAYS,
  MIN_DAYS,
  OURA_COOKIE_NAME,
  OURA_PROXY_DAILY_LIMIT,
} from "@/lib/constants";
import { audit, getClientIP } from "@/lib/audit";

function hashKey(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------
// Persistent rate limiter for the Oura proxy endpoint.
// Uses file-based storage with in-memory fallback.
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

async function loadProxyStore(): Promise<RateLimitStore> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), ".proxy-rate-limit.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as RateLimitStore;
  } catch {
    return { ...memoryStore };
  }
}

async function saveProxyStore(store: RateLimitStore): Promise<void> {
  memoryStore = store;
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), ".proxy-rate-limit.json");
    const tmp = filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(store), "utf-8");
    await fs.rename(tmp, filePath);
  } catch {
    // filesystem unavailable — memory-only
  }
}

async function checkProxyRateLimit(key: string): Promise<boolean> {
  // Wait for lock with timeout
  const start = Date.now();
  while (writeLock && Date.now() - start < 2000) {
    await new Promise((r) => setTimeout(r, 10));
  }

  if (writeLock) {
    return false;
  }
  writeLock = true;
  try {
    const store = await loadProxyStore();
    const now = Date.now();
    const entry = store[key];

    if (!entry || now > entry.resetAt) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      store[key] = { count: 1, resetAt: tomorrow.getTime() };
      await saveProxyStore(store);
      return true;
    }

    if (entry.count >= OURA_PROXY_DAILY_LIMIT) {
      return false;
    }

    entry.count++;
    await saveProxyStore(store);
    return true;
  } finally {
    writeLock = false;
  }
}

export async function GET(req: NextRequest) {

  const ouraToken = process.env.OURA_TOKEN || req.cookies.get(OURA_COOKIE_NAME)?.value;
  if (!ouraToken) {
    return NextResponse.json(
      { error: "No Oura API key configured" },
      { status: 400 }
    );
  }

  // Rate limit per user (hash PII before using as key)
  const email = req.headers.get("x-user-email") || req.headers.get("remote-email");
  const rateLimitKey = hashKey(email || `ip:${getClientIP(req.headers) || "unknown"}`);
  if (!(await checkProxyRateLimit(rateLimitKey))) {
    audit("rate_limit.hit", email || "anonymous", {
      ip: getClientIP(req.headers),
      details: "oura_proxy",
    });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again tomorrow." },
      { status: 429 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const rawDays = parseInt(searchParams.get("days") || String(DEFAULT_DAYS), 10);

  if (!Number.isNaN(rawDays) && (rawDays < MIN_DAYS || rawDays > MAX_DAYS)) {
    return NextResponse.json(
      { error: `Invalid days parameter: must be between ${MIN_DAYS} and ${MAX_DAYS}` },
      { status: 400 }
    );
  }

  audit("data.fetch", email || "anonymous", {
    ip: getClientIP(req.headers),
    details: `days=${rawDays}`,
  });
  const days = Number.isNaN(rawDays) ? DEFAULT_DAYS : rawDays;

  try {
    const data = await fetchAllOuraData(ouraToken, days);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Oura API error:", message);
    const isAuthError = message.includes("authentication failed");
    return NextResponse.json(
      {
        error: isAuthError
          ? message
          : "Failed to fetch data from Oura. Please check your API key and try again.",
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
