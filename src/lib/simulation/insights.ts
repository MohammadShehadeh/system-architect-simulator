import type { ArchEdge, ArchNode } from "@/lib/store/architecture-store";
import type {
  ApiServerConfig,
  PostgresConfig,
  RedisConfig,
  SimulationMetrics,
} from "@/lib/architecture/types";

export interface Insight {
  id: string;
  severity: "info" | "warning" | "critical";
  category:
    | "bottleneck"
    | "reliability"
    | "cost"
    | "performance"
    | "capacity"
    | "best-practice";
  title: string;
  description: string;
  /** Specific component this relates to, if any */
  nodeId?: string;
  /** Suggested action */
  recommendation: string;
  /** Estimated impact of taking the recommendation */
  impact?: string;
}

export interface SLO {
  name: string;
  target: number;
  actual: number;
  met: boolean;
  /** Higher is better (e.g. success rate) or lower is better (e.g. p99 latency)? */
  direction: "lower-better" | "higher-better";
  unit: string;
}

export interface AnalysisResult {
  insights: Insight[];
  slos: SLO[];
  bottleneck: {
    nodeId: string | null;
    saturation: number;
    component: string;
  };
  /** Single points of failure */
  spofs: string[];
}

const DEFAULT_SLOS = {
  successRate: 0.99,
  p99LatencyMs: 500,
  p95LatencyMs: 200,
};

export function analyze(
  nodes: ArchNode[],
  edges: ArchEdge[],
  metrics: SimulationMetrics | null
): AnalysisResult {
  const insights: Insight[] = [];
  const spofs: string[] = [];

  // SLOs
  const slos: SLO[] = metrics
    ? [
        {
          name: "Success rate",
          target: DEFAULT_SLOS.successRate,
          actual: metrics.successRate,
          met: metrics.successRate >= DEFAULT_SLOS.successRate,
          direction: "higher-better",
          unit: "%",
        },
        {
          name: "P95 latency",
          target: DEFAULT_SLOS.p95LatencyMs,
          actual: metrics.p95LatencyMs,
          met: metrics.p95LatencyMs <= DEFAULT_SLOS.p95LatencyMs,
          direction: "lower-better",
          unit: "ms",
        },
        {
          name: "P99 latency",
          target: DEFAULT_SLOS.p99LatencyMs,
          actual: metrics.p99LatencyMs,
          met: metrics.p99LatencyMs <= DEFAULT_SLOS.p99LatencyMs,
          direction: "lower-better",
          unit: "ms",
        },
      ]
    : [];

  // ─────────────────────────────────────────────────────────────────
  // Architecture-level insights (work without simulation data)
  // ─────────────────────────────────────────────────────────────────
  if (nodes.length === 0) {
    return {
      insights,
      slos,
      bottleneck: { nodeId: null, saturation: 0, component: "" },
      spofs,
    };
  }

  const byType = new Map<string, ArchNode[]>();
  for (const n of nodes) {
    const arr = byType.get(n.data.type) ?? [];
    arr.push(n);
    byType.set(n.data.type, arr);
  }

  // SPOF check: any stateful component with no replication
  for (const node of nodes) {
    const type = node.data.type;
    if (type === "postgres") {
      const cfg = node.data.config as PostgresConfig;
      if (cfg.replicaCount === 0) {
        spofs.push(node.id);
        insights.push({
          id: `spof-pg-${node.id}`,
          severity: "warning",
          category: "reliability",
          nodeId: node.id,
          title: "Postgres has no replicas — single point of failure",
          description:
            "If this primary fails, the entire system goes down. There's also no read scaling.",
          recommendation: "Add 1-2 read replicas. AWS RDS Multi-AZ for HA.",
          impact: "Avoids hours of downtime in a real outage.",
        });
      }
      if (!cfg.connectionPooler && cfg.maxConnections < 200) {
        insights.push({
          id: `pool-${node.id}`,
          severity: "info",
          category: "performance",
          nodeId: node.id,
          title: "Add pgBouncer for connection pooling",
          description:
            "Without a pooler, each app process holds a connection. Beyond ~100 app instances you'll hit the connection ceiling.",
          recommendation: "Deploy pgBouncer in transaction mode.",
          impact: "10-50x more effective connections.",
        });
      }
    }
    if (type === "redis") {
      const cfg = node.data.config as RedisConfig;
      if (!cfg.clusterMode && cfg.maxMemoryMB > 32 * 1024) {
        insights.push({
          id: `redis-cluster-${node.id}`,
          severity: "warning",
          category: "capacity",
          nodeId: node.id,
          title: "Redis above 32GB without cluster mode",
          description:
            "Single-node Redis above 32GB has slow restarts, persistence becomes expensive, and you can't scale further.",
          recommendation: "Enable cluster mode (sharded).",
          impact: "Horizontal scaling and faster failover.",
        });
      }
      if (cfg.persistence === "none" && cfg.replicaCount === 0) {
        spofs.push(node.id);
        insights.push({
          id: `redis-durability-${node.id}`,
          severity: "warning",
          category: "reliability",
          nodeId: node.id,
          title: "Redis has no persistence or replicas",
          description: "A crash loses all cached data, causing a cache stampede on restart.",
          recommendation: "Enable RDB snapshots or add a replica.",
          impact: "Survives restarts without DB-overwhelming cold cache.",
        });
      }
    }
    if (type === "api-server" || type === "microservice") {
      const cfg = node.data.config as ApiServerConfig;
      if (cfg.instances < 2) {
        spofs.push(node.id);
        insights.push({
          id: `spof-api-${node.id}`,
          severity: "warning",
          category: "reliability",
          nodeId: node.id,
          title: `${cfg.label ?? type} has only 1 instance`,
          description: "Single-instance services can't survive a failure or rolling deploy.",
          recommendation: "Scale to at least 2 instances behind a load balancer.",
          impact: "Tolerates instance failure with no downtime.",
        });
      }
    }
  }

  // Check: clients but no LB / GW
  const clients = byType.get("client") ?? [];
  const lbs = byType.get("load-balancer") ?? [];
  const gws = byType.get("api-gateway") ?? [];
  if (clients.length > 0 && lbs.length === 0 && gws.length === 0 && nodes.length > 2) {
    insights.push({
      id: "no-lb",
      severity: "info",
      category: "best-practice",
      title: "No load balancer in front of services",
      description:
        "Traffic goes directly to a single instance. Adds risk and prevents horizontal scaling.",
      recommendation: "Add a Load Balancer or API Gateway.",
      impact: "HA, blue/green deploys, autoscaling.",
    });
  }

  // Check: API server talks to DB without cache
  const apiNodes = [
    ...(byType.get("api-server") ?? []),
    ...(byType.get("microservice") ?? []),
  ];
  for (const api of apiNodes) {
    const outgoing = edges.filter((e) => e.source === api.id);
    const downstreamTypes = outgoing.map(
      (e) => nodes.find((n) => n.id === e.target)?.data.type
    );
    const hasDb =
      downstreamTypes.includes("postgres") ||
      downstreamTypes.includes("nosql");
    const hasCache = downstreamTypes.includes("redis");
    if (hasDb && !hasCache) {
      insights.push({
        id: `no-cache-${api.id}`,
        severity: "info",
        category: "performance",
        nodeId: api.id,
        title: "Service hits DB without a cache layer",
        description:
          "Every read goes to the database. Hot reads dominate cost and latency.",
        recommendation: "Add a Redis cache. Even 70% hit rate halves DB load.",
        impact: "70-95% fewer DB queries, 5-10x latency improvement.",
      });
    }
  }

  // Check: queue without worker
  const queues = byType.get("queue") ?? [];
  for (const q of queues) {
    const outgoing = edges.filter((e) => e.source === q.id);
    const hasWorker = outgoing.some(
      (e) => nodes.find((n) => n.id === e.target)?.data.type === "worker"
    );
    if (!hasWorker) {
      insights.push({
        id: `queue-no-worker-${q.id}`,
        severity: "warning",
        category: "reliability",
        nodeId: q.id,
        title: "Queue has no consumer",
        description: "Messages will accumulate until the buffer is full, then be rejected.",
        recommendation: "Connect a Worker downstream of the queue.",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Runtime metrics-based insights
  // ─────────────────────────────────────────────────────────────────
  let bottleneck: AnalysisResult["bottleneck"] = {
    nodeId: null,
    saturation: 0,
    component: "",
  };

  if (metrics) {
    // Find max saturation
    for (const [id, m] of Object.entries(metrics.perComponent)) {
      const node = nodes.find((n) => n.id === id);
      if (!node || node.data.type === "client") continue;
      if ((m.saturation ?? 0) > bottleneck.saturation) {
        bottleneck = {
          nodeId: id,
          saturation: m.saturation ?? 0,
          component: node.data.config.label ?? node.data.type,
        };
      }
    }

    if (bottleneck.saturation > 0.85) {
      const sev: Insight["severity"] =
        bottleneck.saturation > 1.0 ? "critical" : "warning";
      insights.push({
        id: `bottleneck`,
        severity: sev,
        category: "bottleneck",
        nodeId: bottleneck.nodeId ?? undefined,
        title: `${bottleneck.component} is the bottleneck`,
        description: `Saturation: ${(bottleneck.saturation * 100).toFixed(
          0
        )}%. Everything upstream is held back by this.`,
        recommendation: getRecommendationForBottleneck(
          nodes.find((n) => n.id === bottleneck.nodeId)
        ),
      });
    }

    // High error rate
    if (metrics.errorRate > 0.05) {
      insights.push({
        id: "high-errors",
        severity: "critical",
        category: "reliability",
        title: `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
        description:
          "Many requests are failing. Likely cascading from the bottleneck.",
        recommendation: "Address the bottleneck above first.",
      });
    } else if (metrics.errorRate > 0.01) {
      insights.push({
        id: "elevated-errors",
        severity: "warning",
        category: "reliability",
        title: `Elevated error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
        description: "Above the 1% SLO threshold typical for web apps.",
        recommendation: "Investigate components with status != healthy.",
      });
    }

    // High P99 latency
    if (metrics.p99LatencyMs > 1000) {
      insights.push({
        id: "high-p99",
        severity: "warning",
        category: "performance",
        title: `P99 latency over 1s (${metrics.p99LatencyMs.toFixed(0)}ms)`,
        description:
          "Tail latency this high typically means a slow downstream or contention.",
        recommendation:
          "Check component p99s, add timeouts and circuit breakers, cache slow paths.",
      });
    }

    // Cost too high relative to throughput
    if (metrics.currentRps > 100 && metrics.estimatedMonthlyCost > 50000) {
      insights.push({
        id: "high-cost",
        severity: "warning",
        category: "cost",
        title: `Monthly cost estimate: $${formatMoney(
          metrics.estimatedMonthlyCost
        )}`,
        description:
          "Significant infrastructure spend. Worth a capacity review.",
        recommendation:
          "Right-size instances, use autoscaling, evaluate reserved/savings plans (-30 to -70%).",
      });
    }

    // Under-utilized components (paying for nothing)
    for (const [id, m] of Object.entries(metrics.perComponent)) {
      const node = nodes.find((n) => n.id === id);
      if (!node) continue;
      if (node.data.type === "client") continue;
      if (
        m.cpuUtilization < 0.05 &&
        m.rps < 5 &&
        (m.costPerHour ?? 0) > 0.5 &&
        metrics.currentRps > 50
      ) {
        insights.push({
          id: `underused-${id}`,
          severity: "info",
          category: "cost",
          nodeId: id,
          title: `${node.data.config.label ?? node.data.type} is barely used`,
          description: `CPU at ${(m.cpuUtilization * 100).toFixed(
            0
          )}% with ${m.rps.toFixed(0)} RPS — costing ~$${(
            (m.costPerHour ?? 0) * 730
          ).toFixed(0)}/month.`,
          recommendation: "Downsize or remove if not on the request path.",
        });
      }
    }

    // Cache hit rate quality (heuristic: if redis exists and DB is hot, cache likely missing too often)
    const cacheNodes = nodes.filter((n) => n.data.type === "redis");
    const dbNodes = nodes.filter(
      (n) => n.data.type === "postgres" || n.data.type === "nosql"
    );
    for (const c of cacheNodes) {
      const cm = metrics.perComponent[c.id];
      const cfg = c.data.config as RedisConfig;
      // Find DBs the cache fronts
      const apiUpstream = edges
        .filter((e) => e.target === c.id)
        .map((e) => e.source);
      const sharedDownstreamDbs = dbNodes.filter((db) =>
        edges.some(
          (e) => e.target === db.id && apiUpstream.includes(e.source)
        )
      );
      if (sharedDownstreamDbs.length > 0 && cfg.hitRate < 0.7 && cm?.rps > 10) {
        insights.push({
          id: `low-cache-hit-${c.id}`,
          severity: "info",
          category: "performance",
          nodeId: c.id,
          title: `Cache hit rate only ${(cfg.hitRate * 100).toFixed(0)}%`,
          description:
            "Most requests still fall through to the database. Cache is providing limited value.",
          recommendation:
            "Increase TTL, audit keying strategy, pre-warm hot keys.",
          impact: "Each 10% hit-rate increase ~halves remaining DB load.",
        });
      }
    }
  }

  return {
    insights: dedupe(insights),
    slos,
    bottleneck,
    spofs,
  };
}

function dedupe(insights: Insight[]): Insight[] {
  const seen = new Set<string>();
  return insights.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

function getRecommendationForBottleneck(node?: ArchNode): string {
  if (!node) return "Add capacity to the bottlenecked component.";
  switch (node.data.type) {
    case "postgres":
      return "Add read replicas, enable connection pooler (pgBouncer), upgrade instance, or add a cache.";
    case "redis":
      return "Enable cluster mode (sharding), add replicas, or increase memory.";
    case "api-server":
    case "microservice":
      return "Add instances (horizontal scale), increase maxConcurrentRequests, or enable autoscaling.";
    case "load-balancer":
      return "Increase LB capacity, move to a larger SKU, or use anycast (e.g. AWS Global Accelerator).";
    case "api-gateway":
      return "Scale gateway instances, relax per-client rate limits, or move auth to a sidecar.";
    case "queue":
      return "Increase consumer count (worker autoscaling on queue depth), add partitions for parallelism.";
    case "worker":
      return "Scale worker instances, increase concurrency per worker, or batch jobs.";
    case "nosql":
      return "Increase provisioned capacity, repartition to avoid hot keys.";
    case "search":
      return "Add nodes, increase shards (carefully), or move heavy aggregations to a warehouse.";
    case "auth-service":
      return "Increase token cache hit rate, scale instances, or cache JWKS.";
    case "websocket":
      return "Add WS server instances; memory per connection is the limit.";
    default:
      return "Increase capacity or replicas.";
  }
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
