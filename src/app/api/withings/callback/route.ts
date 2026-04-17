import { NextRequest, NextResponse } from "next/server";


import {
  BASE_PATH,
  COOKIE_MAX_AGE,
  WITHINGS_CLIENT_ID,
  WITHINGS_CLIENT_SECRET,
  WITHINGS_COOKIE_NAME,
  WITHINGS_REFRESH_COOKIE_NAME,
  WITHINGS_TOKEN_URL,
} from "@/lib/constants";

export async function GET(req: NextRequest) {

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("withings_oauth_state")?.value;

  // Validate CSRF state
  if (!state || !storedState || state !== storedState) {
    return redirectToSettings(req, "invalid_state");
  }

  if (!code) {
    return redirectToSettings(req, "no_code");
  }

  // Exchange authorization code for tokens
  const nextAuthUrl = process.env.NEXTAUTH_URL || `https://localhost:3000${BASE_PATH}/api/auth`;
  const baseUrl = nextAuthUrl.replace(/\/api\/auth$/, "");
  const redirectUri = `${baseUrl}/api/withings/callback`;

  try {
    const params = new URLSearchParams({
      action: "requesttoken",
      grant_type: "authorization_code",
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(WITHINGS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error("Withings token exchange HTTP error:", response.status);
      return redirectToSettings(req, "token_error");
    }

    const result = await response.json();

    if (result.status !== 0) {
      // Don't log result.error verbatim in case upstream echoes secrets back.
      console.error("Withings token exchange API error, status:", result.status);
      return redirectToSettings(req, "token_error");
    }

    const { access_token, refresh_token } = result.body;

    if (!access_token || !refresh_token) {
      console.error("Withings token exchange: missing tokens");
      return redirectToSettings(req, "token_error");
    }

    // Store tokens server-side for cross-browser persistence.
    // Use a temp file + atomic rename so a crash mid-write never leaves a
    // partially-written JSON blob that the read path would silently ignore.
    const fs = await import("fs/promises");
    const path = await import("path");
    const tokenFile = path.join(process.cwd(), ".withings-tokens.json");
    const tmpFile = tokenFile + ".tmp";
    await fs.writeFile(tmpFile, JSON.stringify({
      access_token, refresh_token, userid: result.body.userid,
      expires_at: Date.now() + (result.body.expires_in || 10800) * 1000,
    }));
    await fs.rename(tmpFile, tokenFile);

    // Store tokens in secure cookies (browser-specific fallback)
    const res = redirectToSettings(req, "success");
    res.cookies.set(WITHINGS_COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    res.cookies.set(WITHINGS_REFRESH_COOKIE_NAME, refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    // Clear the state cookie
    res.cookies.delete("withings_oauth_state");

    return res;
  } catch (error) {
    console.error("Withings OAuth callback error:", error instanceof Error ? error.message : "Unknown");
    return redirectToSettings(req, "token_error");
  }
}

function redirectToSettings(req: NextRequest, status: string): NextResponse {
  const nextAuthUrl = process.env.NEXTAUTH_URL || `https://localhost:3000${BASE_PATH}/api/auth`;
  const publicBase = nextAuthUrl.replace(/\/api\/auth$/, "");
  const settingsUrl = new URL(`${publicBase}/settings`);
  settingsUrl.searchParams.set("withings", status);
  return NextResponse.redirect(settingsUrl);
}
