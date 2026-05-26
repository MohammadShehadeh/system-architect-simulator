import type { Edge, Node } from "@xyflow/react";

import {
  DEFAULT_CONFIGS,
  type ComponentConfig,
  type ComponentNodeData,
  type ComponentType,
} from "./types";
import { uid } from "@/lib/utils";

export type TemplateCategory =
  | "starter"
  | "social"
  | "ecommerce"
  | "video"
  | "fintech"
  | "messaging"
  | "iot"
  | "ml"
  | "saas";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  /** Short tagline */
  tagline: string;
  /** Detailed description of what this architecture is for and how it works */
  description: string;
  /** Companies that use a similar architecture */
  inspiredBy: string[];
  /** Key architectural decisions and trade-offs */
  keyConcepts: string[];
  /** Suggested traffic profile to test with */
  recommendedLoad: {
    pattern: "constant" | "ramp" | "spike" | "wave" | "black-friday" | "viral" | "daily";
    multiplier: number;
    description: string;
  };
  /** What scaling challenges this architecture addresses */
  scalingPoints: string[];
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
}

type NodeSpec = {
  type: ComponentType;
  x: number;
  y: number;
  overrides?: Partial<ComponentConfig>;
  /** Stable handle within the template so edges can reference */
  ref: string;
};

type EdgeSpec = { from: string; to: string };

function buildTemplate(
  meta: Omit<Template, "nodes" | "edges">,
  nodeSpecs: NodeSpec[],
  edgeSpecs: EdgeSpec[]
): Template {
  const idByRef = new Map<string, string>();
  const nodes: Node<ComponentNodeData>[] = nodeSpecs.map((spec) => {
    const id = uid(spec.type);
    idByRef.set(spec.ref, id);
    const config: ComponentConfig = {
      ...DEFAULT_CONFIGS[spec.type],
      ...(spec.overrides ?? {}),
    } as ComponentConfig;
    return {
      id,
      type: "component",
      position: { x: spec.x, y: spec.y },
      data: { type: spec.type, config },
    };
  });
  const edges: Edge[] = edgeSpecs.map((e) => ({
    id: uid("edge"),
    source: idByRef.get(e.from)!,
    target: idByRef.get(e.to)!,
    type: "default",
    animated: false,
  }));
  return { ...meta, nodes, edges };
}

const COL = 280;
const ROW = 160;

export const TEMPLATES: Template[] = [
  // ─────────────────────────────────────────────────────────────────
  // Starter templates
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "starter-monolith",
      name: "Monolith",
      category: "starter",
      tagline: "Single API, single database — the simplest viable stack.",
      description:
        "Classic 3-tier app: client → API server → relational database. Easy to build and operate. Scales vertically until the DB or single server saturates. Works great up to ~1000 RPS.",
      inspiredBy: ["Basecamp", "Stack Overflow (early)", "GitHub (pre-microservices)"],
      keyConcepts: [
        "Stateless API can be replicated, but a single DB caps writes.",
        "No cache → every read hits the DB.",
        "No load balancer → single instance is a SPOF.",
      ],
      recommendedLoad: {
        pattern: "ramp",
        multiplier: 1,
        description: "Ramp from 100 to 1000 RPS to find the DB bottleneck.",
      },
      scalingPoints: [
        "Add Redis to cache reads",
        "Add a Load Balancer + extra API instances",
        "Add Postgres read replicas",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW, overrides: { rps: 200, readRatio: 0.8 } },
      { ref: "api", type: "api-server", x: COL, y: ROW, overrides: { instances: 1 } },
      { ref: "db", type: "postgres", x: COL * 2, y: ROW },
    ],
    [
      { from: "client", to: "api" },
      { from: "api", to: "db" },
    ]
  ),

  buildTemplate(
    {
      id: "starter-cached",
      name: "Cached Web App",
      category: "starter",
      tagline: "LB + cache + DB — the workhorse architecture.",
      description:
        "The bread-and-butter web app: load balancer fronting multiple API instances, Redis cache absorbing 85%+ of reads, Postgres handling the rest. Scales to 10k+ RPS without major changes.",
      inspiredBy: ["Reddit (mid-2010s)", "Most SaaS apps", "Shopify (storefront layer)"],
      keyConcepts: [
        "Cache-aside: API checks Redis first, falls back to DB on miss, then populates cache.",
        "Load balancer enables horizontal scaling and HA.",
        "Read replicas (when added) offload analytic reads.",
      ],
      recommendedLoad: {
        pattern: "wave",
        multiplier: 2,
        description: "Daily traffic wave at 2x. Cache should shield the DB.",
      },
      scalingPoints: [
        "Increase Redis hit rate (longer TTLs, smarter keys)",
        "Add CDN in front for static assets",
        "Split into read replicas as DB CPU climbs",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW, overrides: { rps: 500 } },
      { ref: "lb", type: "load-balancer", x: COL, y: ROW },
      { ref: "api", type: "api-server", x: COL * 2, y: ROW, overrides: { instances: 3 } },
      { ref: "cache", type: "redis", x: COL * 3, y: ROW - 100, overrides: { hitRate: 0.88 } },
      { ref: "db", type: "postgres", x: COL * 3, y: ROW + 100 },
    ],
    [
      { from: "client", to: "lb" },
      { from: "lb", to: "api" },
      { from: "api", to: "cache" },
      { from: "api", to: "db" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // Social — Twitter / X-style timeline
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "social-feed",
      name: "Social Feed (Twitter-style)",
      category: "social",
      tagline: "Read-heavy timeline with fan-out-on-write via cache.",
      description:
        "Optimized for the read-heavy 'home timeline' problem. When a user posts, a worker fans the post out to followers' timeline caches in Redis. Reads hit cache directly (sub-ms). Search lives in a separate index for the explore tab.",
      inspiredBy: ["Twitter / X", "Instagram", "Mastodon (federated variants)"],
      keyConcepts: [
        "Fan-out-on-write: cost is paid by the writer (post), not readers.",
        "Reads are O(1) cache hits — the most read user (celebrity) is the same cost as anyone else.",
        "Tradeoff: heavy fan-out for accounts with millions of followers (celebrity problem).",
        "Separate search index (Elasticsearch) for full-text.",
      ],
      recommendedLoad: {
        pattern: "viral",
        multiplier: 3,
        description: "Sudden viral spike — tests cache and fan-out queue capacity.",
      },
      scalingPoints: [
        "Hybrid fan-out: push for normal users, pull for celebrities",
        "Sharded Redis cluster for timeline storage",
        "Worker autoscaling on queue depth",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 2000, readRatio: 0.95, geography: "global" } },
      { ref: "cdn", type: "cdn", x: COL, y: ROW * 2, overrides: { hitRate: 0.6 } },
      { ref: "gw", type: "api-gateway", x: COL * 2, y: ROW * 2 },
      { ref: "tl", type: "microservice", x: COL * 3, y: ROW, overrides: { label: "Timeline Svc", instances: 8 } },
      { ref: "post", type: "microservice", x: COL * 3, y: ROW * 2, overrides: { label: "Post Svc", instances: 4 } },
      { ref: "search", type: "microservice", x: COL * 3, y: ROW * 3, overrides: { label: "Search Svc", instances: 4 } },
      { ref: "cache", type: "redis", x: COL * 4, y: ROW, overrides: { clusterMode: true, maxMemoryMB: 32768, hitRate: 0.95 } },
      { ref: "queue", type: "queue", x: COL * 4, y: ROW * 2, overrides: { maxThroughputRps: 50000, label: "Fan-out Queue" } },
      { ref: "es", type: "search", x: COL * 4, y: ROW * 3 },
      { ref: "worker", type: "worker", x: COL * 5, y: ROW * 2, overrides: { instances: 10, label: "Fan-out Worker" } },
      { ref: "db", type: "postgres", x: COL * 5, y: ROW * 1.2, overrides: { replicaCount: 3, connectionPooler: true } },
    ],
    [
      { from: "client", to: "cdn" },
      { from: "cdn", to: "gw" },
      { from: "gw", to: "tl" },
      { from: "gw", to: "post" },
      { from: "gw", to: "search" },
      { from: "tl", to: "cache" },
      { from: "post", to: "queue" },
      { from: "post", to: "db" },
      { from: "search", to: "es" },
      { from: "queue", to: "worker" },
      { from: "worker", to: "cache" },
      { from: "worker", to: "db" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // Ecommerce — Amazon-style
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "ecommerce-marketplace",
      name: "E-commerce Marketplace",
      category: "ecommerce",
      tagline: "Catalog, search, cart, and orders — built for Black Friday.",
      description:
        "Multi-service e-commerce backend. Catalog is read-heavy (cached aggressively). Search powers product discovery. Cart lives in Redis for low-latency updates. Orders go through a queue for reliable processing. Designed to handle 10x normal load on peak days.",
      inspiredBy: ["Amazon", "Shopify", "eBay"],
      keyConcepts: [
        "Read/write separation: catalog reads vs order writes have very different patterns.",
        "Cart in Redis with TTL — no need for durable storage during a session.",
        "Orders go async via queue — the user sees 'pending' but workers handle inventory, payment, fulfillment.",
        "CDN serves product images (object storage origin).",
      ],
      recommendedLoad: {
        pattern: "black-friday",
        multiplier: 5,
        description: "Black Friday spike: 5x traffic over 30s, sustained for the test.",
      },
      scalingPoints: [
        "Inventory consistency under concurrent purchases (oversell risk)",
        "Search index update lag during catalog changes",
        "Payment service is the throughput ceiling",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 3000, readRatio: 0.9, geography: "global" } },
      { ref: "cdn", type: "cdn", x: COL, y: ROW * 2, overrides: { hitRate: 0.85, edgeLocations: 200 } },
      { ref: "gw", type: "api-gateway", x: COL * 2, y: ROW * 2, overrides: { authEnabled: true, maxRps: 50000 } },
      { ref: "catalog", type: "microservice", x: COL * 3, y: ROW * 0.5, overrides: { label: "Catalog Svc", instances: 6 } },
      { ref: "search", type: "microservice", x: COL * 3, y: ROW * 1.5, overrides: { label: "Search Svc", instances: 4 } },
      { ref: "cart", type: "microservice", x: COL * 3, y: ROW * 2.5, overrides: { label: "Cart Svc", instances: 4 } },
      { ref: "order", type: "microservice", x: COL * 3, y: ROW * 3.5, overrides: { label: "Order Svc", instances: 4 } },
      { ref: "cache", type: "redis", x: COL * 4, y: ROW, overrides: { clusterMode: true, hitRate: 0.92, maxMemoryMB: 16384 } },
      { ref: "es", type: "search", x: COL * 4, y: ROW * 1.7, overrides: { nodes: 6, shards: 12 } },
      { ref: "cartCache", type: "redis", x: COL * 4, y: ROW * 2.5, overrides: { label: "Cart Cache", maxMemoryMB: 8192, persistence: "aof" } },
      { ref: "queue", type: "queue", x: COL * 4, y: ROW * 3.5, overrides: { label: "Order Queue", durable: true } },
      { ref: "imgs", type: "object-storage", x: COL * 4, y: ROW * 4.5, overrides: { storageGB: 50000 } },
      { ref: "db", type: "postgres", x: COL * 5, y: ROW, overrides: { replicaCount: 5, connectionPooler: true, maxConnections: 200 } },
      { ref: "ordersDb", type: "postgres", x: COL * 5, y: ROW * 3.5, overrides: { label: "Orders DB", connectionPooler: true } },
      { ref: "worker", type: "worker", x: COL * 5, y: ROW * 4.3, overrides: { label: "Order Worker", instances: 8 } },
    ],
    [
      { from: "client", to: "cdn" },
      { from: "cdn", to: "gw" },
      { from: "cdn", to: "imgs" },
      { from: "gw", to: "catalog" },
      { from: "gw", to: "search" },
      { from: "gw", to: "cart" },
      { from: "gw", to: "order" },
      { from: "catalog", to: "cache" },
      { from: "catalog", to: "db" },
      { from: "search", to: "es" },
      { from: "cart", to: "cartCache" },
      { from: "order", to: "queue" },
      { from: "order", to: "ordersDb" },
      { from: "queue", to: "worker" },
      { from: "worker", to: "ordersDb" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // Video — Netflix-style
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "video-streaming",
      name: "Video Streaming (Netflix-style)",
      category: "video",
      tagline: "Edge-cached video chunks + personalized recommendations.",
      description:
        "Most traffic is video chunks served from edge CDN (Open Connect equivalent). API traffic is a tiny fraction. Recommendation service personalizes the home screen using a ML model served via a microservice. Encoded video lives in object storage.",
      inspiredBy: ["Netflix", "YouTube", "Disney+", "Hulu"],
      keyConcepts: [
        "Video bytes dominate — CDN absorbs 99%+ of bandwidth.",
        "API is for browse/play/pause — modest QPS.",
        "Recommendation is precomputed offline, served from cache.",
        "Multi-region for low playback latency globally.",
      ],
      recommendedLoad: {
        pattern: "daily",
        multiplier: 2,
        description: "Evening peak — most users watching simultaneously.",
      },
      scalingPoints: [
        "CDN cache hit rate determines origin egress cost",
        "Recommendation pre-compute keeps API path fast",
        "Multi-region for global users",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 5000, readRatio: 0.99, geography: "global" } },
      { ref: "cdn", type: "cdn", x: COL, y: ROW * 2, overrides: { hitRate: 0.95, edgeLocations: 1000, ttlSeconds: 86400 } },
      { ref: "gw", type: "api-gateway", x: COL * 2, y: ROW * 2 },
      { ref: "browse", type: "microservice", x: COL * 3, y: ROW, overrides: { label: "Browse Svc", instances: 6 } },
      { ref: "playback", type: "microservice", x: COL * 3, y: ROW * 2, overrides: { label: "Playback Svc", instances: 4 } },
      { ref: "reco", type: "microservice", x: COL * 3, y: ROW * 3, overrides: { label: "Recommendation Svc", instances: 8 } },
      { ref: "cache", type: "redis", x: COL * 4, y: ROW, overrides: { clusterMode: true, hitRate: 0.92, maxMemoryMB: 65536 } },
      { ref: "videos", type: "object-storage", x: COL * 4, y: ROW * 2, overrides: { storageGB: 5000000, multiRegion: true } },
      { ref: "recoCache", type: "redis", x: COL * 4, y: ROW * 3, overrides: { label: "Reco Cache", maxMemoryMB: 32768, hitRate: 0.98 } },
      { ref: "db", type: "nosql", x: COL * 5, y: ROW, overrides: { label: "User/Catalog DB", readCapacity: 50000, writeCapacity: 5000 } },
      { ref: "warehouse", type: "data-warehouse", x: COL * 5, y: ROW * 3, overrides: { computeUnits: 16 } },
    ],
    [
      { from: "client", to: "cdn" },
      { from: "cdn", to: "videos" },
      { from: "cdn", to: "gw" },
      { from: "gw", to: "browse" },
      { from: "gw", to: "playback" },
      { from: "gw", to: "reco" },
      { from: "browse", to: "cache" },
      { from: "browse", to: "db" },
      { from: "playback", to: "db" },
      { from: "reco", to: "recoCache" },
      { from: "reco", to: "warehouse" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // Fintech — Payment processor
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "fintech-payments",
      name: "Payment Processor (Stripe-style)",
      category: "fintech",
      tagline: "ACID payments with async webhook delivery.",
      description:
        "Strong-consistency payment processing. Every charge is a Postgres transaction. Webhooks to merchants go through a durable queue with retries. Auth is API key-based with per-account rate limits. Fraud-check service runs synchronously in the request path.",
      inspiredBy: ["Stripe", "Adyen", "Square", "Braintree"],
      keyConcepts: [
        "Postgres for the ledger — ACID is non-negotiable for money.",
        "Idempotency keys prevent double-charges (stored in Redis).",
        "Webhooks are async via queue — retries with exponential backoff.",
        "Per-account rate limiting in API Gateway.",
      ],
      recommendedLoad: {
        pattern: "constant",
        multiplier: 1,
        description: "Steady write-heavy load. DB connection limits matter.",
      },
      scalingPoints: [
        "DB write throughput is the ultimate ceiling",
        "Webhook backlog under merchant outages",
        "Fraud check latency directly hits API P99",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 1000, readRatio: 0.4 } },
      { ref: "gw", type: "api-gateway", x: COL, y: ROW * 2, overrides: { authEnabled: true, rateLimitPerClient: 100 } },
      { ref: "auth", type: "auth-service", x: COL * 2, y: ROW, overrides: { label: "API Key Svc", tokenCacheHitRate: 0.99 } },
      { ref: "charges", type: "microservice", x: COL * 2, y: ROW * 2, overrides: { label: "Charges Svc", instances: 6, circuitBreakerEnabled: true } },
      { ref: "fraud", type: "microservice", x: COL * 2, y: ROW * 3, overrides: { label: "Fraud Svc", instances: 4 } },
      { ref: "idem", type: "redis", x: COL * 3, y: ROW * 0.5, overrides: { label: "Idempotency Cache", persistence: "aof" } },
      { ref: "ledger", type: "postgres", x: COL * 3, y: ROW * 2, overrides: { label: "Ledger DB", connectionPooler: true, replicaCount: 2, maxConnections: 200 } },
      { ref: "fraudDb", type: "nosql", x: COL * 3, y: ROW * 3, overrides: { label: "Fraud Signals", consistency: "eventual" } },
      { ref: "queue", type: "queue", x: COL * 3, y: ROW * 4, overrides: { label: "Webhook Queue", durable: true, bufferSize: 1000000 } },
      { ref: "worker", type: "worker", x: COL * 4, y: ROW * 4, overrides: { label: "Webhook Worker", instances: 12, jobsPerSecondPerWorker: 30 } },
    ],
    [
      { from: "client", to: "gw" },
      { from: "gw", to: "auth" },
      { from: "gw", to: "charges" },
      { from: "charges", to: "idem" },
      { from: "charges", to: "ledger" },
      { from: "charges", to: "fraud" },
      { from: "fraud", to: "fraudDb" },
      { from: "charges", to: "queue" },
      { from: "queue", to: "worker" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // Ride-sharing — Uber-style
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "ride-sharing",
      name: "Ride-Sharing (Uber-style)",
      category: "saas",
      tagline: "Real-time driver matching with geospatial queries.",
      description:
        "Two clients (rider + driver) connect via WebSocket for real-time location updates. Dispatch service matches riders to nearby drivers using a geospatial index. Trip state lives in NoSQL for scale. Pricing is computed on-the-fly per trip.",
      inspiredBy: ["Uber", "Lyft", "DoorDash (driver matching)"],
      keyConcepts: [
        "WebSocket for real-time location updates from drivers.",
        "Redis geohash for 'find drivers within X km' in O(log n).",
        "Trip lifecycle in NoSQL — scales to millions of concurrent trips.",
        "Async pricing & fraud — never block the trip start.",
      ],
      recommendedLoad: {
        pattern: "wave",
        multiplier: 3,
        description: "Rush hour wave — driver supply meets rider demand.",
      },
      scalingPoints: [
        "Geospatial index sharding by city/region",
        "WebSocket sticky sessions and reconnect storms",
        "Cross-region for international expansion",
      ],
    },
    [
      { ref: "rider", type: "client", x: 0, y: ROW, overrides: { label: "Riders", rps: 500, readRatio: 0.5 } },
      { ref: "driver", type: "client", x: 0, y: ROW * 3, overrides: { label: "Drivers", rps: 200, readRatio: 0.3 } },
      { ref: "lb", type: "load-balancer", x: COL, y: ROW * 2 },
      { ref: "ws", type: "websocket", x: COL * 2, y: ROW * 3, overrides: { instances: 6, maxConnectionsPerInstance: 50000 } },
      { ref: "gw", type: "api-gateway", x: COL * 2, y: ROW * 1.5 },
      { ref: "dispatch", type: "microservice", x: COL * 3, y: ROW, overrides: { label: "Dispatch Svc", instances: 10, baseLatencyMs: 30 } },
      { ref: "trip", type: "microservice", x: COL * 3, y: ROW * 2, overrides: { label: "Trip Svc", instances: 6 } },
      { ref: "pricing", type: "microservice", x: COL * 3, y: ROW * 3, overrides: { label: "Pricing Svc", instances: 4 } },
      { ref: "geo", type: "redis", x: COL * 4, y: ROW, overrides: { label: "Geo Index", clusterMode: true, hitRate: 0.99, maxMemoryMB: 16384 } },
      { ref: "trips", type: "nosql", x: COL * 4, y: ROW * 2, overrides: { label: "Trips DB", readCapacity: 20000, writeCapacity: 10000 } },
      { ref: "queue", type: "queue", x: COL * 4, y: ROW * 3, overrides: { label: "Pricing Queue" } },
      { ref: "users", type: "postgres", x: COL * 5, y: ROW * 1.5, overrides: { label: "Users DB", replicaCount: 2 } },
      { ref: "worker", type: "worker", x: COL * 5, y: ROW * 3, overrides: { label: "Pricing Worker", instances: 4 } },
    ],
    [
      { from: "rider", to: "lb" },
      { from: "driver", to: "lb" },
      { from: "lb", to: "ws" },
      { from: "lb", to: "gw" },
      { from: "gw", to: "dispatch" },
      { from: "gw", to: "trip" },
      { from: "gw", to: "pricing" },
      { from: "ws", to: "geo" },
      { from: "dispatch", to: "geo" },
      { from: "dispatch", to: "trips" },
      { from: "trip", to: "trips" },
      { from: "trip", to: "users" },
      { from: "pricing", to: "queue" },
      { from: "queue", to: "worker" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // Messaging — Slack-style
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "messaging-realtime",
      name: "Realtime Messaging (Slack-style)",
      category: "messaging",
      tagline: "Persistent WebSocket per user with channel fan-out.",
      description:
        "Each active user holds a WebSocket connection. Messages are persisted to a database, then fanned out via pub/sub to all WebSocket servers holding subscribers. Search index is updated async for message search.",
      inspiredBy: ["Slack", "Discord", "Microsoft Teams", "WhatsApp Web"],
      keyConcepts: [
        "Persistent WebSocket connections (memory-bound).",
        "Pub/sub fan-out across WS servers (one user is on one server, channel members on many).",
        "Async search indexing — typing fast, search slightly behind.",
        "Presence state in Redis (online/away/dnd).",
      ],
      recommendedLoad: {
        pattern: "wave",
        multiplier: 2,
        description: "Workday wave — bursty during work hours.",
      },
      scalingPoints: [
        "Connection count per WS server (memory limit)",
        "Pub/sub throughput for large channels",
        "Database writes for message history",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 1500, readRatio: 0.6 } },
      { ref: "lb", type: "load-balancer", x: COL, y: ROW * 2, overrides: { algorithm: "ip-hash" } },
      { ref: "ws", type: "websocket", x: COL * 2, y: ROW * 1.5, overrides: { instances: 8, maxConnectionsPerInstance: 30000 } },
      { ref: "api", type: "api-server", x: COL * 2, y: ROW * 3, overrides: { instances: 4 } },
      { ref: "auth", type: "auth-service", x: COL * 3, y: ROW * 0.5 },
      { ref: "presence", type: "redis", x: COL * 3, y: ROW * 1.5, overrides: { label: "Presence", maxMemoryMB: 8192 } },
      { ref: "pubsub", type: "queue", x: COL * 3, y: ROW * 2.5, overrides: { label: "Pub/Sub Bus", maxThroughputRps: 100000 } },
      { ref: "db", type: "postgres", x: COL * 3, y: ROW * 3.5, overrides: { label: "Messages DB", connectionPooler: true, replicaCount: 2 } },
      { ref: "search", type: "search", x: COL * 4, y: ROW * 3.5, overrides: { nodes: 5 } },
      { ref: "files", type: "object-storage", x: COL * 4, y: ROW * 4.5, overrides: { storageGB: 100000 } },
      { ref: "indexer", type: "worker", x: COL * 4, y: ROW * 2.5, overrides: { label: "Index Worker", instances: 4 } },
    ],
    [
      { from: "client", to: "lb" },
      { from: "lb", to: "ws" },
      { from: "lb", to: "api" },
      { from: "api", to: "auth" },
      { from: "ws", to: "presence" },
      { from: "ws", to: "pubsub" },
      { from: "api", to: "db" },
      { from: "api", to: "files" },
      { from: "api", to: "pubsub" },
      { from: "pubsub", to: "indexer" },
      { from: "indexer", to: "search" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // IoT / Analytics ingestion
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "iot-ingestion",
      name: "IoT Data Ingestion",
      category: "iot",
      tagline: "Millions of devices, telemetry to warehouse.",
      description:
        "Massive write throughput from devices. Ingest via API → queue → workers process and store in NoSQL for recent data and warehouse for historical analytics. Dashboards read from a pre-aggregated cache.",
      inspiredBy: ["Tesla telemetry", "Ring/Nest devices", "Industrial IoT (Honeywell)"],
      keyConcepts: [
        "Producers (devices) >> consumers — queue smooths bursts.",
        "Hot path: recent data in NoSQL for real-time dashboards.",
        "Cold path: warehouse for analytics and ML training.",
        "Dashboard queries hit a pre-aggregated cache, not raw data.",
      ],
      recommendedLoad: {
        pattern: "constant",
        multiplier: 1,
        description: "Sustained high write throughput.",
      },
      scalingPoints: [
        "Queue partitioning for parallel consumption",
        "NoSQL hot partition risk if device IDs aren't well distributed",
        "Warehouse compute cost vs latency tradeoff",
      ],
    },
    [
      { ref: "devices", type: "client", x: 0, y: ROW * 2, overrides: { label: "Devices", rps: 10000, readRatio: 0.1 } },
      { ref: "lb", type: "load-balancer", x: COL, y: ROW * 2, overrides: { maxRps: 100000 } },
      { ref: "ingest", type: "api-server", x: COL * 2, y: ROW * 2, overrides: { label: "Ingest API", instances: 12, baseLatencyMs: 5 } },
      { ref: "queue", type: "queue", x: COL * 3, y: ROW * 2, overrides: { maxThroughputRps: 200000, durable: true, bufferSize: 10000000 } },
      { ref: "hot", type: "worker", x: COL * 4, y: ROW, overrides: { label: "Hot Path Worker", instances: 10, jobsPerSecondPerWorker: 1000 } },
      { ref: "cold", type: "worker", x: COL * 4, y: ROW * 3, overrides: { label: "Cold Path Worker", instances: 4, jobsPerSecondPerWorker: 5000 } },
      { ref: "nosql", type: "nosql", x: COL * 5, y: ROW, overrides: { writeCapacity: 100000, partitions: 32 } },
      { ref: "warehouse", type: "data-warehouse", x: COL * 5, y: ROW * 3, overrides: { computeUnits: 32 } },
      { ref: "dashApi", type: "api-server", x: COL * 5, y: ROW * 2, overrides: { label: "Dashboard API", instances: 3 } },
      { ref: "dashCache", type: "redis", x: COL * 6, y: ROW * 2, overrides: { label: "Dashboard Cache", maxMemoryMB: 16384, hitRate: 0.97 } },
    ],
    [
      { from: "devices", to: "lb" },
      { from: "lb", to: "ingest" },
      { from: "ingest", to: "queue" },
      { from: "queue", to: "hot" },
      { from: "queue", to: "cold" },
      { from: "hot", to: "nosql" },
      { from: "cold", to: "warehouse" },
      { from: "dashApi", to: "dashCache" },
      { from: "dashApi", to: "nosql" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // ML inference platform
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "ml-inference",
      name: "ML Inference Platform",
      category: "ml",
      tagline: "Cached predictions + model serving + feature store.",
      description:
        "Serves real-time predictions. Feature store provides input features. Model server runs the actual model. Cache short-lived predictions for hot inputs. Async feedback loop logs predictions for retraining.",
      inspiredBy: ["OpenAI API", "Hugging Face Inference", "Internal ML platforms at Uber/Netflix"],
      keyConcepts: [
        "Models are slow (10-500ms) — cache predictions when inputs are similar.",
        "Feature store: pre-computed features served from low-latency KV store.",
        "Async logging for retraining (don't block on training infra).",
        "GPU-backed model servers are expensive — autoscale aggressively.",
      ],
      recommendedLoad: {
        pattern: "spike",
        multiplier: 2,
        description: "Spiky inference load — tests model server scaling.",
      },
      scalingPoints: [
        "Model server cost (GPU-hours) vs prediction cache hit rate",
        "Feature store latency budget (must be <10ms)",
        "Training data lake growth",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 1000 } },
      { ref: "gw", type: "api-gateway", x: COL, y: ROW * 2 },
      { ref: "infer", type: "microservice", x: COL * 2, y: ROW * 2, overrides: { label: "Inference Svc", instances: 6 } },
      { ref: "predCache", type: "redis", x: COL * 3, y: ROW, overrides: { label: "Prediction Cache", hitRate: 0.6, maxMemoryMB: 16384 } },
      { ref: "features", type: "nosql", x: COL * 3, y: ROW * 2, overrides: { label: "Feature Store", readCapacity: 20000, baseLatencyMs: 3 } },
      { ref: "model", type: "microservice", x: COL * 3, y: ROW * 3, overrides: { label: "Model Server (GPU)", instances: 4, baseLatencyMs: 80, cpuCores: 4, memoryGB: 16 } },
      { ref: "logQueue", type: "queue", x: COL * 4, y: ROW * 2 },
      { ref: "lake", type: "object-storage", x: COL * 5, y: ROW * 2, overrides: { label: "Training Lake", storageGB: 500000 } },
      { ref: "logger", type: "worker", x: COL * 5, y: ROW * 3, overrides: { label: "Logger Worker", instances: 3 } },
    ],
    [
      { from: "client", to: "gw" },
      { from: "gw", to: "infer" },
      { from: "infer", to: "predCache" },
      { from: "infer", to: "features" },
      { from: "infer", to: "model" },
      { from: "infer", to: "logQueue" },
      { from: "logQueue", to: "logger" },
      { from: "logger", to: "lake" },
    ]
  ),

  // ─────────────────────────────────────────────────────────────────
  // SaaS multi-tenant
  // ─────────────────────────────────────────────────────────────────
  buildTemplate(
    {
      id: "saas-multitenant",
      name: "Multi-tenant SaaS",
      category: "saas",
      tagline: "Per-tenant data isolation with shared infrastructure.",
      description:
        "Standard B2B SaaS: shared infra but per-tenant data isolation. Auth identifies tenant; routing layer adds tenant context. Cache and DB are partitioned by tenant. Background jobs per tenant.",
      inspiredBy: ["Notion", "Linear", "Datadog", "Salesforce"],
      keyConcepts: [
        "Tenant ID injected from auth — every query filters by it.",
        "Cache keys prefixed with tenant ID for isolation.",
        "Per-tenant rate limits prevent noisy neighbors.",
        "Background work (reports, integrations) on a queue.",
      ],
      recommendedLoad: {
        pattern: "daily",
        multiplier: 1.5,
        description: "Workday usage pattern with morning peak.",
      },
      scalingPoints: [
        "Noisy neighbor problem (one big tenant impacts others)",
        "Per-tenant data export / report jobs",
        "Schema migrations across all tenant data",
      ],
    },
    [
      { ref: "client", type: "client", x: 0, y: ROW * 2, overrides: { rps: 800 } },
      { ref: "cdn", type: "cdn", x: COL, y: ROW * 2, overrides: { hitRate: 0.5 } },
      { ref: "gw", type: "api-gateway", x: COL * 2, y: ROW * 2, overrides: { authEnabled: true, rateLimitPerClient: 200 } },
      { ref: "auth", type: "auth-service", x: COL * 3, y: ROW },
      { ref: "api", type: "api-server", x: COL * 3, y: ROW * 2, overrides: { instances: 5 } },
      { ref: "cache", type: "redis", x: COL * 4, y: ROW, overrides: { clusterMode: true } },
      { ref: "db", type: "postgres", x: COL * 4, y: ROW * 2, overrides: { connectionPooler: true, replicaCount: 2 } },
      { ref: "queue", type: "queue", x: COL * 4, y: ROW * 3, overrides: { label: "Jobs Queue" } },
      { ref: "search", type: "search", x: COL * 5, y: ROW * 1, overrides: { nodes: 3 } },
      { ref: "worker", type: "worker", x: COL * 5, y: ROW * 3, overrides: { instances: 4 } },
      { ref: "files", type: "object-storage", x: COL * 5, y: ROW * 4, overrides: { storageGB: 10000 } },
    ],
    [
      { from: "client", to: "cdn" },
      { from: "cdn", to: "gw" },
      { from: "gw", to: "auth" },
      { from: "gw", to: "api" },
      { from: "api", to: "cache" },
      { from: "api", to: "db" },
      { from: "api", to: "search" },
      { from: "api", to: "queue" },
      { from: "api", to: "files" },
      { from: "queue", to: "worker" },
      { from: "worker", to: "db" },
    ]
  ),
];

export const TEMPLATES_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
);

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "starter", label: "Starter" },
  { id: "social", label: "Social" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "video", label: "Video" },
  { id: "fintech", label: "Fintech" },
  { id: "messaging", label: "Messaging" },
  { id: "iot", label: "IoT" },
  { id: "ml", label: "ML" },
  { id: "saas", label: "SaaS" },
];

/**
 * Clone a template's nodes/edges with fresh IDs so multiple instances don't collide.
 */
export function cloneTemplate(template: Template): {
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
} {
  const idMap = new Map<string, string>();
  const nodes = template.nodes.map((n) => {
    const newId = uid(n.data.type);
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      data: {
        ...n.data,
        config: { ...n.data.config },
      },
    };
  });
  const edges = template.edges.map((e) => ({
    ...e,
    id: uid("edge"),
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
  }));
  return { nodes, edges };
}
