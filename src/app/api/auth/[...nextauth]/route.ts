// Auth removed — Pangolin OTP provides authentication at the tunnel level.
// Stub kept so build does not fail on missing route.
import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ status: "auth disabled" }); }
export function POST() { return NextResponse.json({ status: "auth disabled" }); }
