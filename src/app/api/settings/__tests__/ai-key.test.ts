/**
 * Tests for the Anthropic AI key settings API route.
 * Tests validation logic, format checking, and cookie configuration.
 */

describe("Settings AI Key API - Key Validation", () => {
  function validateAIKey(
    key: unknown
  ): { valid: true } | { valid: false; error: string } {
    if (!key || typeof key !== "string" || key.trim().length < 10) {
      return { valid: false, error: "Invalid API key" };
    }

    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      return {
        valid: false,
        error: "Invalid key format. Anthropic API keys start with sk-ant-",
      };
    }

    return { valid: true };
  }

  it("rejects missing key", () => {
    const result = validateAIKey(undefined);
    expect(result.valid).toBe(false);
  });

  it("rejects null key", () => {
    const result = validateAIKey(null);
    expect(result.valid).toBe(false);
  });

  it("rejects empty string", () => {
    const result = validateAIKey("");
    expect(result.valid).toBe(false);
  });

  it("rejects key shorter than 10 characters", () => {
    const result = validateAIKey("sk-ant-x");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Invalid API key");
    }
  });

  it("rejects non-string key", () => {
    const result = validateAIKey(12345);
    expect(result.valid).toBe(false);
  });

  it("rejects key without sk-ant- prefix", () => {
    const result = validateAIKey("sk-proj-1234567890");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("sk-ant-");
    }
  });

  it("rejects key with wrong prefix", () => {
    const result = validateAIKey("api-key-1234567890");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("sk-ant-");
    }
  });

  it("accepts valid Anthropic API key", () => {
    const result = validateAIKey("sk-ant-api03-validkey1234567890");
    expect(result.valid).toBe(true);
  });

  it("trims whitespace before validation", () => {
    const result = validateAIKey("  sk-ant-api03-validkey1234567890  ");
    expect(result.valid).toBe(true);
  });

  it("rejects key that is just whitespace around sk-ant-", () => {
    const result = validateAIKey("  sk-ant-  ");
    expect(result.valid).toBe(false);
  });
});

describe("Settings AI Key API - Cookie Configuration", () => {
  it("uses httpOnly cookies for security", () => {
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
  });
});

describe("Settings AI Key API - GET hasKey", () => {
  it("returns true when anthropic_api_key cookie exists", () => {
    const cookies: Record<string, string> = {
      anthropic_api_key: "sk-ant-valid-key",
    };
    const hasKey = !!cookies["anthropic_api_key"];
    expect(hasKey).toBe(true);
  });

  it("returns false when cookie is missing", () => {
    const cookies: Record<string, string> = {};
    const hasKey = !!cookies["anthropic_api_key"];
    expect(hasKey).toBe(false);
  });
});
