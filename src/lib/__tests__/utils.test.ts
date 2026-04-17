import {
  cn,
  formatDuration,
  formatHoursMinutes,
  getScoreColor,
  getScoreBg,
  getScoreGradient,
  getScoreLabel,
  formatDate,
  formatFullDate,
  average,
  trend,
} from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});

describe("formatDuration", () => {
  it("formats seconds into hours and minutes", () => {
    expect(formatDuration(3661)).toBe("1h 1m");
  });

  it("formats less than an hour as minutes only", () => {
    expect(formatDuration(300)).toBe("5m");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("handles exact hours", () => {
    expect(formatDuration(7200)).toBe("2h 0m");
  });

  it("handles large values", () => {
    expect(formatDuration(28800)).toBe("8h 0m");
  });
});

describe("formatHoursMinutes", () => {
  it("formats as H:MM", () => {
    expect(formatHoursMinutes(3661)).toBe("1:01");
  });

  it("pads minutes with leading zero", () => {
    expect(formatHoursMinutes(3600)).toBe("1:00");
  });

  it("handles zero", () => {
    expect(formatHoursMinutes(0)).toBe("0:00");
  });

  it("handles less than an hour", () => {
    expect(formatHoursMinutes(540)).toBe("0:09");
  });
});

describe("getScoreColor", () => {
  it("returns emerald for scores >= 85", () => {
    expect(getScoreColor(85)).toBe("text-emerald-500");
    expect(getScoreColor(100)).toBe("text-emerald-500");
  });

  it("returns amber for scores 70-84", () => {
    expect(getScoreColor(70)).toBe("text-amber-500");
    expect(getScoreColor(84)).toBe("text-amber-500");
  });

  it("returns rose for scores < 70", () => {
    expect(getScoreColor(69)).toBe("text-rose-500");
    expect(getScoreColor(0)).toBe("text-rose-500");
  });
});

describe("getScoreBg", () => {
  it("returns emerald for scores >= 85", () => {
    expect(getScoreBg(85)).toBe("bg-emerald-500");
  });

  it("returns amber for scores 70-84", () => {
    expect(getScoreBg(70)).toBe("bg-amber-500");
  });

  it("returns rose for scores < 70", () => {
    expect(getScoreBg(50)).toBe("bg-rose-500");
  });
});

describe("getScoreGradient", () => {
  it("returns emerald gradient for scores >= 85", () => {
    expect(getScoreGradient(90)).toBe("from-emerald-500 to-emerald-400");
  });

  it("returns amber gradient for scores 70-84", () => {
    expect(getScoreGradient(75)).toBe("from-amber-500 to-amber-400");
  });

  it("returns rose gradient for scores < 70", () => {
    expect(getScoreGradient(40)).toBe("from-rose-500 to-rose-400");
  });
});

describe("getScoreLabel", () => {
  it("returns 'Optimal' for scores >= 85", () => {
    expect(getScoreLabel(85)).toBe("Optimal");
    expect(getScoreLabel(100)).toBe("Optimal");
  });

  it("returns 'Good' for scores 70-84", () => {
    expect(getScoreLabel(70)).toBe("Good");
    expect(getScoreLabel(84)).toBe("Good");
  });

  it("returns 'Fair' for scores 60-69", () => {
    expect(getScoreLabel(60)).toBe("Fair");
    expect(getScoreLabel(69)).toBe("Fair");
  });

  it("returns 'Pay attention' for scores < 60", () => {
    expect(getScoreLabel(59)).toBe("Pay attention");
    expect(getScoreLabel(0)).toBe("Pay attention");
  });
});

describe("formatDate", () => {
  it("formats YYYY-MM-DD to short date", () => {
    const result = formatDate("2024-01-15");
    expect(result).toBe("15 Jan");
  });

  it("formats another date correctly", () => {
    const result = formatDate("2024-12-25");
    expect(result).toBe("25 Dec");
  });
});

describe("formatFullDate", () => {
  it("includes weekday, month, day, and year", () => {
    const result = formatFullDate("2024-01-15");
    // Mon, Jan 15, 2024
    expect(result).toMatch(/Mon/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });
});

describe("average", () => {
  it("calculates average of positive numbers", () => {
    expect(average([10, 20, 30])).toBe(20);
  });

  it("filters out zero values", () => {
    expect(average([0, 10, 20, 0])).toBe(15);
  });

  it("returns 0 for empty array", () => {
    expect(average([])).toBe(0);
  });

  it("returns 0 for all zeros", () => {
    expect(average([0, 0, 0])).toBe(0);
  });

  it("rounds the result", () => {
    expect(average([10, 11])).toBe(11); // 10.5 rounds to 11
  });

  it("handles single element", () => {
    expect(average([42])).toBe(42);
  });
});

describe("trend", () => {
  it("returns 'up' when second half is higher", () => {
    expect(trend([60, 65, 70, 80, 85, 90])).toBe("up");
  });

  it("returns 'down' when second half is lower", () => {
    expect(trend([90, 85, 80, 60, 55, 50])).toBe("down");
  });

  it("returns 'stable' when difference is small", () => {
    expect(trend([80, 81, 80, 81])).toBe("stable");
  });

  it("returns 'stable' for single element", () => {
    expect(trend([50])).toBe("stable");
  });

  it("returns 'stable' for empty array", () => {
    expect(trend([])).toBe("stable");
  });

  it("handles two elements", () => {
    expect(trend([50, 90])).toBe("up");
  });
});
