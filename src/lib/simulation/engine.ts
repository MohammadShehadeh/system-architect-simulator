import type { Edge, Node } from "@xyflow/react";
import type {
  ApiGatewayConfig,
  ApiServerConfig,
  AuthServiceConfig,
  CDNConfig,
  ClientConfig,
  ComponentMetrics,
  ComponentNodeData,
  ComponentType,
  DataWarehouseConfig,
  LoadBalancerConfig,
  MicroserviceConfig,
  NoSQLConfig,
  ObjectStorageConfig,
  PostgresConfig,
  QueueConfig,
  RedisConfig,
  SearchConfig,
  SimulationMetrics,
  WebSocketConfig,
  WorkerConfig,
} from "@/lib/architecture/types";
import { hourlyCost, costPerMillionRequests } from "@/lib/architecture/cost";

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
  saturation: number;
  connectionPoolUse?: number;
  cacheHits?: number;
  cacheMisses?: number;
  queueDepth?: number;
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
  saturation: 0,
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

// ─────────────────────────────────────────────────────────────────
// Per-component realistic simulation
// ─────────────────────────────────────────────────────────────────

function setStatusBySaturation(state: ComponentState, sat: number) {
  state.saturation = sat;
  if (sat > 1.3) state.status = "failed";
  else if (sat > 1.0) state.status = "overloaded";
  else if (sat > 0.8) state.status = "degraded";
  else state.status = "healthy";
}

function simulateApiServer(
  config: ApiServerConfig,
  state: ComponentState,
  rps: number
) {
  const totalCapacity = config.instances * config.maxConcurrentRequests;
  const sat = rps / Math.max(totalCapacity, 1);
  state.cpuUtilization = Math.min(1, sat);
  state.memoryUtilization = Math.min(1, sat * 0.85);

  let latency = config.baseLatencyMs;
  let errorRate = 0;

  if (config.coldStartMs > 0 && Math.random() < 0.02) {
    latency += config.coldStartMs;
  }

  if (sat > 1.5) {
    latency *= 8;
    errorRate = 0.4;
  } else if (sat > 1.2) {
    latency *= 4;
    errorRate = 0.15;
  } else if (sat > 0.9) {
    latency *= 2;
    errorRate = 0.02;
  } else if (sat > 0.7) {
    latency *= 1.4;
  }

  if (config.autoScale && sat > 0.7) {
    // Auto-scale dampens, but with delay
    latency *= 0.9;
    errorRate *= 0.5;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(-2, 4), errorRate };
}

function simulateMicroservice(
  config: MicroserviceConfig,
  state: ComponentState,
  rps: number,
  downstreamFailureRate: number
) {
  const totalCapacity = config.instances * config.maxConcurrentRequests;
  const sat = rps / Math.max(totalCapacity, 1);
  state.cpuUtilization = Math.min(1, sat);
  state.memoryUtilization = Math.min(1, sat * 0.8);

  let latency = config.baseLatencyMs + config.networkOverheadMs;
  let errorRate = 0;

  if (sat > 1.3) {
    latency *= 6;
    errorRate = 0.3;
  } else if (sat > 1.0) {
    latency *= 3;
    errorRate = 0.1;
  } else if (sat > 0.85) {
    latency *= 1.8;
    errorRate = 0.02;
  } else if (sat > 0.7) {
    latency *= 1.3;
  }

  // Circuit breaker behaviour — if downstream is failing, fail fast instead of waiting
  if (config.circuitBreakerEnabled && downstreamFailureRate > 0.5) {
    errorRate = Math.max(errorRate, 0.5);
    latency = 5; // fail fast
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 3), errorRate };
}

function simulateApiGateway(
  config: ApiGatewayConfig,
  state: ComponentState,
  rps: number
) {
  const sat = rps / Math.max(config.maxRps, 1);
  state.cpuUtilization = Math.min(1, sat);
  let latency = 2 + (config.authEnabled ? 3 : 0) + config.transformationCost;
  let errorRate = 0;

  // Rate limiting: requests above rateLimitPerClient * (assumed 100 clients) get 429s
  // Approximate by capping effective throughput
  const ratelimitCap = config.rateLimitPerClient * 100;
  if (rps > ratelimitCap) {
    const excess = (rps - ratelimitCap) / rps;
    errorRate += excess * 0.8;
  }

  if (sat > 1.1) {
    latency *= 4;
    errorRate = Math.max(errorRate, 0.1);
  } else if (sat > 0.85) {
    latency *= 1.5;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 1), errorRate };
}

function simulateAuthService(
  config: AuthServiceConfig,
  state: ComponentState,
  rps: number
) {
  // Total saturation is total RPS vs maxRps; the cache just reduces latency.
  const sat = rps / Math.max(config.maxRps, 1);
  state.cpuUtilization = Math.min(1, sat);

  const cacheLatency = 0.5;
  const fullLatency = config.baseLatencyMs;
  const avg =
    cacheLatency * config.tokenCacheHitRate +
    fullLatency * (1 - config.tokenCacheHitRate);

  let errorRate = 0;
  if (sat > 1.2) errorRate = 0.3;
  else if (sat > 1.0) errorRate = 0.1;
  else if (sat > 0.85) errorRate = 0.02;

  setStatusBySaturation(state, sat);
  return { latency: avg + random(0, 1), errorRate };
}

function simulateLoadBalancer(
  config: LoadBalancerConfig,
  state: ComponentState,
  rps: number
) {
  const sat = rps / Math.max(config.maxRps, 1);
  state.cpuUtilization = Math.min(1, sat);
  let latency = 1 + (config.sslTermination ? 1.5 : 0);
  let errorRate = 0;
  if (sat > 1) {
    latency = 10;
    errorRate = 0.1;
  } else if (sat > 0.85) {
    latency = 4;
    errorRate = 0.01;
  }
  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 1), errorRate };
}

function simulateRedis(
  config: RedisConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  // Effective capacity scales with cluster + replicas (reads)
  const baseCap = config.clusterMode ? 200000 : 80000;
  const readCap = baseCap * (1 + config.replicaCount * 0.7);
  const writeCap = baseCap;
  const effectiveCap = isRead ? readCap : writeCap;

  const sat = rps / effectiveCap;

  // Memory pressure
  const memUse = Math.min(1, rps / 200000 + 0.2);
  state.memoryUtilization = memUse;
  state.cpuUtilization = Math.min(1, sat);

  let latency = 1 + random(0, 1);
  let errorRate = 0.0005;

  // Persistence adds latency on writes
  if (!isRead && config.persistence === "aof") latency += 0.5;
  if (!isRead && config.persistence === "rdb" && Math.random() < 0.01) {
    latency += 5; // RDB snapshots cause occasional spikes
  }

  // Eviction pressure
  if (memUse > 0.95 && config.evictionPolicy === "noeviction") {
    errorRate = 0.3;
  } else if (memUse > 0.95) {
    latency *= 2;
    errorRate = 0.02;
  }

  if (sat > 1.0) {
    latency *= 5;
    errorRate = Math.max(errorRate, 0.15);
  } else if (sat > 0.85) {
    latency *= 2;
    errorRate = Math.max(errorRate, 0.01);
  }

  setStatusBySaturation(state, sat);
  const isHit = isRead && Math.random() < config.hitRate;
  return { latency, errorRate, isHit };
}

function simulatePostgres(
  config: PostgresConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  // Effective connections: pooler multiplies (transaction pooling)
  const poolMultiplier = config.connectionPooler ? 20 : 1;
  const effectiveConnections = config.maxConnections * poolMultiplier;

  // Each connection handles ~30-100 queries/sec depending on type
  const queriesPerConnection = isRead ? 80 : 40;
  const connectionsNeeded = rps / queriesPerConnection;
  const poolUtilization = connectionsNeeded / effectiveConnections;

  // IOPS pressure: writes are heavier (random IO + WAL)
  const iopsPerRequest = isRead ? 1 : 5;
  const iopsUse = (rps * iopsPerRequest) / config.diskIOPS;

  // Replicas can absorb reads
  const readScaleFactor = isRead ? 1 + config.replicaCount * 0.8 : 1;
  const effectivePoolUtil = poolUtilization / readScaleFactor;
  const effectiveIopsUse = iopsUse / readScaleFactor;

  const sat = Math.max(effectivePoolUtil, effectiveIopsUse);

  state.cpuUtilization = Math.min(1, sat);
  state.memoryUtilization = Math.min(1, effectivePoolUtil * 0.6);
  state.connectionPoolUse = Math.min(1, effectivePoolUtil);

  let latency = config.baseLatencyMs;
  if (!isRead) latency *= 2; // writes do fsync
  if (!config.indexedReads && isRead) latency *= 10; // seq scan

  let errorRate = 0.0005;

  if (sat > 1.3) {
    latency *= 15;
    errorRate = 0.5;
  } else if (sat > 1.0) {
    latency *= 6;
    errorRate = 0.2;
  } else if (sat > 0.8) {
    latency *= 2.5;
    errorRate = 0.03;
  } else if (sat > 0.65) {
    latency *= 1.5;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 3), errorRate };
}

function simulateNoSQL(
  config: NoSQLConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  const capacity = isRead ? config.readCapacity : config.writeCapacity;
  const sat = rps / Math.max(capacity, 1);
  state.cpuUtilization = Math.min(1, sat);

  let latency = config.baseLatencyMs;
  if (config.consistency === "strong") latency *= 2;
  if (!isRead) latency *= 1.5;

  let errorRate = 0.0002;

  // Throttling at capacity (DynamoDB returns ProvisionedThroughputExceeded)
  if (sat > 1.0) {
    errorRate = (sat - 1) * 0.5;
    latency *= 3;
  }

  // Hot partition: if rps per partition is too high
  const rpsPerPartition = rps / Math.max(config.partitions, 1);
  if (rpsPerPartition > 1000) {
    errorRate = Math.max(errorRate, 0.05);
    latency *= 2;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 2), errorRate };
}

function simulateSearch(
  config: SearchConfig,
  state: ComponentState,
  rps: number
) {
  // ES capacity: ~500 qps per node for moderate queries
  const capacity = config.nodes * 500;
  const sat = rps / Math.max(capacity, 1);
  state.cpuUtilization = Math.min(1, sat);
  state.memoryUtilization = Math.min(1, sat * 0.9 + config.indexSizeGB * 0.01);

  let latency = config.baseLatencyMs;
  if (config.indexSizeGB > 100) latency *= 1.5;

  let errorRate = 0.001;

  if (sat > 1.0) {
    latency *= 4;
    errorRate = 0.1;
  } else if (sat > 0.8) {
    latency *= 2;
    errorRate = 0.01;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 5), errorRate };
}

function simulateObjectStorage(
  config: ObjectStorageConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  // S3 prefix limits: ~5500 GET/s, ~3500 PUT/s per prefix
  const cap = isRead ? 5500 : 3500;
  const sat = rps / cap;
  state.cpuUtilization = Math.min(1, sat * 0.5); // mostly managed

  let latency = (isRead ? 30 : 60) + (config.avgObjectSizeKB > 1000 ? 50 : 0);
  let errorRate = 0.001;

  if (sat > 1.0) {
    errorRate = 0.05; // 503 SlowDown
    latency *= 2;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 30), errorRate };
}

function simulateDataWarehouse(
  config: DataWarehouseConfig,
  state: ComponentState,
  rps: number
) {
  // DW is not for high QPS — saturates fast on direct query traffic
  const cap = config.computeUnits * 5; // ~5 concurrent queries per compute unit
  const sat = rps / Math.max(cap, 1);
  state.cpuUtilization = Math.min(1, sat);

  let latency = config.avgQueryMs;
  if (Math.random() < config.resultCacheHitRate) latency = 50;

  let errorRate = 0;
  if (sat > 1.0) {
    latency *= 4;
    errorRate = 0.2;
  }

  setStatusBySaturation(state, sat);
  return { latency: latency + random(0, 200), errorRate };
}

function simulateCDN(
  config: CDNConfig,
  state: ComponentState,
  rps: number,
  isRead: boolean
) {
  state.cpuUtilization = Math.min(1, rps / 1000000);
  state.status = "healthy";
  state.saturation = rps / 1000000;
  const isHit = config.cacheEnabled && isRead && Math.random() < config.hitRate;
  const latency = isHit ? 10 + random(0, 8) : 5 + random(0, 3);
  return { latency, errorRate: 0.0001, isHit };
}

function simulateQueue(
  config: QueueConfig,
  state: ComponentState,
  rps: number
) {
  const sat = rps / Math.max(config.maxThroughputRps, 1);
  state.cpuUtilization = Math.min(1, sat);

  // Queue depth grows when producers exceed throughput, drains when consumers catch up.
  const overage = rps - config.maxThroughputRps;
  const prev = state.queueDepth ?? 0;
  state.queueDepth = Math.max(
    0,
    Math.min(config.bufferSize, prev + overage * 0.1)
  );

  let latency = config.durable ? 3 : 1;
  let errorRate = 0;

  if (state.queueDepth >= config.bufferSize * 0.95) {
    errorRate = 0.4;
  }

  if (sat > 1.2) {
    latency *= 5;
    errorRate = Math.max(errorRate, 0.2);
  } else if (sat > 0.9) {
    latency *= 2;
  }

  setStatusBySaturation(state, sat);
  return { latency, errorRate };
}

function simulateWorker(
  config: WorkerConfig,
  state: ComponentState,
  rps: number
) {
  const capacity = config.instances * config.jobsPerSecondPerWorker;
  const sat = rps / Math.max(capacity, 1);
  state.cpuUtilization = Math.min(1, sat);
  state.memoryUtilization = Math.min(1, sat * 0.7);

  // Workers don't return latency to clients; success is throughput-based
  const latency = config.avgJobDurationMs;
  let errorRate = 0.001;

  if (sat > 1.0) {
    errorRate = (sat - 1) * 0.3;
  }

  setStatusBySaturation(state, sat);
  return { latency, errorRate };
}

function simulateWebSocket(
  config: WebSocketConfig,
  state: ComponentState,
  rps: number
) {
  // Each "rps" here approximates active connection events
  // Memory bound, not CPU
  const maxConns = config.instances * config.maxConnectionsPerInstance;
  const estimatedConns = rps * 60; // assume ~60s connection lifetime
  const sat = estimatedConns / Math.max(maxConns, 1);

  state.memoryUtilization = Math.min(
    1,
    (estimatedConns * config.memoryPerConnectionKB) /
      (config.instances * 32 * 1024 * 1024) // assume 32GB instance
  );
  state.cpuUtilization = Math.min(1, sat * 0.3);

  const latency = 1; // WS frames are fast
  let errorRate = 0;

  if (sat > 1.0) {
    errorRate = 0.3;
  } else if (sat > 0.8) {
    errorRate = 0.01;
  }

  setStatusBySaturation(state, sat);
  return { latency, errorRate };
}

// ─────────────────────────────────────────────────────────────────
// Request routing
// ─────────────────────────────────────────────────────────────────

interface RouteCtx {
  nodes: ArchNode[];
  edges: ArchEdge[];
  states: Map<string, ComponentState>;
  /** Latency accumulated traversing the network (per node-to-node hop) */
  hopLatency: number;
}

function routeRequest(
  request: SimRequest,
  currentId: string,
  ctx: RouteCtx,
  depth = 0
): SimRequest {
  if (depth > 30) {
    request.failed = true;
    request.failReason = "Cycle/depth limit";
    return request;
  }

  const node = ctx.nodes.find((n) => n.id === currentId);
  if (!node) {
    request.failed = true;
    request.failReason = "Node missing";
    return request;
  }

  request.path.push(currentId);
  const state = ctx.states.get(currentId)!;
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
    case "api-gateway": {
      const r = simulateApiGateway(
        cfg as ApiGatewayConfig,
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
    case "microservice": {
      // Compute downstream failure rate for circuit-breaker
      const downstream = getOutgoingEdges(currentId, ctx.edges);
      const downstreamFailure =
        downstream.reduce((sum, e) => {
          const s = ctx.states.get(e.target);
          if (!s || s.totalRequests === 0) return sum;
          return sum + s.failedRequests / s.totalRequests;
        }, 0) / Math.max(downstream.length, 1);
      const r = simulateMicroservice(
        cfg as MicroserviceConfig,
        state,
        state.currentRps,
        downstreamFailure
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "auth-service": {
      const r = simulateAuthService(
        cfg as AuthServiceConfig,
        state,
        state.currentRps
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "websocket": {
      const r = simulateWebSocket(
        cfg as WebSocketConfig,
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
        state.currentRps,
        request.type === "read"
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "nosql": {
      const r = simulateNoSQL(
        cfg as NoSQLConfig,
        state,
        state.currentRps,
        request.type === "read"
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "search": {
      const r = simulateSearch(cfg as SearchConfig, state, state.currentRps);
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "object-storage": {
      const r = simulateObjectStorage(
        cfg as ObjectStorageConfig,
        state,
        state.currentRps,
        request.type === "read"
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "data-warehouse": {
      const r = simulateDataWarehouse(
        cfg as DataWarehouseConfig,
        state,
        state.currentRps
      );
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "queue": {
      const r = simulateQueue(cfg as QueueConfig, state, state.currentRps);
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
    case "worker": {
      const r = simulateWorker(cfg as WorkerConfig, state, state.currentRps);
      latency = r.latency;
      errorRate = r.errorRate;
      break;
    }
  }

  // Add hop latency from previous node (network)
  if (depth > 0) latency += ctx.hopLatency;

  request.latency += latency;
  state.latencySamples.push(latency);

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
    // Cache hit / CDN hit short-circuits downstream calls
    return request;
  }

  const outgoing = getOutgoingEdges(currentId, ctx.edges);
  if (outgoing.length === 0) {
    return request;
  }

  // Routing rules per source type
  switch (type) {
    case "load-balancer": {
      // Pick one downstream by algorithm
      const idx = state.totalRequests % outgoing.length;
      return routeRequest(request, outgoing[idx].target, ctx, depth + 1);
    }
    case "api-gateway": {
      // Auth check first (if auth-service connected) then call one of the services
      const authEdge = outgoing.find((e) => {
        const t = ctx.nodes.find((n) => n.id === e.target);
        return t?.data.type === "auth-service";
      });
      if (authEdge && (cfg as ApiGatewayConfig).authEnabled) {
        const authResult = routeRequest(
          { ...request, path: [...request.path], failed: false, latency: 0 },
          authEdge.target,
          ctx,
          depth + 1
        );
        // Auth failures abort the request
        if (authResult.failed) {
          request.failed = true;
          request.failReason = "auth failed";
          state.failedRequests++;
          return request;
        }
        request.latency += authResult.latency;
      }
      const serviceEdges = outgoing.filter((e) => e !== authEdge);
      if (serviceEdges.length === 0) return request;
      const idx = state.totalRequests % serviceEdges.length;
      return routeRequest(request, serviceEdges[idx].target, ctx, depth + 1);
    }
    case "api-server":
    case "microservice": {
      // Try cache first, then DB. Async writes go to queue.
      const cacheEdge = outgoing.find((e) => {
        const t = ctx.nodes.find((n) => n.id === e.target);
        return t?.data.type === "redis";
      });
      const dbEdges = outgoing.filter((e) => {
        const t = ctx.nodes.find((n) => n.id === e.target);
        return (
          t?.data.type === "postgres" ||
          t?.data.type === "nosql" ||
          t?.data.type === "search" ||
          t?.data.type === "object-storage" ||
          t?.data.type === "data-warehouse"
        );
      });
      const queueEdge = outgoing.find((e) => {
        const t = ctx.nodes.find((n) => n.id === e.target);
        return t?.data.type === "queue";
      });
      const serviceEdges = outgoing.filter((e) => {
        const t = ctx.nodes.find((n) => n.id === e.target);
        return t?.data.type === "microservice" || t?.data.type === "auth-service";
      });

      // Service-to-service calls happen first (sync deps)
      for (const se of serviceEdges) {
        const sResult = routeRequest(
          { ...request, path: [...request.path], failed: false, latency: 0 },
          se.target,
          ctx,
          depth + 1
        );
        if (sResult.failed) {
          request.failed = true;
          request.failReason = sResult.failReason ?? "downstream failed";
          state.failedRequests++;
          return request;
        }
        request.latency += sResult.latency;
      }

      // Async writes: fire-and-forget to queue
      if (queueEdge && request.type === "write") {
        const qResult = routeRequest(
          { ...request, path: [...request.path], failed: false, latency: 0 },
          queueEdge.target,
          ctx,
          depth + 1
        );
        if (qResult.failed) {
          request.failed = true;
          request.failReason = "queue rejected";
          state.failedRequests++;
          return request;
        }
        // Queue publish adds minimal latency
        request.latency += qResult.latency;
      }

      // Reads: try cache, fall through to DB
      if (cacheEdge && request.type === "read") {
        const cacheNode = ctx.nodes.find((n) => n.id === cacheEdge.target);
        const cacheCfg = cacheNode?.data.config as RedisConfig | undefined;
        const cacheResult = routeRequest(
          { ...request, path: [...request.path], failed: false, latency: 0 },
          cacheEdge.target,
          ctx,
          depth + 1
        );
        request.latency += cacheResult.latency;
        if (cacheResult.failed) {
          // cache miss / error → still try DB
        }
        const cacheHit = cacheCfg && Math.random() < cacheCfg.hitRate;
        if (cacheHit) return request;
      }

      // DB call(s)
      if (dbEdges.length === 0) return request;
      // Use the first DB edge primarily
      return routeRequest(request, dbEdges[0].target, ctx, depth + 1);
    }
    case "queue": {
      // Producer side returns immediately; workers consume async (modeled separately)
      // But we still simulate worker processing for capacity tracking
      const worker = outgoing.find((e) => {
        const t = ctx.nodes.find((n) => n.id === e.target);
        return t?.data.type === "worker";
      });
      if (worker) {
        // Async: worker work doesn't add to user-facing latency
        const workerResult = routeRequest(
          { ...request, path: [...request.path], failed: false, latency: 0 },
          worker.target,
          ctx,
          depth + 1
        );
        // Worker failure doesn't fail the producer, but tracks state
        if (workerResult.failed) {
          // tracked in worker state
        }
      }
      return request;
    }
    case "worker": {
      // Workers may call DBs / caches
      if (outgoing.length > 0) {
        return routeRequest(request, outgoing[0].target, ctx, depth + 1);
      }
      return request;
    }
    default: {
      // Generic: route to first outgoing
      return routeRequest(request, outgoing[0].target, ctx, depth + 1);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Top-level engine
// ─────────────────────────────────────────────────────────────────

export interface SimulationConfig {
  trafficMultiplier: number;
  pattern:
    | "constant"
    | "ramp"
    | "spike"
    | "wave"
    | "black-friday"
    | "viral"
    | "daily";
  durationMs: number;
  /** Cross-AZ / network hop latency between components (ms) */
  networkHopMs: number;
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
  /** Per-component cumulative request count, for averaged cost. */
  private componentRequestTotals: Map<string, number> = new Map();
  private config: SimulationConfig = {
    trafficMultiplier: 1,
    pattern: "constant",
    durationMs: 60_000,
    networkHopMs: 1,
  };

  setArchitecture(nodes: ArchNode[], edges: ArchEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.states = new Map(
      nodes.map((n) => [n.id, createState(n.data.type)])
    );
  }

  /**
   * Apply architecture/config edits mid-run without resetting accumulated
   * per-component state. Existing nodes keep their state; new nodes get fresh
   * state; removed nodes are dropped.
   */
  updateArchitecture(nodes: ArchNode[], edges: ArchEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    const next = new Map<string, ComponentState>();
    for (const n of nodes) {
      const prev = this.states.get(n.id);
      if (prev && prev.type === n.data.type) {
        next.set(n.id, prev);
      } else {
        next.set(n.id, createState(n.data.type));
      }
    }
    this.states = next;
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
    this.componentRequestTotals = new Map();
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
      case "black-friday":
        // Sudden 5x burst at 20%, sustained
        return t < 0.2 ? 1 : t < 0.25 ? 1 + (t - 0.2) * 80 : 5;
      case "viral":
        // Exponential growth then plateau
        return Math.min(8, 1 + Math.pow(t * 4, 2));
      case "daily":
        // 24h compressed: morning ramp, lunch dip, evening peak, overnight low
        return 1 + 1.5 * Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1;
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

    // Network latency baseline from client geography
    let networkBaseline = 0;
    for (const c of baseClients) {
      if (c.data.type !== "client") continue;
      const geo = (c.data.config as ClientConfig).geography;
      if (geo === "global") networkBaseline = Math.max(networkBaseline, 80);
      else if (geo === "multi-region") networkBaseline = Math.max(networkBaseline, 30);
      else networkBaseline = Math.max(networkBaseline, 5);
    }

    const requestsThisTick = Math.max(
      0,
      Math.round((totalRpsBase * factor) / 10)
    );

    let tickSuccesses = 0;
    const tickLatencies: number[] = [];

    const ctx: RouteCtx = {
      nodes: this.nodes,
      edges: this.edges,
      states: this.states,
      hopLatency: this.config.networkHopMs,
    };

    for (let i = 0; i < requestsThisTick; i++) {
      const client = baseClients[i % baseClients.length];
      if (!client) break;
      const cfg = client.data.config as ClientConfig;
      const isRead =
        client.data.type === "client" ? Math.random() < cfg.readRatio : true;
      const req: SimRequest = {
        type: isRead ? "read" : "write",
        latency: networkBaseline,
        path: [],
        failed: false,
      };
      const result = routeRequest(req, client.id, ctx);
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
    const p99TickLatency = percentile(
      [...tickLatencies].sort((a, b) => a - b),
      0.99
    );

    this.history.push({
      t: elapsed,
      rps: requestsThisTick * 10,
      successRate,
      avgLatency,
      p99Latency: p99TickLatency,
    });
    if (this.history.length > 240) this.history.shift();

    // Track cumulative requests per component so cost projections use average
    // load rather than the spiky instantaneous tick.
    for (const [id, state] of this.states.entries()) {
      this.componentRequestTotals.set(
        id,
        (this.componentRequestTotals.get(id) ?? 0) + state.currentRps
      );
    }

    const elapsedSec = Math.max(0.5, (Date.now() - this.startedAt) / 1000);
    const monthlyHours = 730;
    const monthlySeconds = monthlyHours * 3600;

    // Cost calculation — infra (always paid) + variable (based on AVG RPS)
    let hourlyTotal = 0;
    let monthlyVariableCost = 0;
    const perComponent: Record<string, ComponentMetrics> = {};
    for (const [id, state] of this.states.entries()) {
      const node = this.nodes.find((n) => n.id === id);
      if (!node) continue;
      const samplesSorted = [...state.latencySamples].sort((a, b) => a - b);

      const hCost = hourlyCost(node.data.type, node.data.config);
      const perReqCost =
        costPerMillionRequests(node.data.type, node.data.config) / 1_000_000;

      hourlyTotal += hCost;

      // componentRequestTotals accumulates raw per-tick request counts —
      // dividing by elapsed seconds gives true average RPS hitting this component.
      const cumulativeRequests = this.componentRequestTotals.get(id) ?? 0;
      const avgRpsForComponent = cumulativeRequests / elapsedSec;
      const componentMonthlyVariable =
        perReqCost * avgRpsForComponent * monthlySeconds;
      monthlyVariableCost += componentMonthlyVariable;

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
        costPerHour: hCost + perReqCost * avgRpsForComponent * 3600,
        saturation: state.saturation,
        connectionPoolUse: state.connectionPoolUse,
        queueDepth: state.queueDepth,
      };
    }

    const monthlyInfraCost = hourlyTotal * monthlyHours;
    const estimatedMonthlyCost = monthlyInfraCost + monthlyVariableCost;

    // Estimated max system RPS: project from observed saturation.
    // When saturation is very low across the board, the system has lots of
    // headroom but we can't extrapolate precisely — cap at 20x current.
    const currentSystemRps = requestsThisTick * 10;
    let estimatedMaxRps = Infinity;
    if (currentSystemRps > 0) {
      for (const [id, state] of this.states.entries()) {
        if (state.saturation < 0.1) continue;
        const node = this.nodes.find((n) => n.id === id);
        if (!node || node.data.type === "client") continue;
        const projected = currentSystemRps * (0.95 / state.saturation);
        if (projected < estimatedMaxRps) estimatedMaxRps = projected;
      }
    }
    if (!isFinite(estimatedMaxRps) || estimatedMaxRps < 0) {
      // No meaningful saturation observed — system has >10x headroom.
      estimatedMaxRps = currentSystemRps * 20;
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
      p50LatencyMs: percentile(sorted, 0.5),
      p95LatencyMs: percentile(sorted, 0.95),
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
      estimatedMonthlyCost,
      estimatedMaxRps,
      perComponent,
      history: [...this.history],
    };
  }
}
