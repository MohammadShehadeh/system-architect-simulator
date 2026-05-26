export type ComponentType =
  | "client"
  | "cdn"
  | "load-balancer"
  | "api-server"
  | "redis"
  | "postgres"
  | "queue";

export type Protocol = "http" | "tcp" | "grpc";

export interface BaseConfig {
  label?: string;
}

export interface LoadBalancerConfig extends BaseConfig {
  algorithm: "round-robin" | "least-connections" | "ip-hash";
  healthCheckIntervalMs: number;
  maxRps: number;
}

export interface ApiServerConfig extends BaseConfig {
  instances: number;
  maxConcurrentRequests: number;
  cpuCores: number;
  memoryGB: number;
  baseLatencyMs: number;
}

export interface RedisConfig extends BaseConfig {
  maxMemoryMB: number;
  evictionPolicy: "lru" | "lfu" | "random";
  hitRate: number;
  clusterMode: boolean;
}

export interface PostgresConfig extends BaseConfig {
  maxConnections: number;
  replicaCount: number;
  diskIOPS: number;
  baseLatencyMs: number;
}

export interface CDNConfig extends BaseConfig {
  cacheEnabled: boolean;
  ttlSeconds: number;
  hitRate: number;
}

export interface QueueConfig extends BaseConfig {
  maxThroughputRps: number;
  bufferSize: number;
}

export interface ClientConfig extends BaseConfig {
  rps: number;
  readRatio: number;
}

export type ComponentConfigMap = {
  client: ClientConfig;
  cdn: CDNConfig;
  "load-balancer": LoadBalancerConfig;
  "api-server": ApiServerConfig;
  redis: RedisConfig;
  postgres: PostgresConfig;
  queue: QueueConfig;
};

export type ComponentConfig = ComponentConfigMap[ComponentType];

export interface ComponentNodeData extends Record<string, unknown> {
  type: ComponentType;
  config: ComponentConfig;
  metrics?: ComponentMetrics;
}

export interface ComponentMetrics {
  rps: number;
  p50Latency: number;
  p99Latency: number;
  errorRate: number;
  cpuUtilization: number;
  memoryUtilization: number;
  status: "healthy" | "degraded" | "overloaded" | "failed";
}

export interface SimulationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
  errorRate: number;
  currentRps: number;
  uptime: number;
  perComponent: Record<string, ComponentMetrics>;
  history: MetricsTick[];
}

export interface MetricsTick {
  t: number;
  rps: number;
  successRate: number;
  avgLatency: number;
}

export type SimulationStatus = "idle" | "running" | "paused" | "completed";

export interface TrafficPattern {
  type: "constant" | "ramp" | "spike" | "wave";
  baseRPS: number;
  readRatio: number;
}

export const DEFAULT_CONFIGS: ComponentConfigMap = {
  client: {
    label: "Client",
    rps: 100,
    readRatio: 0.8,
  },
  cdn: {
    label: "CDN",
    cacheEnabled: true,
    ttlSeconds: 3600,
    hitRate: 0.7,
  },
  "load-balancer": {
    label: "Load Balancer",
    algorithm: "round-robin",
    healthCheckIntervalMs: 5000,
    maxRps: 10000,
  },
  "api-server": {
    label: "API Server",
    instances: 2,
    maxConcurrentRequests: 100,
    cpuCores: 2,
    memoryGB: 4,
    baseLatencyMs: 15,
  },
  redis: {
    label: "Redis Cache",
    maxMemoryMB: 1024,
    evictionPolicy: "lru",
    hitRate: 0.85,
    clusterMode: false,
  },
  postgres: {
    label: "Postgres",
    maxConnections: 100,
    replicaCount: 0,
    diskIOPS: 3000,
    baseLatencyMs: 8,
  },
  queue: {
    label: "Message Queue",
    maxThroughputRps: 5000,
    bufferSize: 10000,
  },
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  client: "Client",
  cdn: "CDN",
  "load-balancer": "Load Balancer",
  "api-server": "API Server",
  redis: "Redis",
  postgres: "Postgres",
  queue: "Queue",
};

export const COMPONENT_DESCRIPTIONS: Record<ComponentType, string> = {
  client: "Generates traffic into the system",
  cdn: "Edge cache for static and dynamic content",
  "load-balancer": "Distributes traffic across servers",
  "api-server": "Stateless application server",
  redis: "In-memory key-value cache",
  postgres: "Relational database with connection pooling",
  queue: "Async message buffer",
};
