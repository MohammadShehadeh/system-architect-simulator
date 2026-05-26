import type { SimulationMetrics } from "@/lib/architecture/types";
import type { ArchEdge, ArchNode, SimulationConfig } from "./engine";

export type MainToWorker =
  | {
      type: "INIT";
      nodes: ArchNode[];
      edges: ArchEdge[];
      config: SimulationConfig;
    }
  | { type: "SET_CONFIG"; config: Partial<SimulationConfig> }
  | { type: "START" }
  | { type: "STOP" };

export type WorkerToMain =
  | { type: "METRICS"; metrics: SimulationMetrics }
  | { type: "COMPLETED"; metrics: SimulationMetrics };
