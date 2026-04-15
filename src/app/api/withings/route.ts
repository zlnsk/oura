import { NextRequest, NextResponse } from "next/server";


import { fetchWithingsWeight, refreshWithingsToken } from "@/lib/withings-api";
import {
  COOKIE_MAX_AGE,
  DEFAULT_DAYS,
  MAX_DAYS,
  MIN_DAYS,
  WITHINGS_COOKIE_NAME,
  WITHINGS_REFRESH_COOKIE_NAME,
} from "@/lib/constants";

export async function GET(req: NextRequest) {

  let withingsToken = req.cookies.get(WITHINGS_COOKIE_NAME)?.value;
  let refreshToken = req.cookies.get(WITHINGS_REFRESH_COOKIE_NAME)?.value;

  // Fall back to server-side stored tokens (cross-browser persistence)
  if (!withingsToken) {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const tokenFile = path.join(process.cwd(), ".withings-tokens.json");
      const raw = await fs.readFile(tokenFile, "utf-8");
      let stored: { access_token?: string; refresh_token?: string };
      try {
        stored = JSON.parse(raw);
      } catch {
        // Token file corrupted — treat as missing rather than crash the request.
        stored = {};
      }
      withingsToken = stored.access_token;
      refreshToken = refreshToken || stored.refresh_token;
    } catch {
      // No stored tokens
    }
  }

  if (!withingsToken) {
    return NextResponse.json(
      { error: "No Withings API key configured" },
      { status: 400 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const rawDays = parseInt(
    searchParams.get("days") || String(DEFAULT_DAYS),
    10
  );
  const days = Number.isNaN(rawDays)
    ? DEFAULT_DAYS
    : Math.max(MIN_DAYS, Math.min(MAX_DAYS, rawDays));

  // Helper to build a successful response, optionally setting refreshed tokens
  const buildResponse = (
    weight: Awaited<ReturnType<typeof fetchWithingsWeight>>,
    newTokens?: { access_token: string; refresh_token: string }
  ) => {
    const res = NextResponse.json(
      { weight },
      {
        headers: {
          "Cache-Control":
            "private, max-age=300, stale-while-revalidate=600",
        },
      }
    );

    if (newTokens) {
      res.cookies.set(WITHINGS_COOKIE_NAME, newTokens.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
      res.cookies.set(WITHINGS_REFRESH_COOKIE_NAME, newTokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
      // Persist refreshed tokens server-side (async, non-blocking).
      void (async () => {
        try {
          const fs = await import("fs/promises");
          const path = await import("path");
          await fs.writeFile(
            path.join(process.cwd(), ".withings-tokens.json"),
            JSON.stringify({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              expires_at: Date.now() + 10800 * 1000,
            })
          );
        } catch (e) {
          console.warn("Failed to persist Withings tokens:", e instanceof Error ? e.message : e);
        }
      })();
    }

    return res;
  };

  try {
    const weight = await fetchWithingsWeight(withingsToken, days);
    return buildResponse(weight);
  } catch (error) {
    // If the access token is expired/invalid and we have a refresh token, try refreshing
    if (refreshToken) {
      try {
        const newTokens = await refreshWithingsToken(refreshToken);
        if (newTokens) {
          withingsToken = newTokens.access_token;
          const weight = await fetchWithingsWeight(withingsToken, days);
          return buildResponse(weight, newTokens);
        }
      } catch {
        // Refresh also failed – fall through to error
      }
    }

    console.error(
      "Withings API error:",
      error instanceof Error ? error.message : "Unknown"
    );
    return NextResponse.json(
      {
        error:
          "Failed to fetch data from Withings. Please reconnect your Withings account in Settings.",
      },
      { status: 500 }
    );
  }
}
