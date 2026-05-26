import type { Edge, Node } from "@xyflow/react";
import type {
  ApiServerConfig,
  CDNConfig,
  ClientConfig,
  ComponentMetrics,
  ComponentNodeData,
  ComponentType,
  LoadBalancerConfig,
  PostgresConfig,
  RedisConfig,
  SimulationMetrics,
} from "@/lib/architecture/types";

export type ArchNode = Node<ComponentNodeData>;
export type ArchEdge = Edge;

interface ComponentState {
  type: ComponentType;
  currentRps: number;
  totalRequests: number;
  failedRequests: number;
  latencySamples: number[];
  cpuUtilization: number;
  memoryUtilization: number;
  status: ComponentMetrics["status"];
  connectionPoolUse?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

const createState = (type: ComponentType): ComponentState => ({
  type,
  currentRps: 0,
  totalRequests: 0,
  failedRequests: 0,
  latencySamples: [],
  cpuUtilization: 0,
  memoryUtilization: 0,
  status: "healthy",
});

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

interface SimRequest {
  type: "read" | "write";
  latency: number;
  path: string[];
  failed: boolean;
  failReason?: string;
}

function findEntryPoints(nodes: ArchNode[], edges: ArchEdge[]): ArchNode[] {
  const targetIds = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !targetIds.has(n.id) || n.data.type === "client");
}

function getOutgoingEdges(nodeId: string, edges: ArchEdge[]): ArchEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

function simulateApiServer(
  config: ApiServerConfig,
  state: ComponentState,
  rps: number
) {
  const totalCapacity = config.instances * config.maxConcurrentRequests;
  const utilization = rps / Math.max(totalCapacity, 1);
  state.cpuUtilization = Math.min(1, utilization);
  state.memoryUtilization = Math.min(1, utilization * 0.85);

  let latency = config.baseLatencyMs;
  let errorRate = 0;

  if (utilization > 1.5) {
    latency *= 8;
    errorRate = 0.4;
    state.status = "failed";
  } else if (utilization > 1) {
    latency *= 4;
    errorRate = 0.15;
    state.status = "overloaded";
  } else if (utilization > 0.8) {
    latency *= 1.8;
    errorRate = 0.02;
    state.status = "degraded";
  } else {
    state.status = "healthy";
  }
  return { latency: latency + random(-2, 4), errorRate };
}

function simulateLoadBalancer(
  config: LoadBalancerConfig,
  state: ComponentState,
  rps: number
) {
  const utilization = rps / Math.max(config.maxRps, 1);
  state.cpuUtilization = Math.min(1, utilization);
  let latency = 1;
  let errorRate = 0;
  if (utilization > 1) {
    latency = 10;
    errorRate = 0.1;
    state.status = "overloaded";
  } else if (utilization > 0.85) {
    latency = 4;
    errorRate = 0.01;
    state.status = "degraded";
  } else {
    state.status = "healthy";
  }
  return { latency: latency + random(0, 1), errorRate };
}

function simulateRedis(
  config: RedisConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  const memUse = Math.min(1, rps / 50000 + 0.2);
  state.memoryUtilization = memUse;
  state.cpuUtilization = Math.min(1, rps / 80000);
  const latency = 1 + random(0, 2);
  let errorRate = 0.001;
  if (memUse > 0.95) {
    errorRate = 0.05;
    state.status = "degraded";
  } else {
    state.status = "healthy";
  }
  const isHit = isRead && Math.random() < config.hitRate;
  return { latency, errorRate, isHit };
}

function simulatePostgres(
  config: PostgresConfig,
  state: ComponentState,
  rps: number
) {
  const connectionsNeeded = Math.ceil(rps / 50);
  const poolUtilization = connectionsNeeded / config.maxConnections;
  const iopsUse = (rps * 2) / config.diskIOPS;
  state.cpuUtilization = Math.min(1, Math.max(poolUtilization, iopsUse));
  state.memoryUtilization = Math.min(1, poolUtilization * 0.7);
  state.connectionPoolUse = Math.min(1, poolUtilization);

  let latency = config.baseLatencyMs;
  let errorRate = 0.001;

  if (poolUtilization > 1.2) {
    latency *= 10;
    errorRate = 0.5;
    state.status = "failed";
  } else if (poolUtilization > 1) {
    latency *= 4;
    errorRate = 0.2;
    state.status = "overloaded";
  } else if (poolUtilization > 0.8 || iopsUse > 0.8) {
    latency *= 2;
    errorRate = 0.03;
    state.status = "degraded";
  } else {
    state.status = "healthy";
  }
  return { latency: latency + random(0, 3), errorRate };
}

function simulateCDN(
  config: CDNConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  state.cpuUtilization = Math.min(1, rps / 100000);
  state.status = "healthy";
  const isHit = config.cacheEnabled && isRead && Math.random() < config.hitRate;
  return { latency: 5 + random(0, 3), errorRate: 0.0005, isHit };
}

function routeRequest(
  request: SimRequest,
  currentId: string,
  nodes: ArchNode[],
  edges: ArchEdge[],
  states: Map<string, ComponentState>,
  depth = 0
): SimRequest {
  if (depth > 20) {
    request.failed = true;
    request.failReason = "Cycle/depth limit";
    return request;
  }

  const node = nodes.find((n) => n.id === currentId);
  if (!node) {
    request.failed = true;
    request.failReason = "Node missing";
    return request;
  }

  request.path.push(currentId);
  const state = states.get(currentId)!;
  state.totalRequests++;
  state.currentRps++;

  const cfg = node.data.config;
  const type = node.data.type;
  let isHit = false;
  let latency = 0;
  let errorRate = 0;

  switch (type) {
    case "client": {
      latency = 0;
      break;
    }
    case "cdn": {
      const r = simulateCDN(
        cfg as CDNConfig,
        state,
        state.currentRps,
        request.type === "read"
      );
      latency = r.latency;
      errorRate = r.errorRate;
      isHit = r.isHit;
      break;
    }
    case "load-balancer": {
      const r = simulateLoadBalancer(
        cfg as LoadBalancerConfig,
        state,
        state.currentRps
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "api-server": {
      const r = simulateApiServer(
        cfg as ApiServerConfig,
        state,
        state.currentRps
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "redis": {
      const r = simulateRedis(
        cfg as RedisConfig,
        state,
        state.currentRps,
        request.type === "read"
      );
      latency = r.latency;
      errorRate = r.errorRate;
      isHit = r.isHit;
      if (isHit) state.cacheHits = (state.cacheHits ?? 0) + 1;
      else state.cacheMisses = (state.cacheMisses ?? 0) + 1;
      break;
    }
    case "postgres": {
      const r = simulatePostgres(
        cfg as PostgresConfig,
        state,
        state.currentRps
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "queue": {
      latency = 2;
      errorRate = 0.001;
      state.status = "healthy";
      break;
    }
  }

  request.latency += latency;

  if (Math.random() < errorRate) {
    request.failed = true;
    request.failReason = `${type} error`;
    state.failedRequests++;
    return request;
  }

  if (request.latency > 30000) {
    request.failed = true;
    request.failReason = "timeout";
    state.failedRequests++;
    return request;
  }

  if (isHit) {
    return request;
  }

  const outgoing = getOutgoingEdges(currentId, edges);
  if (outgoing.length === 0) {
    return request;
  }

  if (type === "load-balancer") {
    const idx = state.totalRequests % outgoing.length;
    const next = outgoing[idx];
    request.latency += 1;
    return routeRequest(request, next.target, nodes, edges, states, depth + 1);
  }

  if (type === "api-server") {
    const cacheEdge = outgoing.find((e) => {
      const t = nodes.find((n) => n.id === e.target);
      return t?.data.type === "redis";
    });
    if (cacheEdge) {
      routeRequest(
        { ...request, path: [...request.path] },
        cacheEdge.target,
        nodes,
        edges,
        states,
        depth + 1
      );
      const dbEdge = outgoing.find((e) => {
        const t = nodes.find((n) => n.id === e.target);
        return t?.data.type === "postgres";
      });
      if (dbEdge) {
        const cacheNode = nodes.find((n) => n.id === cacheEdge.target);
        const cacheHit =
          cacheNode &&
          Math.random() < (cacheNode.data.config as RedisConfig).hitRate;
        if (!cacheHit) {
          return routeRequest(
            request,
            dbEdge.target,
            nodes,
            edges,
            states,
            depth + 1
          );
        }
        return request;
      }
      return request;
    }
  }

  const next = outgoing[0];
  request.latency += 1;
  return routeRequest(request, next.target, nodes, edges, states, depth + 1);
}

export interface SimulationConfig {
  trafficMultiplier: number;
  pattern: "constant" | "ramp" | "spike" | "wave";
  durationMs: number;
}

export class SimulationEngine {
  private nodes: ArchNode[] = [];
  private edges: ArchEdge[] = [];
  private states: Map<string, ComponentState> = new Map();
  private tickCount = 0;
  private startedAt = 0;
  private history: SimulationMetrics["history"] = [];
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private latencyBuffer: number[] = [];
  private config: SimulationConfig = {
    trafficMultiplier: 1,
    pattern: "constant",
    durationMs: 60_000,
  };

  setArchitecture(nodes: ArchNode[], edges: ArchEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.states = new Map(
      nodes.map((n) => [n.id, createState(n.data.type)])
    );
  }

  setConfig(cfg: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  reset() {
    this.tickCount = 0;
    this.startedAt = Date.now();
    this.history = [];
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.latencyBuffer = [];
    this.states = new Map(
      this.nodes.map((n) => [n.id, createState(n.data.type)])
    );
  }

  private trafficFactor(elapsed: number): number {
    const t = Math.min(1, elapsed / this.config.durationMs);
    switch (this.config.pattern) {
      case "constant":
        return 1;
      case "ramp":
        return 0.1 + t * 1.9;
      case "spike":
        return t > 0.5 ? 5 : 1;
      case "wave":
        return 1 + 0.8 * Math.sin(t * Math.PI * 4);
      default:
        return 1;
    }
  }

  tick(): SimulationMetrics {
    this.tickCount++;
    const elapsed = Date.now() - this.startedAt;
    const factor = this.trafficFactor(elapsed) * this.config.trafficMultiplier;

    for (const state of this.states.values()) {
      state.currentRps = 0;
      state.latencySamples = [];
    }

    const entries = findEntryPoints(this.nodes, this.edges);
    const clients = entries.filter((n) => n.data.type === "client");
    const baseClients =
      clients.length > 0 ? clients : entries.length > 0 ? [entries[0]] : [];

    const totalRpsBase = baseClients.reduce((sum, c) => {
      if (c.data.type === "client") {
        return sum + (c.data.config as ClientConfig).rps;
      }
      return sum + 50;
    }, 0);

    const requestsThisTick = Math.max(
      0,
      Math.round((totalRpsBase * factor) / 10)
    );

    let tickSuccesses = 0;
    const tickLatencies: number[] = [];

    for (let i = 0; i < requestsThisTick; i++) {
      const client = baseClients[i % baseClients.length];
      if (!client) break;
      const cfg = client.data.config as ClientConfig;
      const isRead =
        client.data.type === "client" ? Math.random() < cfg.readRatio : true;
      const req: SimRequest = {
        type: isRead ? "read" : "write",
        latency: 0,
        path: [],
        failed: false,
      };
      const result = routeRequest(req, client.id, this.nodes, this.edges, this.states);
      this.totalRequests++;
      if (result.failed) {
        this.failedRequests++;
      } else {
        this.successfulRequests++;
        tickSuccesses++;
        tickLatencies.push(result.latency);
        this.latencyBuffer.push(result.latency);
        if (this.latencyBuffer.length > 5000) this.latencyBuffer.shift();
      }
    }

    const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
    const avgLatency =
      tickLatencies.length === 0
        ? 0
        : tickLatencies.reduce((a, b) => a + b, 0) / tickLatencies.length;
    const successRate =
      requestsThisTick === 0 ? 1 : tickSuccesses / requestsThisTick;

    this.history.push({
      t: elapsed,
      rps: requestsThisTick * 10,
      successRate,
      avgLatency,
    });
    if (this.history.length > 120) this.history.shift();

    const perComponent: Record<string, ComponentMetrics> = {};
    for (const [id, state] of this.states.entries()) {
      const samplesSorted = [...state.latencySamples].sort((a, b) => a - b);
      perComponent[id] = {
        rps: state.currentRps * 10,
        p50Latency: percentile(samplesSorted, 0.5),
        p99Latency: percentile(samplesSorted, 0.99),
        errorRate:
          state.totalRequests > 0
            ? state.failedRequests / state.totalRequests
            : 0,
        cpuUtilization: state.cpuUtilization,
        memoryUtilization: state.memoryUtilization,
        status: state.status,
      };
    }

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      avgLatencyMs:
        this.latencyBuffer.length > 0
          ? this.latencyBuffer.reduce((a, b) => a + b, 0) /
            this.latencyBuffer.length
          : 0,
      p99LatencyMs: percentile(sorted, 0.99),
      successRate:
        this.totalRequests > 0
          ? this.successfulRequests / this.totalRequests
          : 1,
      errorRate:
        this.totalRequests > 0
          ? this.failedRequests / this.totalRequests
          : 0,
      currentRps: requestsThisTick * 10,
      uptime: elapsed,
      perComponent,
      history: [...this.history],
    };
  }
}
