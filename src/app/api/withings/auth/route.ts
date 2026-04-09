import { NextResponse } from "next/server";


import {
  BASE_PATH,
  WITHINGS_CLIENT_ID,
  WITHINGS_AUTH_URL,
} from "@/lib/constants";
import { randomBytes } from "crypto";

export async function GET() {

  if (!WITHINGS_CLIENT_ID) {
    return NextResponse.json(
      { error: "Withings OAuth is not configured. Set WITHINGS_CLIENT_ID and WITHINGS_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  // Build the callback URL from the origin + BASE_PATH (NEXTAUTH_URL includes /api/auth suffix)
  const nextAuthUrl = process.env.NEXTAUTH_URL || `https://localhost:3000${BASE_PATH}/api/auth`;
  const baseUrl = nextAuthUrl.replace(/\/api\/auth$/, "");
  const redirectUri = `${baseUrl}/api/withings/callback`;

  // Generate a CSRF state token
  const state = randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: WITHINGS_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "user.metrics",
    state,
  });

  const authUrl = `${WITHINGS_AUTH_URL}?${params.toString()}`;

  // Store state in a short-lived cookie for CSRF verification
  const res = NextResponse.redirect(authUrl);
  res.cookies.set("withings_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // lax needed for redirect flow
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return res;
}
