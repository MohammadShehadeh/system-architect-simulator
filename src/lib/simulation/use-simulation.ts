"use client";

import { useEffect, useRef } from "react";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";
import type { SimulationStatus } from "@/lib/architecture/types";
import type { ArchEdge, ArchNode } from "./engine";
import type { MainToWorker, WorkerToMain } from "./messages";

// React Flow's applyNodeChanges only mutates position/selection/dimensions —
// never `data` — so a `data` reference change implies a real config/topology
// edit that the simulation engine needs to see. This filter keeps us from
// re-serialising the entire graph across the worker boundary on every drag.
function archChanged(
  prevNodes: ArchNode[],
  nextNodes: ArchNode[],
  prevEdges: ArchEdge[],
  nextEdges: ArchEdge[]
): boolean {
  if (prevNodes.length !== nextNodes.length) return true;
  if (prevEdges.length !== nextEdges.length) return true;

  const prevNodeMap = new Map(prevNodes.map((n) => [n.id, n]));
  for (const n of nextNodes) {
    const p = prevNodeMap.get(n.id);
    if (!p || p.data !== n.data) return true;
  }

  const prevEdgeMap = new Map(prevEdges.map((e) => [e.id, e]));
  for (const e of nextEdges) {
    const p = prevEdgeMap.get(e.id);
    if (!p || p.source !== e.source || p.target !== e.target) return true;
  }

  return false;
}

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const prevStatusRef = useRef<SimulationStatus>("idle");

  const status = useSimulationStore((s) => s.status);
  const config = useSimulationStore((s) => s.config);
  const setMetrics = useSimulationStore((s) => s.setMetrics);
  const setStatus = useSimulationStore((s) => s.setStatus);

  // Worker lifecycle: creation, message listener, and the architecture-store
  // subscription all share a single cleanup so nothing can outlive the worker.
  useEffect(() => {
    const worker = new Worker(
      new URL("./simulation.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    const onMessage = (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      if (msg.type === "METRICS") {
        setMetrics(msg.metrics);
      } else if (msg.type === "COMPLETED") {
        setMetrics(msg.metrics);
        setStatus("completed");
      }
    };
    worker.addEventListener("message", onMessage);

    const unsubscribe = useArchitectureStore.subscribe((state, prev) => {
      if (!archChanged(prev.nodes, state.nodes, prev.edges, state.edges)) {
        return;
      }
      worker.postMessage({
        type: "UPDATE_ARCHITECTURE",
        nodes: state.nodes,
        edges: state.edges,
      } satisfies MainToWorker);
    });

    return () => {
      unsubscribe();
      worker.removeEventListener("message", onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [setMetrics, setStatus]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const msg: MainToWorker = { type: "SET_CONFIG", config };
    worker.postMessage(msg);
  }, [config]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "running") {
      if (prev === "paused") {
        const { nodes, edges } = useArchitectureStore.getState();
        worker.postMessage({
          type: "UPDATE_ARCHITECTURE",
          nodes,
          edges,
        } satisfies MainToWorker);
        worker.postMessage({ type: "RESUME" } satisfies MainToWorker);
      } else {
        const { nodes, edges } = useArchitectureStore.getState();
        const { config: currentConfig } = useSimulationStore.getState();
        worker.postMessage({
          type: "INIT",
          nodes,
          edges,
          config: currentConfig,
        } satisfies MainToWorker);
        worker.postMessage({ type: "START" } satisfies MainToWorker);
      }
    } else if (status === "paused") {
      worker.postMessage({ type: "PAUSE" } satisfies MainToWorker);
    } else {
      worker.postMessage({ type: "STOP" } satisfies MainToWorker);
    }
  }, [status]);
}
