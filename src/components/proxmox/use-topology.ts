"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ProxmoxErrorPayload } from "@/lib/proxmox/errors";
import type { Topology } from "@/lib/proxmox/types";
import { useProxmoxStore } from "@/lib/store/proxmox-store";

function isErrorPayload(value: unknown): value is ProxmoxErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value
  );
}

async function fetchTopology(signal: AbortSignal): Promise<Topology> {
  const res = await fetch("/api/proxmox/topology", {
    signal,
    cache: "no-store",
  });
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok || (body && typeof body === "object" && "error" in body)) {
    const error = (body as { error?: unknown })?.error;
    if (isErrorPayload(error)) throw error;
    throw {
      kind: "network",
      message: `Request failed (${res.status}).`,
    } satisfies ProxmoxErrorPayload;
  }
  return body as Topology;
}

/**
 * Drives live topology polling into the store.
 *
 * - Fetches immediately, then on `pollIntervalMs` (0 = off).
 * - Pauses while the tab is hidden; refreshes on focus.
 * - Aborts the in-flight request before starting a new one.
 * - Keeps the last-good topology on error (only the banner reflects failures).
 */
export function useTopologyPolling() {
  const pollIntervalMs = useProxmoxStore((s) => s.pollIntervalMs);
  const beginLoad = useProxmoxStore((s) => s.beginLoad);
  const setTopology = useProxmoxStore((s) => s.setTopology);
  const setError = useProxmoxStore((s) => s.setError);

  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    beginLoad();
    try {
      const topology = await fetchTopology(controller.signal);
      if (!controller.signal.aborted) setTopology(topology);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        isErrorPayload(err)
          ? err
          : { kind: "network", message: "Request failed." }
      );
    }
  }, [beginLoad, setTopology, setError]);

  useEffect(() => {
    void refresh();

    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    let timer: ReturnType<typeof setInterval> | null = null;
    if (pollIntervalMs > 0) {
      timer = setInterval(() => {
        if (!document.hidden) void refresh();
      }, pollIntervalMs);
    }

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      inFlight.current?.abort();
    };
  }, [pollIntervalMs, refresh]);

  return { refresh };
}
