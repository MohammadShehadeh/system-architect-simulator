"use client";

import { useEffect, useRef } from "react";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";
import type { MainToWorker, WorkerToMain } from "./messages";

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);

  const status = useSimulationStore((s) => s.status);
  const config = useSimulationStore((s) => s.config);
  const setMetrics = useSimulationStore((s) => s.setMetrics);
  const setStatus = useSimulationStore((s) => s.setStatus);

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

    return () => {
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
    if (status === "running") {
      const { nodes, edges } = useArchitectureStore.getState();
      const { config: currentConfig } = useSimulationStore.getState();
      const initMsg: MainToWorker = {
        type: "INIT",
        nodes,
        edges,
        config: currentConfig,
      };
      const startMsg: MainToWorker = { type: "START" };
      worker.postMessage(initMsg);
      worker.postMessage(startMsg);
    } else {
      const stopMsg: MainToWorker = { type: "STOP" };
      worker.postMessage(stopMsg);
    }
  }, [status]);
}
