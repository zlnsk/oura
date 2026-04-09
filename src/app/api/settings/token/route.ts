import { NextRequest, NextResponse } from "next/server";


import {
  COOKIE_MAX_AGE,
  OURA_COOKIE_NAME,
  OURA_TOKEN_MIN_LENGTH,
  OURA_TOKEN_PATTERN,
  OURA_BASE_URL,
} from "@/lib/constants";
import { audit, getClientIP } from "@/lib/audit";

export async function GET(req: NextRequest) {

  const hasToken = !!req.cookies.get(OURA_COOKIE_NAME)?.value || !!process.env.OURA_TOKEN;
  return NextResponse.json({ hasToken });
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
  if (
    !token ||
    typeof token !== "string" ||
    token.trim().length < OURA_TOKEN_MIN_LENGTH
  ) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const trimmed = token.trim();
  if (!OURA_TOKEN_PATTERN.test(trimmed)) {
    return NextResponse.json(
      {
        error:
          "Invalid token format. Token must contain only letters, numbers, hyphens, and underscores.",
      },
      { status: 400 }
    );
  }

  // Verify token is actually valid by making a test API call
  try {
    const verifyRes = await fetch(`${OURA_BASE_URL}/personal_info`, {
      headers: { Authorization: `Bearer ${trimmed}` },
    });
    if (!verifyRes.ok) {
      audit("token.verify", "user", {
        ip: getClientIP(req.headers),
        success: false,
        details: `HTTP ${verifyRes.status}`,
      });
      return NextResponse.json(
        { error: "Token verification failed. The token may be invalid or revoked." },
        { status: 400 }
      );
    }
  } catch {
    // If we can't reach Oura API, save anyway but warn the user
    audit("token.create", "user", {
      ip: getClientIP(req.headers),
      details: "verification_unreachable",
    });

    const res = NextResponse.json({
      success: true,
      warning: "Token saved, but could not be verified because the Oura API is currently unreachable. It will be used on your next data fetch.",
    });
    res.cookies.set(OURA_COOKIE_NAME, trimmed, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  audit("token.create", "user", {
    ip: getClientIP(req.headers),
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(OURA_COOKIE_NAME, trimmed, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE(req: NextRequest) {

  audit("token.delete", "user", {
    ip: getClientIP(req.headers),
  });

  const res = NextResponse.json({ success: true });
  res.cookies.delete(OURA_COOKIE_NAME);
  return res;
}
