import { describe, expect, it } from "vitest";

import {
  clamp,
  cn,
  formatLatency,
  formatNumber,
  formatPercent,
  uid,
} from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes via tailwind-merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatNumber", () => {
  it("formats raw counts under 1k with no suffix", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("uses k suffix between 1k and 1M", () => {
    expect(formatNumber(1_000)).toBe("1.0k");
    expect(formatNumber(12_345)).toBe("12.3k");
    expect(formatNumber(999_900)).toBe("999.9k");
  });

  it("uses M suffix at and above 1M", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

describe("formatLatency", () => {
  it("uses ms below 1000", () => {
    expect(formatLatency(0)).toBe("0ms");
    expect(formatLatency(15.4)).toBe("15ms");
    expect(formatLatency(999)).toBe("999ms");
  });

  it("uses s suffix at and above 1000ms", () => {
    expect(formatLatency(1000)).toBe("1.00s");
    expect(formatLatency(1500)).toBe("1.50s");
    expect(formatLatency(12_345)).toBe("12.35s");
  });
});

describe("formatPercent", () => {
  it("renders a fraction as a one-decimal percent", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(0.5)).toBe("50.0%");
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatPercent(1)).toBe("100.0%");
  });
});

describe("clamp", () => {
  it("returns the value when within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below min and above max", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("respects bounds at the edges", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("uid", () => {
  it("uses the given prefix", () => {
    expect(uid("node")).toMatch(/^node_/);
  });

  it("defaults to 'id' prefix", () => {
    expect(uid()).toMatch(/^id_/);
  });

  it("produces unique values across calls", () => {
    const ids = new Set(Array.from({ length: 200 }, () => uid("x")));
    expect(ids.size).toBe(200);
  });
});
