import type { ComponentType } from "./types";

export interface ComponentDoc {
  title: string;
  oneLine: string;
  whatItDoes: string;
  whenToUse: string[];
  whenNotToUse: string[];
  realWorldExamples: string[];
  commonPitfalls: string[];
  /** Key configuration knobs and what they do */
  configHelp: Record<string, string>;
  /** Approximate cost model in USD/month at given load */
  costModel: string;
  /** Typical latency budget contribution */
  typicalLatency: string;
  /** Capacity rule of thumb */
  capacity: string;
}

export const COMPONENT_DOCS: Record<ComponentType, ComponentDoc> = {
  client: {
    title: "Client",
    oneLine: "Where traffic originates — users, mobile apps, services.",
    whatItDoes:
      "Represents the source of requests entering your system. In production this is browsers, native mobile apps, partner APIs, or upstream services. The simulator uses Clients to drive RPS, read/write mix, and geographic distribution.",
    whenToUse: [
      "Every architecture needs at least one Client to generate traffic.",
      "Model multiple Clients to simulate different user segments (web vs mobile vs API partners).",
    ],
    whenNotToUse: [
      "Don't use Client for internal service-to-service traffic — use the actual upstream service instead.",
    ],
    realWorldExamples: [
      "Browser users hitting a website (high read ratio, ~70-90%)",
      "Mobile apps with offline sync (bursts of writes when reconnecting)",
      "B2B partners calling your API (steadier load, lower volume)",
    ],
    commonPitfalls: [
      "Underestimating peak RPS — design for 3-10x average load",
      "Ignoring geography — global users add 50-200ms baseline latency",
    ],
    configHelp: {
      rps: "Sustained requests/second this client population generates.",
      readRatio: "Fraction of requests that are reads (0-1). Most consumer apps are 80-90% reads.",
      geography: "Where users are. Multi-region adds ~100ms; global adds ~200ms baseline.",
    },
    costModel: "No direct cost — clients are the demand side.",
    typicalLatency: "+0-200ms (network from user to edge)",
    capacity: "Unlimited demand — your system's limits determine throughput.",
  },

  cdn: {
    title: "CDN (Content Delivery Network)",
    oneLine: "Edge caches that serve content from locations near users.",
    whatItDoes:
      "Caches HTTP responses (static assets, sometimes API responses) at hundreds of edge POPs worldwide. Requests are answered at the edge if cached, avoiding the origin entirely. Reduces latency from 100-300ms (origin) to 10-50ms (edge), and offloads 60-95% of traffic from your servers.",
    whenToUse: [
      "Any static content: images, JS, CSS, video, fonts",
      "Cacheable API responses (public data, paginated lists)",
      "Geographic user distribution beyond a single region",
      "DDoS protection at scale",
    ],
    whenNotToUse: [
      "Highly personalized responses (every user sees different data)",
      "Real-time data with sub-second freshness requirements",
      "Internal-only APIs",
    ],
    realWorldExamples: [
      "Netflix: video chunks served from Open Connect edge servers",
      "Cloudflare: 90%+ cache hit rate for typical static-heavy sites",
      "AWS CloudFront fronting an S3 bucket",
    ],
    commonPitfalls: [
      "Caching authenticated responses by accident (leaks user data)",
      "Cache invalidation lag — Vary headers and surrogate keys matter",
      "Cache stampede on TTL expiry — use stale-while-revalidate",
    ],
    configHelp: {
      cacheEnabled: "Toggle caching. Disabled = always pass through to origin.",
      ttlSeconds: "How long an edge holds content. Higher = more offload, more staleness.",
      hitRate: "Fraction of requests served from edge cache (no origin hit).",
      edgeLocations: "Number of POPs. More = lower latency for distributed users.",
    },
    costModel: "$0.085/GB egress + ~$0.0075/10k requests (CloudFront pricing).",
    typicalLatency: "10-50ms on hit, +0ms (passthrough) on miss",
    capacity: "Effectively unlimited — CDNs absorb terabit-scale traffic.",
  },

  "load-balancer": {
    title: "Load Balancer",
    oneLine: "Distributes incoming traffic across backend instances.",
    whatItDoes:
      "Sits in front of a pool of backends and routes each request to a healthy instance. Performs health checks (removes dead nodes), terminates SSL, and can do session affinity. L4 (transport) is faster; L7 (application) can route by path/header.",
    whenToUse: [
      "Any time you have 2+ application server instances",
      "Need automatic failover when instances die",
      "Want to drain traffic during deploys without dropping requests",
    ],
    whenNotToUse: [
      "Single-instance hobby projects (no benefit)",
      "Stateful connections without sticky sessions support",
    ],
    realWorldExamples: [
      "AWS ALB / GCP Load Balancer / nginx in front of app servers",
      "HAProxy for high-throughput TCP load balancing",
      "Envoy as a service mesh sidecar",
    ],
    commonPitfalls: [
      "Slow health checks miss fast failures (set interval to 5-10s, threshold to 2-3)",
      "Round-robin under skewed load — use least-connections for variable request cost",
      "Forgetting to bound max connections (LB can become the SPOF)",
    ],
    configHelp: {
      algorithm: "round-robin: simple. least-connections: better with variable cost. ip-hash: sticky sessions.",
      healthCheckIntervalMs: "How often LB pings backends. Lower = faster failover but more overhead.",
      maxRps: "Capacity ceiling of the LB itself.",
      sslTermination: "LB handles TLS, freeing backends. Adds ~2ms CPU cost.",
    },
    costModel: "$15-25/month per LB + $0.008/GB processed (AWS ALB).",
    typicalLatency: "1-5ms",
    capacity: "ALB: ~100k RPS per LB. nginx: ~50k RPS per instance.",
  },

  "api-gateway": {
    title: "API Gateway",
    oneLine: "Single entry point that handles auth, rate limiting, and routing.",
    whatItDoes:
      "More than a load balancer: validates JWTs/API keys, enforces per-client rate limits, transforms requests (e.g. REST→gRPC), aggregates microservice calls, and emits metrics. Acts as the security and policy enforcement boundary.",
    whenToUse: [
      "Microservices architecture (one gateway, many services)",
      "Public APIs needing key management and quotas",
      "Need to centralize auth, logging, and rate limits",
      "API versioning (route /v1/* to old, /v2/* to new)",
    ],
    whenNotToUse: [
      "Single monolith without auth complexity (regular LB is enough)",
      "Internal-only service mesh (use Envoy/Istio sidecars instead)",
    ],
    realWorldExamples: [
      "Stripe: API Gateway validates keys, throttles per-account, routes to internal services",
      "Netflix Zuul: edge gateway for all client traffic",
      "AWS API Gateway, Kong, Apigee, Tyk",
    ],
    commonPitfalls: [
      "Adding too much logic — gateways should be thin policy enforcers",
      "Single point of failure — must be HA, multi-region",
      "Rate limit storage (Redis) becomes its own bottleneck",
    ],
    configHelp: {
      maxRps: "Total gateway capacity across instances.",
      rateLimitPerClient: "Per-client RPS cap. Lower = better fair-share, more 429s.",
      authEnabled: "JWT/key validation. Adds ~3-8ms per request (or cached lookup).",
      transformationCost: "Extra ms per request for request/response transformation.",
    },
    costModel: "AWS API Gateway: $3.50 per million requests. Self-hosted: ~$50/month/instance.",
    typicalLatency: "5-20ms (auth + routing overhead)",
    capacity: "10k-100k RPS per instance, depending on auth complexity.",
  },

  "api-server": {
    title: "API Server",
    oneLine: "Stateless app server running your business logic.",
    whatItDoes:
      "Receives requests, applies business logic, talks to databases and caches, returns responses. Stateless means any instance can serve any request, enabling horizontal scaling. CPU and memory are the limits, not state.",
    whenToUse: [
      "Standard REST/GraphQL/gRPC API workloads",
      "Anything stateless and horizontally scalable",
      "Behind a load balancer for HA",
    ],
    whenNotToUse: [
      "Long-lived connections (use WebSocket instead)",
      "Heavy batch jobs (use Worker instead)",
      "CPU-bound ML inference (consider GPU-backed services)",
    ],
    realWorldExamples: [
      "Node.js / Go / Python / Java / .NET REST APIs",
      "Twitter timeline service, Uber rides service",
      "Spring Boot apps on Kubernetes",
    ],
    commonPitfalls: [
      "Too few instances — single instance loss takes you down",
      "Memory leaks in long-running processes (force restarts)",
      "Synchronous calls to slow downstream amplify latency under load",
      "Connection pool size mismatch between server count and DB capacity",
    ],
    configHelp: {
      instances: "Number of server processes/containers. 3+ for HA.",
      maxConcurrentRequests: "In-flight requests per instance. Too high = OOM / contention.",
      cpuCores: "CPU per instance. More cores ≠ linear throughput for I/O-bound work.",
      memoryGB: "RAM per instance. Watch heap usage.",
      baseLatencyMs: "Minimum processing time (no contention).",
      coldStartMs: "Serverless/autoscale latency on a cold instance.",
      autoScale: "Auto-add instances under load. Smooths spikes but slower than warm pool.",
    },
    costModel: "EC2 t3.medium ~$30/mo · m5.xlarge ~$140/mo · m5.4xlarge ~$560/mo (on-demand).",
    typicalLatency: "5-50ms per request depending on logic and downstream calls.",
    capacity: "100-2000 RPS per instance for typical CRUD; ~10 RPS for heavy compute.",
  },

  microservice: {
    title: "Microservice",
    oneLine: "Focused service that owns one business domain.",
    whatItDoes:
      "Like an API server, but explicitly scoped to a single bounded context (Users, Orders, Payments). Communicates with other services via HTTP/gRPC. Owns its data store. Network overhead is the cost of decomposition.",
    whenToUse: [
      "Large org with independent teams owning different domains",
      "Different scaling needs per domain (Search needs 10x more than Profile)",
      "Different tech stacks per domain (ML in Python, payments in Java)",
    ],
    whenNotToUse: [
      "Small teams — operational overhead crushes velocity",
      "Tightly coupled domains — you'll fight chatty service-to-service calls",
      "Without strong observability (distributed tracing) in place",
    ],
    realWorldExamples: [
      "Netflix: 700+ microservices for video, recommendation, billing, etc.",
      "Uber: dispatch, driver, rider, payments, ETA as separate services",
      "Amazon's 'two-pizza teams' each owning a service",
    ],
    commonPitfalls: [
      "Distributed monolith — services so coupled they must deploy together",
      "Chatty interfaces — N+1 calls between services",
      "No circuit breaker → one slow service hangs the entire request chain",
      "Sync calls when async would do",
    ],
    configHelp: {
      instances: "Replicas of this service. Each domain scales independently.",
      maxConcurrentRequests: "Per-instance concurrency.",
      baseLatencyMs: "Service's own processing time.",
      networkOverheadMs: "Service-to-service hop cost (~1-5ms in-DC, more cross-AZ).",
      circuitBreakerEnabled: "Stops calling failing downstream — prevents cascading failure.",
    },
    costModel: "Similar to API Server: $30-200/month/instance.",
    typicalLatency: "10-30ms (own work + 1 downstream call).",
    capacity: "100-1000 RPS per instance.",
  },

  "auth-service": {
    title: "Auth Service",
    oneLine: "Issues and validates user identity tokens.",
    whatItDoes:
      "Handles login, token issuance (JWT/opaque), token validation, MFA, and session management. Every authenticated request hits it directly or via a token cache. Critical for security; an outage is a full outage.",
    whenToUse: [
      "Any system with user accounts",
      "B2B APIs with API key management",
      "OAuth/SSO integrations",
    ],
    whenNotToUse: [
      "Anonymous-only services (e.g. public CDN content)",
    ],
    realWorldExamples: [
      "Auth0 / Okta / Cognito / Firebase Auth",
      "Internal auth services backing JWT validation",
      "Stripe API key validation service",
    ],
    commonPitfalls: [
      "Validating tokens against a DB on every request (cache them!)",
      "Single region — login latency for distant users is brutal",
      "JWT without revocation strategy (long-lived tokens = security risk)",
    ],
    configHelp: {
      maxRps: "Capacity ceiling. Login is usually 10-100x rarer than validation.",
      baseLatencyMs: "Token validation latency (signature check + lookup).",
      tokenCacheHitRate: "Fraction of validations hitting cache, not the DB.",
    },
    costModel: "Auth0 B2C: ~$0.03/MAU at scale. Self-hosted: 2-3 small instances + Redis (~$200/month).",
    typicalLatency: "1-5ms with cache, 10-30ms without.",
    capacity: "5k-50k validations/sec with caching.",
  },

  worker: {
    title: "Background Worker",
    oneLine: "Async job processor reading from a queue.",
    whatItDoes:
      "Pulls jobs from a queue (or schedule) and executes them outside the request path. Frees API servers from slow work (sending emails, image processing, billing runs). Scales independently of web traffic.",
    whenToUse: [
      "Tasks > 100ms that don't need a sync response (emails, exports)",
      "CPU/memory-heavy work (video transcoding, ML inference)",
      "Scheduled jobs (nightly reports, cleanup)",
      "Webhook fan-out to external systems",
    ],
    whenNotToUse: [
      "Work that needs sync results (use direct API call)",
      "Sub-second tasks where queue overhead dominates",
    ],
    realWorldExamples: [
      "Sidekiq / Celery / BullMQ workers behind a Redis/SQS queue",
      "Stripe: webhook delivery, balance calculations",
      "Instagram: image resizing pipeline",
    ],
    commonPitfalls: [
      "No retry/dead-letter strategy — failed jobs disappear silently",
      "Long-running jobs without checkpoints — restart loses progress",
      "Poison messages crashing workers in a loop",
      "Worker count not autoscaling with queue depth → backlog growth",
    ],
    configHelp: {
      instances: "Worker processes/containers.",
      jobsPerSecondPerWorker: "Throughput per worker — depends on job type.",
      avgJobDurationMs: "Mean time per job. Long jobs reduce throughput.",
      concurrency: "Concurrent jobs per worker (threads/coroutines).",
    },
    costModel: "Similar to API servers — $30-150/month/worker.",
    typicalLatency: "End-to-end latency irrelevant — measure queue depth.",
    capacity: "Workers × concurrency × (1000/job_ms) jobs/sec total.",
  },

  websocket: {
    title: "WebSocket Server",
    oneLine: "Long-lived bidirectional connections for real-time updates.",
    whatItDoes:
      "Holds persistent TCP connections (~10s-hours each) to push data without polling. Used for chat, live dashboards, multiplayer games, collaborative editing. Memory-bound, not CPU-bound: each connection uses ~16-64KB.",
    whenToUse: [
      "Real-time updates (chat, notifications, presence)",
      "Live collaboration (docs, design tools)",
      "Multiplayer games, trading platforms",
    ],
    whenNotToUse: [
      "Simple polling at >5s intervals (HTTP is simpler)",
      "Mobile apps with poor battery — connections drop and reconnect costly",
    ],
    realWorldExamples: [
      "Slack: WebSocket per active client",
      "Discord: voice/text channels via Gateway",
      "Figma: real-time multiplayer cursor positions",
    ],
    commonPitfalls: [
      "Sticky-session LB required (a connection lives on one instance)",
      "Backpressure — slow clients build up server-side queues",
      "Reconnect storms after a deploy or LB blip",
      "No horizontal scaling without pub/sub fan-out (Redis pub/sub, NATS)",
    ],
    configHelp: {
      instances: "Servers. Each holds N connections.",
      maxConnectionsPerInstance: "Per-instance cap. 10k-100k typical.",
      memoryPerConnectionKB: "Per-connection memory cost. Lower with binary protocols.",
    },
    costModel: "~$50-150/month/instance. Memory is the bottleneck, not CPU.",
    typicalLatency: "Sub-millisecond once connected.",
    capacity: "10k-1M connections per instance (Erlang/Go scale highest).",
  },

  redis: {
    title: "Redis (In-Memory Cache)",
    oneLine: "Microsecond key-value store for hot data.",
    whatItDoes:
      "Holds frequently-read data in RAM. Sits between app servers and the database, absorbing 80-99% of read load. Also used for sessions, rate-limiting counters, leaderboards, and pub/sub. Single-threaded core makes ops O(1) most of the time but watch for slow commands.",
    whenToUse: [
      "Read-heavy workloads with repetitive queries",
      "Session storage in stateless app fleet",
      "Rate limiting, leaderboards, counters",
      "Pub/sub for cross-instance fan-out",
    ],
    whenNotToUse: [
      "As the primary source of truth (use a real DB)",
      "When dataset exceeds RAM significantly (DB is cheaper)",
      "When eventual consistency between cache and DB is unacceptable",
    ],
    realWorldExamples: [
      "Twitter: user timeline cache",
      "GitHub: rate-limit counters",
      "Almost every web app for session storage",
    ],
    commonPitfalls: [
      "Cache stampede when many requests miss simultaneously",
      "Hot keys overload one shard (use random suffixes or local cache)",
      "Forgetting eviction policy = OOM crash",
      "Cache-DB inconsistency on writes (use write-through or invalidate carefully)",
      "Single-node failures lose all data unless persistence is on",
    ],
    configHelp: {
      maxMemoryMB: "RAM ceiling. Hitting it triggers eviction.",
      evictionPolicy: "LRU: evict least recently used. LFU: least frequently. noeviction: errors on full.",
      hitRate: "Fraction of GETs that find the key. Goal: 90%+.",
      clusterMode: "Sharded across nodes. Needed beyond ~100GB.",
      persistence: "RDB: snapshot. AOF: write-ahead log. none: pure cache.",
      replicaCount: "Read replicas spread read load. Failover candidates.",
    },
    costModel: "ElastiCache: $0.04-2/hour. Self: $50-1000/month depending on RAM.",
    typicalLatency: "0.5-2ms",
    capacity: "100k-1M ops/sec per node. Cluster scales horizontally.",
  },

  postgres: {
    title: "PostgreSQL (Relational DB)",
    oneLine: "ACID relational database — your source of truth.",
    whatItDoes:
      "Stores structured data with transactions, joins, constraints, and SQL queries. Connection-limited (each connection ~10MB RAM). Read replicas scale reads; partitioning/sharding scales writes. Latency depends heavily on indexes and query patterns.",
    whenToUse: [
      "Anything needing transactions (payments, inventory)",
      "Complex relational queries with joins",
      "Strong consistency requirements",
      "Default choice for most CRUD apps",
    ],
    whenNotToUse: [
      "Massive write throughput (>50k writes/sec — consider sharding/NoSQL)",
      "Time-series at extreme scale (use TimescaleDB or specialized stores)",
      "Full-text search (use Elasticsearch alongside)",
    ],
    realWorldExamples: [
      "Stripe: payments and ledgers on Postgres (heavily customized)",
      "GitLab, Discourse, Notion all run on Postgres",
      "AWS RDS Postgres / Aurora Postgres",
    ],
    commonPitfalls: [
      "Connection exhaustion — use pgbouncer (transaction pooling)",
      "Missing indexes → seq scans → CPU and IO meltdown",
      "Long transactions block VACUUM → bloat → slow queries",
      "Reading from primary when a replica would do",
      "Replica lag breaks read-after-write expectations",
    ],
    configHelp: {
      maxConnections: "Hard limit. Each costs ~10MB. Usually 100-500.",
      replicaCount: "Read replicas. Each can absorb read load. Watch replica lag.",
      diskIOPS: "Disk speed. 3k IOPS for general; 10k+ for write-heavy.",
      baseLatencyMs: "Indexed point read ~1-5ms. Without index = scan.",
      indexedReads: "Reads use indexes. Off = full table scans = pain.",
      connectionPooler: "PgBouncer multiplies effective connections 10-100x.",
      replicaLagMs: "How stale replica reads are. Sub-second is healthy.",
    },
    costModel: "RDS Postgres db.t3.medium ~$60/mo · db.m5.4xlarge ~$1,070/mo (+ storage + I/O).",
    typicalLatency: "1-10ms indexed reads; 5-50ms writes (with fsync).",
    capacity: "5k-50k QPS per primary. Reads scale ~linearly with replicas.",
  },

  nosql: {
    title: "NoSQL (DynamoDB / Cassandra style)",
    oneLine: "Horizontally scaled KV/document store.",
    whatItDoes:
      "Trades joins and complex queries for predictable single-digit-ms latency at any scale. Data is partitioned by key. Eventually consistent by default; strong consistency is more expensive. Best for known access patterns at huge scale.",
    whenToUse: [
      "Massive scale (millions of QPS) with simple access patterns",
      "Predictable, low-latency lookups by primary key",
      "Time-series, IoT, session stores",
      "When schema is flexible and access patterns are clear upfront",
    ],
    whenNotToUse: [
      "Ad-hoc analytics (use a warehouse)",
      "Complex multi-table joins (use SQL)",
      "Strong-consistency multi-key transactions (mostly)",
    ],
    realWorldExamples: [
      "Amazon DynamoDB powering Alexa, Prime Video, retail orders",
      "Apple iCloud on Cassandra (multi-petabyte)",
      "Discord migrated from Cassandra to ScyllaDB for messages (trillions of rows)",
    ],
    commonPitfalls: [
      "Hot partition keys throttle the whole table",
      "Designing the schema before knowing access patterns",
      "Forgetting eventually-consistent reads return stale data",
      "Cost explosion from missing capacity planning (especially on-demand mode)",
    ],
    configHelp: {
      readCapacity: "Provisioned reads/sec. Burst above costs money.",
      writeCapacity: "Provisioned writes/sec.",
      consistency: "Eventual: cheap and fast. Strong: 2x cost, sees latest write.",
      partitions: "More partitions = more parallelism but more cost.",
      baseLatencyMs: "Single-digit ms for indexed reads.",
    },
    costModel: "DynamoDB: $1.25/M writes + $0.25/M reads (on-demand). $/RCU/WCU otherwise.",
    typicalLatency: "1-10ms",
    capacity: "Effectively unlimited if partitioned well.",
  },

  search: {
    title: "Search (Elasticsearch / OpenSearch)",
    oneLine: "Full-text and analytical search engine.",
    whatItDoes:
      "Inverted-index store optimized for text search, faceting, aggregations, and geo queries. Data is sharded across nodes. Indexing is heavier than primary DB; queries are fast but not as fast as KV lookups.",
    whenToUse: [
      "Full-text search ('find products matching X')",
      "Faceted navigation, autocomplete",
      "Log search and analytics (ELK stack)",
      "Geographic search ('restaurants within 5km')",
    ],
    whenNotToUse: [
      "As primary source of truth (use a real DB)",
      "Transactional workloads",
      "Strong consistency requirements",
    ],
    realWorldExamples: [
      "Shopify product search",
      "Wikipedia search (CirrusSearch on Elasticsearch)",
      "Datadog/Elastic Logs on Elasticsearch",
    ],
    commonPitfalls: [
      "Mapping explosions when indexing arbitrary JSON",
      "Heap pressure from large aggregations",
      "Indexing in the request path — should be async",
      "Replica/shard count not matching cluster size",
    ],
    configHelp: {
      nodes: "Cluster size. 3+ for HA.",
      shards: "Index shards. Determines parallelism but heavy to change.",
      replicas: "Copies per shard. Increases read throughput and HA.",
      indexSizeGB: "Larger indexes need more heap and more nodes.",
      baseLatencyMs: "Typical query latency.",
    },
    costModel: "Self-hosted: ~$100-500/node/month. Managed (Elastic Cloud): 2-3x.",
    typicalLatency: "10-100ms for queries; ms for simple lookups.",
    capacity: "1k-10k queries/sec per node depending on query type.",
  },

  "object-storage": {
    title: "Object Storage (S3 / GCS / Azure Blob)",
    oneLine: "Effectively infinite blob storage for files.",
    whatItDoes:
      "Stores any kind of file (images, video, backups) by key. Eventually consistent for list operations, strong for read-after-write. Cheap, durable (11 nines), but per-request latency is higher than databases (~50-200ms).",
    whenToUse: [
      "User uploads (images, documents, videos)",
      "Backups, archives, logs",
      "Static website hosting",
      "Data lake / ML training data",
    ],
    whenNotToUse: [
      "Hot small reads in the request path (use a DB or cache)",
      "Frequently-updated structured data",
    ],
    realWorldExamples: [
      "Dropbox / iCloud blob storage",
      "Netflix video assets",
      "Every modern app for user-uploaded content",
    ],
    commonPitfalls: [
      "Hot prefixes (all keys starting with same chars) throttle on S3",
      "Listing operations are slow and consistent only after a delay",
      "Forgetting lifecycle policies → infinite cost growth",
      "Public bucket misconfigurations leak data",
    ],
    configHelp: {
      storageGB: "Total stored. Cheap (~$0.023/GB/month on S3 Standard).",
      avgObjectSizeKB: "Smaller objects = more request overhead per GB.",
      multiRegion: "Cross-region replication for DR. ~2x storage cost.",
    },
    costModel: "S3: $0.023/GB + $0.005/1k PUTs + $0.0004/1k GETs.",
    typicalLatency: "30-200ms for individual ops; throughput is high.",
    capacity: "Unlimited storage; 3500+ PUT/s and 5500+ GET/s per prefix.",
  },

  "data-warehouse": {
    title: "Data Warehouse (Snowflake / BigQuery / Redshift)",
    oneLine: "OLAP store for analytics — aggregations across billions of rows.",
    whatItDoes:
      "Columnar storage optimized for scans and aggregations. Decoupled compute/storage. Queries scan TBs in seconds. Loaded from operational DBs via ETL/CDC. Used for BI, reporting, ML feature engineering.",
    whenToUse: [
      "Business intelligence dashboards",
      "Ad-hoc analytics ('how many users from X did Y last month')",
      "ML feature stores",
      "Regulatory reporting",
    ],
    whenNotToUse: [
      "Transactional workloads",
      "Sub-second latency requirements",
      "User-facing real-time features (use OLTP or pre-aggregated cache)",
    ],
    realWorldExamples: [
      "Snowflake / BigQuery / Redshift / Databricks",
      "Spotify analytics on BigQuery",
      "Capital One's enterprise data lake",
    ],
    commonPitfalls: [
      "Running point queries (slow, expensive — wrong tool)",
      "Compute auto-suspend not configured → idle cost balloon",
      "Loading data continuously without batching → high ingest cost",
      "Joining huge tables without filters",
    ],
    configHelp: {
      computeUnits: "Snowflake credits / BigQuery slots. Scales linearly with cost.",
      avgQueryMs: "Typical analytical query latency (seconds, not ms).",
      resultCacheHitRate: "Repeated queries can be free from cache.",
    },
    costModel: "Snowflake: ~$2-4/credit-hour. BigQuery: $5/TB scanned.",
    typicalLatency: "1-30 seconds for analytical queries.",
    capacity: "Petabyte scale with elastic compute.",
  },

  queue: {
    title: "Message Queue (SQS / Kafka / RabbitMQ)",
    oneLine: "Async buffer decoupling producers from consumers.",
    whatItDoes:
      "Receives messages from producers, holds them durably, delivers to consumers. Enables async processing, smooths traffic spikes, and decouples services. Kafka adds replay and pub/sub for many consumers; SQS is simpler.",
    whenToUse: [
      "Async work (emails, exports, webhooks)",
      "Smoothing bursty traffic (writes during a viral spike)",
      "Event-driven architectures (publish events, multiple consumers react)",
      "Reliable delivery with retries",
    ],
    whenNotToUse: [
      "Sync request/response — adds latency for no benefit",
      "Tiny scale (in-process channels suffice)",
    ],
    realWorldExamples: [
      "Stripe: webhook delivery via internal queue",
      "Uber: dispatch events fanned out via Kafka",
      "LinkedIn invented Kafka for activity stream ingestion",
    ],
    commonPitfalls: [
      "No dead-letter queue → poison messages crash consumers forever",
      "Idempotency not enforced → duplicate processing",
      "Consumer scaling not tied to queue depth → backlog grows",
      "FIFO requirements with parallel consumers — order is lost",
    ],
    configHelp: {
      maxThroughputRps: "Producer/consumer throughput ceiling.",
      bufferSize: "Max messages buffered. Full = producer rejection or backpressure.",
      durable: "Persisted to disk. Off = faster but loses messages on crash.",
      avgMessageSizeKB: "Large messages cost more storage and bandwidth.",
    },
    costModel: "SQS: $0.40/M requests. Kafka self-hosted: $300-3000/month.",
    typicalLatency: "1-10ms publish; consumer poll latency varies.",
    capacity: "SQS: virtually unlimited. Kafka: 1M+ msgs/sec per cluster.",
  },
};

/** Quick reference: typical latency budget for each component in ms */
export const LATENCY_BUDGET: Record<ComponentType, [number, number]> = {
  client: [0, 200],
  cdn: [10, 50],
  "load-balancer": [1, 5],
  "api-gateway": [5, 20],
  "api-server": [5, 50],
  microservice: [10, 30],
  "auth-service": [1, 30],
  worker: [0, 0],
  websocket: [0, 1],
  redis: [1, 2],
  postgres: [1, 10],
  nosql: [1, 10],
  search: [10, 100],
  "object-storage": [30, 200],
  "data-warehouse": [1000, 30000],
  queue: [1, 10],
};
