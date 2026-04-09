import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|api/health|icon\\.svg|manifest\\.json|sw\\.js|buildInfo\\.json).*)"],
};
