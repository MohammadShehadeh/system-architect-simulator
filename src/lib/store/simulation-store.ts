"use client";

import { create } from "zustand";
import type {
  SimulationMetrics,
  SimulationStatus,
} from "@/lib/architecture/types";
import type { SimulationConfig } from "@/lib/simulation/engine";

interface SimulationState {
  status: SimulationStatus;
  metrics: SimulationMetrics | null;
  config: SimulationConfig;

  setStatus: (status: SimulationStatus) => void;
  setMetrics: (metrics: SimulationMetrics) => void;
  setConfig: (config: Partial<SimulationConfig>) => void;
  reset: () => void;
}

const initialMetrics = (): SimulationMetrics => ({
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  avgLatencyMs: 0,
  p50LatencyMs: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
  successRate: 1,
  errorRate: 0,
  currentRps: 0,
  uptime: 0,
  estimatedMonthlyCost: 0,
  estimatedMaxRps: 0,
  perComponent: {},
  history: [],
});

export const useSimulationStore = create<SimulationState>((set) => ({
  status: "idle",
  metrics: initialMetrics(),
  config: {
    trafficMultiplier: 1,
    pattern: "constant",
    durationMs: 60_000,
    networkHopMs: 1,
  },

  setStatus: (status) => set({ status }),
  setMetrics: (metrics) => set({ metrics }),
  setConfig: (cfg) =>
    set((s) => ({ config: { ...s.config, ...cfg } })),
  reset: () =>
    set({
      status: "idle",
      metrics: initialMetrics(),
    }),
}));
