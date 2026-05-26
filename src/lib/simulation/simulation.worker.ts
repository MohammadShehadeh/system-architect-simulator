/// <reference lib="webworker" />

import { SimulationEngine } from "./engine";
import type { MainToWorker, WorkerToMain } from "./messages";

declare const self: DedicatedWorkerGlobalScope;

const TICK_INTERVAL_MS = 100;

const engine = new SimulationEngine();
let intervalId: ReturnType<typeof setInterval> | null = null;
let durationMs = 60_000;

const post = (msg: WorkerToMain) => self.postMessage(msg);

const stopLoop = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

self.addEventListener("message", (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "INIT": {
      engine.setArchitecture(msg.nodes, msg.edges);
      engine.setConfig(msg.config);
      durationMs = msg.config.durationMs;
      break;
    }
    case "SET_CONFIG": {
      engine.setConfig(msg.config);
      if (msg.config.durationMs !== undefined) {
        durationMs = msg.config.durationMs;
      }
      break;
    }
    case "UPDATE_ARCHITECTURE": {
      engine.updateArchitecture(msg.nodes, msg.edges);
      break;
    }
    case "START": {
      stopLoop();
      engine.reset();
      intervalId = setInterval(() => {
        const metrics = engine.tick();
        if (metrics.uptime >= durationMs) {
          stopLoop();
          post({ type: "COMPLETED", metrics });
        } else {
          post({ type: "METRICS", metrics });
        }
      }, TICK_INTERVAL_MS);
      break;
    }
    case "STOP": {
      stopLoop();
      break;
    }
  }
});
