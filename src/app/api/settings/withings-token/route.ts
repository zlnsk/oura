import { NextRequest, NextResponse } from "next/server";


import {
  COOKIE_MAX_AGE,
  WITHINGS_CLIENT_ID,
  WITHINGS_COOKIE_NAME,
  WITHINGS_REFRESH_COOKIE_NAME,
} from "@/lib/constants";

export async function GET(req: NextRequest) {

  let hasToken = !!req.cookies.get(WITHINGS_COOKIE_NAME)?.value;
  // Also check server-side stored tokens
  if (!hasToken) {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const raw = await fs.readFile(path.join(process.cwd(), ".withings-tokens.json"), "utf-8");
      const stored = JSON.parse(raw);
      hasToken = !!stored.access_token;
    } catch {}
  }
  const oauthAvailable = !!WITHINGS_CLIENT_ID;
  return NextResponse.json({ hasToken, oauthAvailable });
}

export async function POST(req: NextRequest) {

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { token } = body;
  if (!token || typeof token !== "string" || token.trim().length < 10 || token.trim().length > 2048) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const trimmed = token.trim();

  // Validate token format: alphanumeric characters, hyphens, underscores, and periods only
  const WITHINGS_TOKEN_PATTERN = /^[a-zA-Z0-9_\-.]+$/;
  if (!WITHINGS_TOKEN_PATTERN.test(trimmed)) {
    return NextResponse.json(
      {
        error:
          "Invalid token format. Token must contain only letters, numbers, hyphens, underscores, and periods.",
      },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(WITHINGS_COOKIE_NAME, trimmed, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {

  const res = NextResponse.json({ success: true });
  res.cookies.delete(WITHINGS_COOKIE_NAME);
  res.cookies.delete(WITHINGS_REFRESH_COOKIE_NAME);
  return res;
}
