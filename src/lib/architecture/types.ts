export type ComponentType =
  | "client"
  | "cdn"
  | "load-balancer"
  | "api-gateway"
  | "api-server"
  | "microservice"
  | "auth-service"
  | "worker"
  | "websocket"
  | "redis"
  | "postgres"
  | "nosql"
  | "search"
  | "object-storage"
  | "data-warehouse"
  | "queue";

export type Protocol = "http" | "tcp" | "grpc" | "ws";

export interface BaseConfig {
  label?: string;
  /** Region/availability-zone label used to model cross-AZ network latency. */
  region?: string;
}

export interface LoadBalancerConfig extends BaseConfig {
  algorithm: "round-robin" | "least-connections" | "ip-hash";
  healthCheckIntervalMs: number;
  maxRps: number;
  /** SSL termination adds CPU + ~2ms latency */
  sslTermination: boolean;
}

export interface ApiGatewayConfig extends BaseConfig {
  maxRps: number;
  rateLimitPerClient: number;
  /** Auth check adds latency (JWT verify, API key lookup) */
  authEnabled: boolean;
  /** Request transformation / aggregation cost */
  transformationCost: number;
}

export interface ApiServerConfig extends BaseConfig {
  instances: number;
  maxConcurrentRequests: number;
  cpuCores: number;
  memoryGB: number;
  baseLatencyMs: number;
  /** Cold start latency in serverless / autoscaled deployments */
  coldStartMs: number;
  /** Whether autoscaling is enabled (smooths out spikes but adds cost) */
  autoScale: boolean;
}

export interface MicroserviceConfig extends BaseConfig {
  instances: number;
  maxConcurrentRequests: number;
  baseLatencyMs: number;
  /** Service-to-service network overhead */
  networkOverheadMs: number;
  /** Circuit breaker protects against downstream failure */
  circuitBreakerEnabled: boolean;
  cpuCores: number;
  memoryGB: number;
}

export interface AuthServiceConfig extends BaseConfig {
  maxRps: number;
  baseLatencyMs: number;
  /** Token cache hit rate — caches reduce auth-service load */
  tokenCacheHitRate: number;
}

export interface WorkerConfig extends BaseConfig {
  instances: number;
  /** Jobs processed per second per worker */
  jobsPerSecondPerWorker: number;
  /** Average time per job in ms */
  avgJobDurationMs: number;
  /** Concurrent jobs per worker */
  concurrency: number;
}

export interface WebSocketConfig extends BaseConfig {
  instances: number;
  /** Max concurrent connections per instance */
  maxConnectionsPerInstance: number;
  /** Memory per active connection in KB */
  memoryPerConnectionKB: number;
}

export interface RedisConfig extends BaseConfig {
  maxMemoryMB: number;
  evictionPolicy: "lru" | "lfu" | "random" | "noeviction";
  hitRate: number;
  clusterMode: boolean;
  /** Persistence adds disk I/O and crash safety */
  persistence: "none" | "rdb" | "aof";
  /** Read replicas spread read load */
  replicaCount: number;
}

export interface PostgresConfig extends BaseConfig {
  maxConnections: number;
  replicaCount: number;
  diskIOPS: number;
  baseLatencyMs: number;
  /** Indexes speed up reads but slow writes */
  indexedReads: boolean;
  /** Connection pooler (pgbouncer) multiplies effective connections */
  connectionPooler: boolean;
  /** Replica lag in ms — affects read-after-write consistency */
  replicaLagMs: number;
}

export interface NoSQLConfig extends BaseConfig {
  /** Provisioned read units / s */
  readCapacity: number;
  /** Provisioned write units / s */
  writeCapacity: number;
  /** Consistency model */
  consistency: "eventual" | "strong";
  /** Partition count — affects hot key behavior */
  partitions: number;
  baseLatencyMs: number;
}

export interface SearchConfig extends BaseConfig {
  nodes: number;
  shards: number;
  replicas: number;
  indexSizeGB: number;
  baseLatencyMs: number;
}

export interface ObjectStorageConfig extends BaseConfig {
  /** Cost per GB / month */
  storageGB: number;
  /** Avg object size in KB */
  avgObjectSizeKB: number;
  /** Multi-region replication */
  multiRegion: boolean;
}

export interface DataWarehouseConfig extends BaseConfig {
  /** Compute units (e.g. Snowflake credits, BigQuery slots) */
  computeUnits: number;
  /** Average query time in ms */
  avgQueryMs: number;
  /** Result cache hit rate */
  resultCacheHitRate: number;
}

export interface CDNConfig extends BaseConfig {
  cacheEnabled: boolean;
  ttlSeconds: number;
  hitRate: number;
  /** Edge locations (more = lower latency globally) */
  edgeLocations: number;
}

export interface QueueConfig extends BaseConfig {
  maxThroughputRps: number;
  bufferSize: number;
  /** Durable queues persist messages to disk */
  durable: boolean;
  /** Average message size in KB */
  avgMessageSizeKB: number;
}

export interface ClientConfig extends BaseConfig {
  rps: number;
  readRatio: number;
  /** Geographic distribution of clients — affects baseline latency */
  geography: "single-region" | "multi-region" | "global";
}

export type ComponentConfigMap = {
  client: ClientConfig;
  cdn: CDNConfig;
  "load-balancer": LoadBalancerConfig;
  "api-gateway": ApiGatewayConfig;
  "api-server": ApiServerConfig;
  microservice: MicroserviceConfig;
  "auth-service": AuthServiceConfig;
  worker: WorkerConfig;
  websocket: WebSocketConfig;
  redis: RedisConfig;
  postgres: PostgresConfig;
  nosql: NoSQLConfig;
  search: SearchConfig;
  "object-storage": ObjectStorageConfig;
  "data-warehouse": DataWarehouseConfig;
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
  /** Estimated cost in USD per hour at current load */
  costPerHour?: number;
  /** Component-specific saturation indicator (0-1+) */
  saturation?: number;
  /** Connection pool usage 0-1+ */
  connectionPoolUse?: number;
  /** Queue depth (for queue components) */
  queueDepth?: number;
}

export interface SimulationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
  errorRate: number;
  currentRps: number;
  uptime: number;
  /** Estimated $/month at current load */
  estimatedMonthlyCost: number;
  /** Sustainable max RPS before failure */
  estimatedMaxRps: number;
  perComponent: Record<string, ComponentMetrics>;
  history: MetricsTick[];
}

export interface MetricsTick {
  t: number;
  rps: number;
  successRate: number;
  avgLatency: number;
  p99Latency: number;
}

export type SimulationStatus = "idle" | "running" | "paused" | "completed";

export interface TrafficPattern {
  type:
    | "constant"
    | "ramp"
    | "spike"
    | "wave"
    | "black-friday"
    | "viral"
    | "daily";
  baseRPS: number;
  readRatio: number;
}

export const DEFAULT_CONFIGS: ComponentConfigMap = {
  client: {
    label: "Client",
    rps: 100,
    readRatio: 0.8,
    geography: "single-region",
  },
  cdn: {
    label: "CDN",
    cacheEnabled: true,
    ttlSeconds: 3600,
    hitRate: 0.7,
    edgeLocations: 50,
  },
  "load-balancer": {
    label: "Load Balancer",
    algorithm: "round-robin",
    healthCheckIntervalMs: 5000,
    maxRps: 10000,
    sslTermination: true,
  },
  "api-gateway": {
    label: "API Gateway",
    maxRps: 20000,
    rateLimitPerClient: 1000,
    authEnabled: true,
    transformationCost: 2,
  },
  "api-server": {
    label: "API Server",
    instances: 2,
    maxConcurrentRequests: 100,
    cpuCores: 2,
    memoryGB: 4,
    baseLatencyMs: 15,
    coldStartMs: 0,
    autoScale: false,
  },
  microservice: {
    label: "Service",
    instances: 2,
    maxConcurrentRequests: 80,
    baseLatencyMs: 10,
    networkOverheadMs: 3,
    circuitBreakerEnabled: true,
    cpuCores: 1,
    memoryGB: 2,
  },
  "auth-service": {
    label: "Auth Service",
    maxRps: 5000,
    baseLatencyMs: 8,
    tokenCacheHitRate: 0.9,
  },
  worker: {
    label: "Worker",
    instances: 2,
    jobsPerSecondPerWorker: 50,
    avgJobDurationMs: 200,
    concurrency: 10,
  },
  websocket: {
    label: "WebSocket",
    instances: 2,
    maxConnectionsPerInstance: 10000,
    memoryPerConnectionKB: 16,
  },
  redis: {
    label: "Redis Cache",
    maxMemoryMB: 1024,
    evictionPolicy: "lru",
    hitRate: 0.85,
    clusterMode: false,
    persistence: "rdb",
    replicaCount: 0,
  },
  postgres: {
    label: "Postgres",
    maxConnections: 100,
    replicaCount: 0,
    diskIOPS: 3000,
    baseLatencyMs: 8,
    indexedReads: true,
    connectionPooler: false,
    replicaLagMs: 50,
  },
  nosql: {
    label: "DynamoDB",
    readCapacity: 5000,
    writeCapacity: 2000,
    consistency: "eventual",
    partitions: 4,
    baseLatencyMs: 5,
  },
  search: {
    label: "Elasticsearch",
    nodes: 3,
    shards: 5,
    replicas: 1,
    indexSizeGB: 10,
    baseLatencyMs: 30,
  },
  "object-storage": {
    label: "Object Storage",
    storageGB: 100,
    avgObjectSizeKB: 256,
    multiRegion: false,
  },
  "data-warehouse": {
    label: "Data Warehouse",
    computeUnits: 4,
    avgQueryMs: 2000,
    resultCacheHitRate: 0.4,
  },
  queue: {
    label: "Message Queue",
    maxThroughputRps: 5000,
    bufferSize: 10000,
    durable: true,
    avgMessageSizeKB: 1,
  },
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  client: "Client",
  cdn: "CDN",
  "load-balancer": "Load Balancer",
  "api-gateway": "API Gateway",
  "api-server": "API Server",
  microservice: "Microservice",
  "auth-service": "Auth Service",
  worker: "Worker",
  websocket: "WebSocket",
  redis: "Redis",
  postgres: "Postgres",
  nosql: "NoSQL DB",
  search: "Search",
  "object-storage": "Object Storage",
  "data-warehouse": "Data Warehouse",
  queue: "Queue",
};

export const COMPONENT_DESCRIPTIONS: Record<ComponentType, string> = {
  client: "End-users / browsers / mobile apps that generate traffic.",
  cdn: "Edge caches static and dynamic content near users.",
  "load-balancer": "Distributes traffic across server instances (L4/L7).",
  "api-gateway": "Auth, rate-limit, transform, and route requests to services.",
  "api-server": "Stateless application server handling business logic.",
  microservice: "Focused service owning a bounded domain.",
  "auth-service": "Token issuance, validation, user identity (OAuth/JWT).",
  worker: "Async job processor for queue-driven background tasks.",
  websocket: "Long-lived connections for real-time bi-directional data.",
  redis: "In-memory KV cache for hot data and sessions.",
  postgres: "ACID relational database with strong consistency.",
  nosql: "Horizontally scaled KV/document store (DynamoDB-like).",
  search: "Full-text and analytical search (Elasticsearch-like).",
  "object-storage": "Blob storage for files, images, videos (S3-like).",
  "data-warehouse": "OLAP store for analytics and reporting.",
  queue: "Async message buffer for decoupling producers/consumers.",
};
