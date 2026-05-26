"use client";

import { useEffect, useRef, useState } from "react";
import { SimulationEngine } from "@/lib/simulation/engine";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";

const TICK_INTERVAL_MS = 100;

export function useSimulation() {
  const [engine] = useState(() => new SimulationEngine());
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const status = useSimulationStore((s) => s.status);
  const config = useSimulationStore((s) => s.config);
  const setMetrics = useSimulationStore((s) => s.setMetrics);
  const setStatus = useSimulationStore((s) => s.setStatus);

  useEffect(() => {
    engine.setConfig(config);
  }, [engine, config]);

  useEffect(() => {
    if (status !== "running") {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const { nodes, edges } = useArchitectureStore.getState();
    engine.setArchitecture(nodes, edges);
    engine.reset();

    const loop = (t: number) => {
      if (t - lastTickRef.current >= TICK_INTERVAL_MS) {
        lastTickRef.current = t;
        const metrics = engine.tick();
        setMetrics(metrics);
        if (metrics.uptime >= config.durationMs) {
          setStatus("completed");
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [engine, status, config.durationMs, setMetrics, setStatus]);
}
