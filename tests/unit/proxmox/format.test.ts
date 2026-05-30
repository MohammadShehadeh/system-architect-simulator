import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatFraction,
  formatUptime,
  toBarPercent,
} from "@/lib/proxmox/format";

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 ** 3)).toBe("1 GB");
  });
  it("handles missing values", () => {
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(null)).toBe("—");
  });
});

describe("formatUptime", () => {
  it("formats days/hours/minutes", () => {
    expect(formatUptime(90)).toBe("1m");
    expect(formatUptime(3661)).toBe("1h 1m");
    expect(formatUptime(90000)).toBe("1d 1h");
  });
  it("handles zero/missing", () => {
    expect(formatUptime(0)).toBe("—");
    expect(formatUptime(undefined)).toBe("—");
  });
});

describe("formatFraction", () => {
  it("renders a percentage", () => {
    expect(formatFraction(0.123)).toBe("12%");
    expect(formatFraction(0.05)).toBe("5.0%");
    expect(formatFraction(undefined)).toBe("—");
  });
});

describe("toBarPercent", () => {
  it("clamps to 0..100", () => {
    expect(toBarPercent(0.5)).toBe(50);
    expect(toBarPercent(2)).toBe(100);
    expect(toBarPercent(-1)).toBe(0);
    expect(toBarPercent(undefined)).toBe(0);
  });
});
