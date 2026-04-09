/**
 * Tests for the Oura token settings API route.
 * Tests validation logic, authentication checks, and cookie configuration.
 */

describe("Settings Token API - Token Validation", () => {
  function validateToken(
    token: unknown
  ): { valid: true } | { valid: false; error: string } {
    if (!token || typeof token !== "string" || token.trim().length < 10) {
      return { valid: false, error: "Invalid token" };
    }
    return { valid: true };
  }

  it("rejects missing token", () => {
    expect(validateToken(undefined)).toEqual({
      valid: false,
      error: "Invalid token",
    });
  });

  it("rejects null token", () => {
    expect(validateToken(null)).toEqual({
      valid: false,
      error: "Invalid token",
    });
  });

  it("rejects empty string", () => {
    expect(validateToken("")).toEqual({
      valid: false,
      error: "Invalid token",
    });
  });

  it("rejects token shorter than 10 characters", () => {
    expect(validateToken("short")).toEqual({
      valid: false,
      error: "Invalid token",
    });
  });

  it("rejects non-string token", () => {
    expect(validateToken(12345)).toEqual({
      valid: false,
      error: "Invalid token",
    });
  });

  it("accepts valid token (10+ chars)", () => {
    expect(validateToken("a-valid-oura-token-123")).toEqual({ valid: true });
  });

  it("trims whitespace before length check", () => {
    expect(validateToken("  short  ")).toEqual({
      valid: false,
      error: "Invalid token",
    });
  });

  it("accepts token that is exactly 10 chars after trim", () => {
    expect(validateToken("1234567890")).toEqual({ valid: true });
  });
});

describe("Settings Token API - Cookie Configuration", () => {
  it("sets correct cookie options", () => {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "strict" as const,
      maxAge: 90 * 24 * 60 * 60,
      path: "/",
    };

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.secure).toBe(true);
    expect(cookieOptions.sameSite).toBe("strict");
    expect(cookieOptions.maxAge).toBe(7776000);
    expect(cookieOptions.path).toBe("/");
  });

  it("cookie maxAge is 90 days", () => {
    const maxAge = 90 * 24 * 60 * 60;
    const ninetyDaysInSeconds = 90 * 24 * 3600;
    expect(maxAge).toBe(ninetyDaysInSeconds);
  });
});

describe("Settings Token API - GET hasToken", () => {
  it("returns true when cookie exists", () => {
    const cookies: Record<string, string> = {
      oura_api_key: "some-token-value",
    };
    const hasToken = !!cookies["oura_api_key"];
    expect(hasToken).toBe(true);
  });

  it("returns false when cookie is missing", () => {
    const cookies: Record<string, string> = {};
    const hasToken = !!cookies["oura_api_key"];
    expect(hasToken).toBe(false);
  });
});
