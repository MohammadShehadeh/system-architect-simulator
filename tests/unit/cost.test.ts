import { describe, expect, it } from "vitest";

import {
  costPerMillionRequests,
  hourlyCost,
  monthlyCost,
} from "@/lib/architecture/cost";
import { DEFAULT_CONFIGS } from "@/lib/architecture/types";
import type {
  ApiServerConfig,
  NoSQLConfig,
  ObjectStorageConfig,
  PostgresConfig,
  RedisConfig,
} from "@/lib/architecture/types";

describe("hourlyCost", () => {
  it("returns 0 for a client", () => {
    expect(hourlyCost("client", DEFAULT_CONFIGS.client)).toBe(0);
  });

  it("scales api-server cost with instance count", () => {
    const single = hourlyCost("api-server", {
      ...DEFAULT_CONFIGS["api-server"],
      instances: 1,
    } as ApiServerConfig);
    const triple = hourlyCost("api-server", {
      ...DEFAULT_CONFIGS["api-server"],
      instances: 3,
    } as ApiServerConfig);
    expect(triple).toBeCloseTo(single * 3, 6);
  });

  it("increases postgres cost when adding replicas", () => {
    const base = hourlyCost("postgres", {
      ...DEFAULT_CONFIGS.postgres,
      replicaCount: 0,
    } as PostgresConfig);
    const withReplicas = hourlyCost("postgres", {
      ...DEFAULT_CONFIGS.postgres,
      replicaCount: 2,
    } as PostgresConfig);
    expect(withReplicas).toBeGreaterThan(base);
  });

  it("redis with more memory costs more than with less", () => {
    const small = hourlyCost("redis", {
      ...DEFAULT_CONFIGS.redis,
      maxMemoryMB: 512,
    } as RedisConfig);
    const large = hourlyCost("redis", {
      ...DEFAULT_CONFIGS.redis,
      maxMemoryMB: 8192,
    } as RedisConfig);
    expect(large).toBeGreaterThan(small);
  });

  it("doubles object-storage cost in multi-region", () => {
    const single = hourlyCost("object-storage", {
      ...DEFAULT_CONFIGS["object-storage"],
      multiRegion: false,
    } as ObjectStorageConfig);
    const multi = hourlyCost("object-storage", {
      ...DEFAULT_CONFIGS["object-storage"],
      multiRegion: true,
    } as ObjectStorageConfig);
    expect(multi).toBeCloseTo(single * 2, 6);
  });

  it("scales nosql cost linearly with provisioned capacity", () => {
    const base = hourlyCost("nosql", {
      ...DEFAULT_CONFIGS.nosql,
      readCapacity: 1000,
      writeCapacity: 1000,
    } as NoSQLConfig);
    const doubled = hourlyCost("nosql", {
      ...DEFAULT_CONFIGS.nosql,
      readCapacity: 2000,
      writeCapacity: 2000,
    } as NoSQLConfig);
    expect(doubled).toBeCloseTo(base * 2, 6);
  });

  it("returns non-negative values for every default config", () => {
    for (const [type, cfg] of Object.entries(DEFAULT_CONFIGS)) {
      const c = hourlyCost(
        type as Parameters<typeof hourlyCost>[0],
        cfg as Parameters<typeof hourlyCost>[1]
      );
      expect(c, `hourlyCost(${type})`).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(c), `hourlyCost(${type}) finite`).toBe(true);
    }
  });
});

describe("costPerMillionRequests", () => {
  it("charges more for strong-consistency NoSQL reads", () => {
    const eventual = costPerMillionRequests("nosql", {
      ...DEFAULT_CONFIGS.nosql,
      consistency: "eventual",
    } as NoSQLConfig);
    const strong = costPerMillionRequests("nosql", {
      ...DEFAULT_CONFIGS.nosql,
      consistency: "strong",
    } as NoSQLConfig);
    expect(strong).toBeGreaterThan(eventual);
  });

  it("returns 0 for components without per-request pricing", () => {
    expect(costPerMillionRequests("client", DEFAULT_CONFIGS.client)).toBe(0);
    expect(costPerMillionRequests("postgres", DEFAULT_CONFIGS.postgres)).toBe(0);
  });
});

describe("monthlyCost", () => {
  it("is exactly 730x hourly cost", () => {
    const hourly = hourlyCost("api-server", DEFAULT_CONFIGS["api-server"]);
    const monthly = monthlyCost("api-server", DEFAULT_CONFIGS["api-server"]);
    expect(monthly).toBeCloseTo(hourly * 730, 6);
  });
});
