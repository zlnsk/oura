import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const auth = require("shared-auth");

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const ips = xff.split(",").map((s: string) => s.trim());
    return ips[0] || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function getOTPConfig() {
  return auth.getConfig({
    basePath: "/Oura",
    appName: "Oura",
    authBasePath: "/Oura/api/otp",
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const config = getOTPConfig();

  if (action === "login") {
    return new NextResponse(auth.loginPageHTML(config), {
      headers: { "Content-Type": "text/html" },
    });
  }
  if (action === "logout") {
    const res = NextResponse.redirect(new URL(config.basePath + "/api/otp/auth/login", req.url));
    res.cookies.delete({ name: config.cookieName, path: "/" });
    return res;
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const config = getOTPConfig();

  if (action === "send-code") {
    try {
      const body = await req.json();
      const email = (body.email || "").trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

      const ip = getClientIP(req);
      if (!auth.checkRateLimit("send-ip:" + ip, 10, 15 * 60 * 1000)) {
        return NextResponse.json({ error: "Too many requests from this IP." }, { status: 429 });
      }
      if (!auth.checkRateLimit("send:" + email, 3, 15 * 60 * 1000)) {
        return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 });
      }

      if (config.allowedEmails.length > 0 && !config.allowedEmails.includes(email)) {
        return NextResponse.json({ ok: true, message: "If this email is authorized, a code has been sent." });
      }

      const { code } = auth.generateOTP(email);
      await auth.sendOTPEmail(email, code, config);
      return NextResponse.json({ ok: true, message: "If this email is authorized, a code has been sent." });
    } catch (err: unknown) {
      console.error("[Oura OTP] send-code error:", err);
      return NextResponse.json({ error: "Failed to send code. Please try again." }, { status: 500 });
    }
  }

  if (action === "verify") {
    try {
      const body = await req.json();
      const email = (body.email || "").trim().toLowerCase();
      const code = (body.code || "").trim();
      if (!email || !code) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

      if (!auth.checkRateLimit("verify:" + email, 5, 15 * 60 * 1000)) {
        return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
      }

      if (!auth.verifyOTP(email, code)) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
      }

      const token = auth.createSession(email, config.sessionSecret, config.sessionHours);
      const res = NextResponse.json({ ok: true, redirect: config.basePath });
      res.cookies.set({
        name: config.cookieName,
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: config.sessionHours * 60 * 60,
      });
      return res;
    } catch (err: unknown) {
      console.error("[Oura OTP] verify error:", err);
      return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
