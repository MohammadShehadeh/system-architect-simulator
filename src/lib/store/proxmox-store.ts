"use client";

import { create } from "zustand";

import type { ProxmoxErrorPayload } from "@/lib/proxmox/errors";
import {
  DEFAULT_FILTERS,
  type Topology,
  type TopologyFilters,
} from "@/lib/proxmox/types";

export type ProxmoxStatus = "idle" | "loading" | "ok" | "error";

export interface ProxmoxState {
  topology: Topology | null;
  status: ProxmoxStatus;
  error: ProxmoxErrorPayload | null;
  lastUpdated: number | null;
  selectedId: string | null;
  /** Poll cadence in ms; 0 disables polling. */
  pollIntervalMs: number;
  filters: TopologyFilters;

  beginLoad: () => void;
  setTopology: (topology: Topology) => void;
  setError: (error: ProxmoxErrorPayload) => void;
  setSelected: (id: string | null) => void;
  setPollInterval: (ms: number) => void;
  setFilters: (patch: Partial<TopologyFilters>) => void;
}

export const useProxmoxStore = create<ProxmoxState>()((set) => ({
  topology: null,
  status: "idle",
  error: null,
  lastUpdated: null,
  selectedId: null,
  pollIntervalMs: 5000,
  filters: { ...DEFAULT_FILTERS },

  // Only show a blocking spinner on the very first load; later polls refresh
  // in place so the diagram never flashes.
  beginLoad: () =>
    set((s) => (s.status === "idle" ? { status: "loading" } : {})),

  setTopology: (topology) =>
    set({ topology, status: "ok", error: null, lastUpdated: Date.now() }),

  // Keep the last-good topology on transient errors; the banner shows the error.
  setError: (error) => set({ status: "error", error }),

  setSelected: (selectedId) => set({ selectedId }),
  setPollInterval: (pollIntervalMs) => set({ pollIntervalMs }),
  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),
}));
