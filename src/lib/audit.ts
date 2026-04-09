// ---------------------------------------------------------------------------
// Server-side audit logger for security-sensitive operations.
// Logs to stdout in structured JSON format for easy parsing by log aggregators.
// ---------------------------------------------------------------------------

type AuditEvent =
  | "token.create"
  | "token.delete"
  | "token.verify"
  | "ai_key.create"
  | "ai_key.delete"
  | "withings.create"
  | "withings.delete"
  | "withings.oauth"
  | "auth.signin"
  | "auth.failed"
  | "rate_limit.hit"
  | "ai_summary.request"
  | "data.fetch";

interface AuditEntry {
  event: AuditEvent;
  user: string;
  ip?: string;
  details?: string;
  success: boolean;
  timestamp: string;
}

export function audit(
  event: AuditEvent,
  user: string,
  opts: { ip?: string; details?: string; success?: boolean } = {}
) {
  const entry: AuditEntry = {
    event,
    user,
    ip: opts.ip,
    details: opts.details,
    success: opts.success !== false,
    timestamp: new Date().toISOString(),
  };

  // Structured JSON log line
  console.log(JSON.stringify({ audit: entry }));
}

/**
 * Extract client IP from request headers.
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
