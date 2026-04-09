import { getDateRange, getDateTimeRange, fetchOuraData } from "../oura-api";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("getDateRange", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-06-15T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns correct start and end dates for 7 days", () => {
    const result = getDateRange(7);
    expect(result.start_date).toBe("2024-06-08");
    // end_date is exclusive (today + 1)
    expect(result.end_date).toBe("2024-06-16");
  });

  it("returns correct dates for 30 days", () => {
    const result = getDateRange(30);
    expect(result.start_date).toBe("2024-05-16");
    expect(result.end_date).toBe("2024-06-16");
  });

  it("returns correct dates for 1 day", () => {
    const result = getDateRange(1);
    expect(result.start_date).toBe("2024-06-14");
    expect(result.end_date).toBe("2024-06-16");
  });

  it("handles year boundaries", () => {
    jest.setSystemTime(new Date("2024-01-05T12:00:00"));
    const result = getDateRange(10);
    expect(result.start_date).toBe("2023-12-26");
    expect(result.end_date).toBe("2024-01-06");
  });

  it("handles month boundaries", () => {
    jest.setSystemTime(new Date("2024-03-02T12:00:00"));
    const result = getDateRange(5);
    expect(result.start_date).toBe("2024-02-26");
    expect(result.end_date).toBe("2024-03-03");
  });

  it("returns ISO date format (YYYY-MM-DD)", () => {
    const result = getDateRange(7);
    expect(result.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getDateTimeRange", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns ISO datetime strings", () => {
    const result = getDateTimeRange(7);
    expect(result.start_datetime).toBe("2024-06-08T12:00:00.000Z");
    expect(result.end_datetime).toBe("2024-06-15T12:00:00.000Z");
  });

  it("returns correct range for 1 day", () => {
    const result = getDateTimeRange(1);
    expect(result.start_datetime).toBe("2024-06-14T12:00:00.000Z");
    expect(result.end_datetime).toBe("2024-06-15T12:00:00.000Z");
  });

  it("returns valid ISO strings", () => {
    const result = getDateTimeRange(30);
    expect(new Date(result.start_datetime).toISOString()).toBe(result.start_datetime);
    expect(new Date(result.end_datetime).toISOString()).toBe(result.end_datetime);
  });
});

describe("fetchOuraData", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls Oura API with correct URL and auth header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await fetchOuraData("daily_sleep", "test-token", {
      start_date: "2024-06-01",
      end_date: "2024-06-15",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("api.ouraring.com/v2/usercollection/daily_sleep");
    expect(url).toContain("start_date=2024-06-01");
    expect(url).toContain("end_date=2024-06-15");
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    await expect(fetchOuraData("daily_sleep", "bad-token")).rejects.toThrow(
      "Oura API error (401)"
    );
  });

  it("returns parsed JSON on success", async () => {
    const mockData = { data: [{ day: "2024-06-15", score: 85 }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchOuraData("daily_sleep", "test-token");
    expect(result).toEqual(mockData);
  });

  it("works without params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await fetchOuraData("daily_sleep", "test-token");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://api.ouraring.com/v2/usercollection/daily_sleep"
    );
  });

  it("sets cache to no-store", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await fetchOuraData("daily_sleep", "test-token");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.cache).toBe("no-store");
  });
});
