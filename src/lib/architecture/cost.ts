import type {
  ApiGatewayConfig,
  ApiServerConfig,
  AuthServiceConfig,
  CDNConfig,
  ComponentConfig,
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
  WebSocketConfig,
  WorkerConfig,
} from "./types";

const HOURS_PER_MONTH = 730;

/**
 * Approximate $/hour cost for a given component at its provisioned size.
 * Loosely modeled on AWS / GCP pricing (mid-2024). Not exact — directionally
 * accurate for sizing comparisons.
 */
export function hourlyCost(type: ComponentType, config: ComponentConfig): number {
  switch (type) {
    case "client":
      return 0;

    case "cdn": {
      const c = config as CDNConfig;
      // Edge POPs + base infrastructure. Egress dominates in practice but we approximate.
      return 0.05 + c.edgeLocations * 0.001;
    }

    case "load-balancer": {
      const c = config as LoadBalancerConfig;
      return 0.025 + (c.sslTermination ? 0.01 : 0);
    }

    case "api-gateway": {
      const c = config as ApiGatewayConfig;
      // API Gateway as a service ~ $3.50/M requests + $50/month/instance
      return 0.08 + c.maxRps * 0.000002;
    }

    case "api-server": {
      const c = config as ApiServerConfig;
      // ~$0.05/hour per vCPU, $0.005/hour per GB
      const perInstance = c.cpuCores * 0.05 + c.memoryGB * 0.005;
      return c.instances * perInstance;
    }

    case "microservice": {
      const c = config as MicroserviceConfig;
      const perInstance = c.cpuCores * 0.05 + c.memoryGB * 0.005;
      return c.instances * perInstance;
    }

    case "auth-service": {
      const c = config as AuthServiceConfig;
      // 2 medium instances + redis
      return 0.15 + c.maxRps * 0.0000005;
    }

    case "worker": {
      const c = config as WorkerConfig;
      // ~$0.06/hour per worker (m5.large equivalent)
      return c.instances * 0.06;
    }

    case "websocket": {
      const c = config as WebSocketConfig;
      // Memory-heavy: assume 32GB RAM instances
      return c.instances * 0.2;
    }

    case "redis": {
      const c = config as RedisConfig;
      // ~$0.04/GB-hour on ElastiCache
      const memGB = c.maxMemoryMB / 1024;
      const base = memGB * 0.05;
      const replicaCost = c.replicaCount * base * 0.8;
      return base + replicaCost;
    }

    case "postgres": {
      const c = config as PostgresConfig;
      // RDS Postgres ~$0.10-0.40/hour for medium, more for larger
      // Approximate from connection count as a proxy for size
      const sizeFactor = Math.max(1, c.maxConnections / 100);
      const base = 0.12 * sizeFactor + (c.diskIOPS / 3000) * 0.04;
      const replicaCost = c.replicaCount * base * 0.9;
      return base + replicaCost;
    }

    case "nosql": {
      const c = config as NoSQLConfig;
      // DynamoDB provisioned: $0.00065/WCU-hour, $0.00013/RCU-hour
      return c.writeCapacity * 0.00065 + c.readCapacity * 0.00013;
    }

    case "search": {
      const c = config as SearchConfig;
      // ~$0.20/node-hour for a moderate ES node
      return c.nodes * 0.2 + (c.indexSizeGB * 0.001);
    }

    case "object-storage": {
      const c = config as ObjectStorageConfig;
      // $0.023/GB/month = ~$0.0000315/GB/hour
      const storageCost = c.storageGB * 0.000032;
      return storageCost * (c.multiRegion ? 2 : 1);
    }

    case "data-warehouse": {
      const c = config as DataWarehouseConfig;
      // Snowflake: ~$2-4/credit-hour. Assume ~$3 per compute unit-hour.
      return c.computeUnits * 3 * 0.5; // 50% utilization assumed
    }

    case "queue": {
      const c = config as QueueConfig;
      // SQS ~$0.40/M requests, but Kafka self-hosted has fixed costs
      const reqCost = c.maxThroughputRps * 3600 * 0.0000004;
      return Math.max(0.05, reqCost);
    }

    default:
      return 0;
  }
}

/**
 * Variable cost per million requests handled by a component.
 * For pay-per-use components (CDN, API GW, NoSQL on-demand).
 */
export function costPerMillionRequests(
  type: ComponentType,
  config: ComponentConfig
): number {
  switch (type) {
    case "cdn":
      return 0.75; // $0.75/M CloudFront requests
    case "api-gateway":
      return 3.5;
    case "object-storage": {
      const c = config as ObjectStorageConfig;
      // mix of PUT/GET pricing
      return 2.5 + c.avgObjectSizeKB * 0.001;
    }
    case "nosql": {
      const c = config as NoSQLConfig;
      return c.consistency === "strong" ? 2.5 : 1.25;
    }
    case "queue":
      return 0.4;
    default:
      return 0;
  }
}

export function monthlyCost(type: ComponentType, config: ComponentConfig): number {
  return hourlyCost(type, config) * HOURS_PER_MONTH;
}
