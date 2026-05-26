# System Architect Simulator - Project Plan

## Executive Summary

**System Architect Simulator** is an interactive web application that teaches system design through hands-on experimentation. Users build distributed architectures visually, then watch their decisions succeed or fail in real-time as simulated traffic flows through their systems.

**Value Proposition:** Watch your architectural decisions fail in real-time, learn why, and iterate—all without deploying a single line of code.

**Competitive Moat:** The combination of realistic component behavior models, real-time visual feedback, and progressive scenario complexity creates a learning experience that's difficult to replicate. The simulation engine's accuracy comes from encoding real-world system behavior (connection pool exhaustion, cache invalidation patterns, cascade failures) into mathematical models—knowledge that takes years to accumulate.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 16 | App router, SSR, great DX |
| UI | React 19 + Tailwind CSS | Component model, utility-first styling |
| Canvas | React Flow | Purpose-built for node-based UIs |
| State | Zustand | Lightweight, middleware for undo/redo |
| Simulation | Web Workers | Off-main-thread computation |
| Charts | Canvas-based (custom or uPlot) | Better performance than SVG for real-time |
| Auth | Supabase Auth | Free tier, social login, JWT |
| Database | Supabase (Postgres) | Free tier, Row Level Security |
| Payments | Stripe | Subscriptions, Checkout |
| Analytics | Plausible | Privacy-friendly, simple |
| Error Tracking | Sentry | Free tier, error boundaries |
| Hosting | Vercel | Zero-config Next.js deployment |

---

## Phase 0: Prototype Spike (3 Days)

**Goal:** De-risk technical unknowns before committing to full development.

### Day 1: React Flow Feasibility
- [ ] Set up Next.js 16 + React Flow
- [ ] Create custom node components (API Server, Database, Cache)
- [ ] Implement drag-and-drop from palette to canvas
- [ ] Test custom edge rendering with animated traffic flow
- [ ] Implement snap-to-grid feature

### Day 2: Web Worker Communication
- [ ] Create simulation worker with message passing
- [ ] Test state serialization/deserialization performance
- [ ] Implement differential state updates (send diffs, not full state)
- [ ] Measure latency at 10 updates/second
- [ ] Test batch update strategies

### Day 3: Performance Benchmarks
- [ ] Test React Flow with 50+ nodes (target: 60fps)
- [ ] Test React Flow with 100+ nodes (identify degradation point)
- [ ] Test real-time chart updates with 300+ data points
- [ ] Benchmark canvas on mobile viewport (iOS Safari, Chrome Android)
- [ ] Measure memory usage with 10-minute simulations
- [ ] Test 1000+ simulated requests/second throughput

### Success Criteria
- [ ] Canvas maintains 30+ fps with 30 nodes
- [ ] Worker round-trip < 16ms for state updates
- [ ] Charts update smoothly at 10fps
- [ ] No memory leaks in 10-minute simulation
- [ ] Mobile: Canvas is usable (may not be optimal)

### Spike Outputs
- Technical feasibility report
- Performance baseline metrics
- Identified risks and mitigations
- Go/no-go decision

---

## Phase 1.1: Visual Architecture Builder (3 Weeks)

### Week 1: Foundation

#### Component Types (MVP)
```typescript
type ComponentType =
  | 'load-balancer'
  | 'api-server'
  | 'redis'
  | 'postgres'
  | 'cdn';
```

#### Core Interfaces
```typescript
interface ComponentNode {
  id: string;
  type: ComponentType;
  position: { x: number; y: number };
  config: ComponentConfig;
}

interface ComponentConfig {
  // Load Balancer
  algorithm?: 'round-robin' | 'least-connections' | 'ip-hash';
  healthCheckInterval?: number;

  // API Server
  instances?: number;
  maxConcurrentRequests?: number;
  cpuCores?: number;
  memoryGB?: number;

  // Redis
  maxMemoryMB?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'random';
  clusterMode?: boolean;

  // Postgres
  maxConnections?: number;
  replicaCount?: number;
  diskIOPS?: number;

  // CDN
  cacheEnabled?: boolean;
  ttlSeconds?: number;
  regions?: string[];
}

interface Connection {
  id: string;
  source: string;
  target: string;
  protocol: 'http' | 'tcp' | 'grpc';
  latencyMs: number;
}

interface Architecture {
  id: string;
  name: string;
  nodes: ComponentNode[];
  connections: Connection[];
  entryPointId: string | null;
  createdAt: number;
  updatedAt: number;
}
```

#### Default Configurations
```typescript
const DEFAULT_CONFIGS: Record<ComponentType, Partial<ComponentConfig>> = {
  'load-balancer': {
    algorithm: 'round-robin',
    healthCheckInterval: 5000,
  },
  'api-server': {
    instances: 1,
    maxConcurrentRequests: 100,
    cpuCores: 2,
    memoryGB: 4,
  },
  'redis': {
    maxMemoryMB: 1024,
    evictionPolicy: 'lru',
    clusterMode: false,
  },
  'postgres': {
    maxConnections: 100,
    replicaCount: 0,
    diskIOPS: 3000,
  },
  'cdn': {
    cacheEnabled: true,
    ttlSeconds: 3600,
    regions: ['us-east'],
  },
};
```

#### Deliverables
- [ ] React Flow canvas setup
- [ ] Component palette with drag-and-drop
- [ ] Custom node components with icons
- [ ] Snap-to-grid functionality
- [ ] Basic connection creation (click-drag between nodes)

### Week 2: Property Panel & Interactions

#### Property Panel
- [ ] Dynamic form based on component type
- [ ] Real-time config updates
- [ ] Input validation with error messages
- [ ] Preset configurations (small/medium/large)

#### Canvas Interactions
- [ ] Multi-select with shift-click
- [ ] Copy/paste components (Cmd+C, Cmd+V)
- [ ] Delete with confirmation for connected nodes
- [ ] Zoom controls (scroll, buttons, fit-to-view)
- [ ] Mini-map for navigation

### Week 3: Validation & History

#### Architecture Validation
```typescript
interface ValidationError {
  type: 'no-entry-point' | 'disconnected-node' | 'cycle-detected' | 'invalid-connection';
  nodeId?: string;
  message: string;
  severity: 'error' | 'warning';
}

const validateArchitecture = (arch: Architecture): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Check entry point exists
  if (!arch.entryPointId) {
    errors.push({
      type: 'no-entry-point',
      message: 'No entry point selected. Click a Load Balancer or API Server to set it.',
      severity: 'error'
    });
  }

  // Check all nodes are reachable from entry point
  const reachableNodes = findReachableNodes(arch, arch.entryPointId);
  arch.nodes.forEach(node => {
    if (!reachableNodes.has(node.id)) {
      errors.push({
        type: 'disconnected-node',
        nodeId: node.id,
        message: `${node.type} "${node.id}" is not reachable from entry point`,
        severity: 'warning'
      });
    }
  });

  // Check for cycles that could cause infinite loops
  const cycles = detectCycles(arch);
  if (cycles.length > 0) {
    errors.push({
      type: 'cycle-detected',
      message: `Circular dependency detected: ${cycles.join(' → ')}`,
      severity: 'warning'
    });
  }

  // Check for invalid connections (e.g., LB → LB)
  arch.connections.forEach(conn => {
    if (!isValidConnection(conn, arch)) {
      errors.push({
        type: 'invalid-connection',
        message: `Invalid connection: ${conn.source} → ${conn.target}`,
        severity: 'error'
      });
    }
  });

  return errors;
};
```

#### Visual Error Indicators
- [ ] Red border on invalid nodes
- [ ] Warning icons with tooltips
- [ ] "Fix this" quick action buttons
- [ ] Validation panel showing all issues

#### Undo/Redo System
```typescript
// Zustand middleware for time-travel
import { temporal } from 'zundo';

const useArchitectureStore = create<ArchitectureState>()(
  temporal(
    (set) => ({
      architecture: initialArchitecture,

      addNode: (node) => set((state) => ({
        architecture: {
          ...state.architecture,
          nodes: [...state.architecture.nodes, node],
        }
      })),

      // ... other actions
    }),
    { limit: 50 } // Keep 50 history states
  )
);

// Usage
const { undo, redo, pastStates, futureStates } = useArchitectureStore.temporal.getState();
```

#### Keyboard Shortcuts
- [ ] Cmd+Z / Ctrl+Z: Undo
- [ ] Cmd+Shift+Z / Ctrl+Y: Redo
- [ ] Delete/Backspace: Remove selected
- [ ] Cmd+A: Select all
- [ ] Cmd+D: Duplicate selected
- [ ] Escape: Deselect all

---

## Phase 1.2: Simulation Engine (3 Weeks)

### Week 4: Web Worker Foundation

#### Worker Architecture
```typescript
// simulation.worker.ts
interface SimulationMessage {
  type: 'START' | 'STOP' | 'PAUSE' | 'UPDATE_CONFIG' | 'INJECT_FAILURE';
  payload?: any;
}

interface SimulationResult {
  type: 'TICK' | 'METRICS' | 'EVENT' | 'COMPLETE' | 'PERF';
  payload: any;
}

self.onmessage = (e: MessageEvent<SimulationMessage>) => {
  switch (e.data.type) {
    case 'START':
      startSimulation(e.data.payload);
      break;
    case 'STOP':
      stopSimulation();
      break;
    case 'PAUSE':
      togglePause();
      break;
    case 'UPDATE_CONFIG':
      updateConfig(e.data.payload);
      break;
    case 'INJECT_FAILURE':
      injectFailure(e.data.payload);
      break;
  }
};
```

#### Traffic Generation
```typescript
interface TrafficPattern {
  type: 'constant' | 'ramp' | 'spike' | 'wave';
  baseRPS: number;
  duration: number;
  readRatio: number; // 0.0 to 1.0
}

interface ScenarioTraffic {
  patterns: TrafficPattern[];
  totalDuration: number;
}

const generateRequests = (
  pattern: TrafficPattern,
  elapsedMs: number
): Request[] => {
  let rps: number;

  switch (pattern.type) {
    case 'constant':
      rps = pattern.baseRPS;
      break;
    case 'ramp':
      // Linear increase from 0 to baseRPS over duration
      rps = pattern.baseRPS * (elapsedMs / pattern.duration);
      break;
    case 'spike':
      // Sudden jump to 10x at midpoint
      const midpoint = pattern.duration / 2;
      rps = elapsedMs > midpoint ? pattern.baseRPS * 10 : pattern.baseRPS;
      break;
    case 'wave':
      // Sinusoidal pattern
      rps = pattern.baseRPS * (1 + Math.sin(elapsedMs / 10000 * Math.PI));
      break;
  }

  return createRequests(rps, pattern.readRatio);
};
```

### Week 5: Component Models & Request Routing

#### Request Routing Algorithm
```typescript
interface Request {
  id: string;
  type: 'read' | 'write';
  timestamp: number;
  path: string[]; // Trail of component IDs visited
  latencyAccumulated: number;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  failureReason?: string;
}

const routeRequest = (
  request: Request,
  currentNodeId: string,
  architecture: Architecture,
  componentStates: Map<string, ComponentState>
): Request => {
  const component = architecture.nodes.find(n => n.id === currentNodeId);
  if (!component) {
    request.status = 'failed';
    request.failureReason = 'Component not found';
    return request;
  }

  // Add to path
  request.path.push(currentNodeId);

  // Get component state and metrics
  const state = componentStates.get(currentNodeId);
  const metrics = simulateComponent(component, state, request);

  // Add latency
  request.latencyAccumulated += metrics.latencyMs;

  // Check for timeout (e.g., > 30 seconds)
  if (request.latencyAccumulated > 30000) {
    request.status = 'timeout';
    request.failureReason = 'Request timeout';
    return request;
  }

  // Check for errors
  if (Math.random() < metrics.errorRate) {
    request.status = 'failed';
    request.failureReason = metrics.errorReason;
    return request;
  }

  // Find next hop(s)
  const outgoingEdges = architecture.connections.filter(
    c => c.source === currentNodeId
  );

  // Terminal node (e.g., database with no further connections)
  if (outgoingEdges.length === 0) {
    request.status = 'success';
    return request;
  }

  // Special handling for cache hit/miss
  if (component.type === 'redis' && request.type === 'read') {
    const hitRate = calculateCacheHitRate(component, state);
    if (Math.random() < hitRate) {
      // Cache hit - request complete
      request.status = 'success';
      return request;
    }
    // Cache miss - continue to database
  }

  // Route to next component
  // For load balancer: select based on algorithm
  // For others: take first connection
  const nextEdge = selectNextEdge(component, outgoingEdges, componentStates);

  // Add network latency
  request.latencyAccumulated += nextEdge.latencyMs;

  return routeRequest(request, nextEdge.target, architecture, componentStates);
};
```

#### Enhanced Database Model
```typescript
interface DatabaseState {
  connectionPool: {
    total: number;
    inUse: number;
    waiting: number;
  };
  diskIO: {
    currentIOPS: number;
    maxIOPS: number;
    queueDepth: number;
  };
  replicationLag: number;
  queryCache: {
    hitRate: number;
    size: number;
  };
}

const simulateDatabase = (
  component: ComponentNode,
  state: DatabaseState,
  incomingQPS: number,
  readRatio: number
): { metrics: ComponentMetrics; newState: DatabaseState } => {
  const config = component.config;
  let latency = 5; // Base latency
  let errorRate = 0.001; // Base error rate

  // Connection pool pressure
  const connectionsNeeded = Math.ceil(incomingQPS / 50);
  const poolUtilization = connectionsNeeded / config.maxConnections!;

  if (poolUtilization > 1) {
    // Connections exhausted
    const waitingRequests = connectionsNeeded - config.maxConnections!;
    state.connectionPool.waiting = waitingRequests;

    // Exponential latency increase
    latency += waitingRequests * 50;

    // Start failing requests if queue too long
    if (waitingRequests > config.maxConnections! * 0.5) {
      errorRate += 0.1;
    }
  } else {
    state.connectionPool.waiting = 0;
  }

  state.connectionPool.inUse = Math.min(connectionsNeeded, config.maxConnections!);

  // Disk I/O pressure (writes are expensive)
  const writeQPS = incomingQPS * (1 - readRatio);
  const writeIOPS = writeQPS * 2; // Each write = ~2 IOPS
  const readIOPS = incomingQPS * readRatio * 0.5; // Reads cheaper with caching

  state.diskIO.currentIOPS = writeIOPS + readIOPS;

  if (state.diskIO.currentIOPS > config.diskIOPS!) {
    // Disk saturated
    const saturationRatio = state.diskIO.currentIOPS / config.diskIOPS!;
    latency *= Math.pow(saturationRatio, 2);

    if (saturationRatio > 1.5) {
      errorRate += 0.05;
    }
  }

  // Replication lag (if replicas exist)
  if (config.replicaCount! > 0) {
    state.replicationLag = writeQPS * 0.1; // Rough estimate
  }

  return {
    metrics: {
      latencyMs: latency,
      errorRate,
      throughput: incomingQPS,
      errorReason: errorRate > 0.05 ? 'Connection pool exhausted' : undefined,
    },
    newState: state,
  };
};
```

#### Cache Model
```typescript
interface CacheState {
  memoryUsed: number;
  hitRate: number;
  evictions: number;
  keyCount: number;
}

const simulateCache = (
  component: ComponentNode,
  state: CacheState,
  incomingQPS: number,
  uniqueKeyRatio: number
): { metrics: ComponentMetrics; newState: CacheState } => {
  const config = component.config;
  let latency = 1; // Redis is fast
  let errorRate = 0;

  // Memory pressure
  const memoryPerKey = 0.001; // 1KB average per key
  const newKeys = incomingQPS * uniqueKeyRatio;
  state.keyCount += newKeys;
  state.memoryUsed = state.keyCount * memoryPerKey;

  const memoryUtilization = state.memoryUsed / config.maxMemoryMB!;

  if (memoryUtilization > 1) {
    // Eviction happening
    state.evictions = (state.memoryUsed - config.maxMemoryMB!) / memoryPerKey;
    state.keyCount = config.maxMemoryMB! / memoryPerKey;
    state.memoryUsed = config.maxMemoryMB!;

    // Eviction impacts hit rate
    state.hitRate = Math.max(0.3, state.hitRate - 0.1);
  }

  if (memoryUtilization > 0.9) {
    // Near capacity - latency increases
    latency += (memoryUtilization - 0.9) * 10;
  }

  // Hit rate calculation (simplified)
  // Real hit rate depends on access patterns, TTL, etc.
  const baseHitRate = 0.8;
  state.hitRate = baseHitRate * (1 - uniqueKeyRatio * 0.5);

  return {
    metrics: {
      latencyMs: latency,
      errorRate,
      throughput: incomingQPS,
      cacheHitRate: state.hitRate,
    },
    newState: state,
  };
};
```

### Week 6: Bottleneck Detection & Testing

#### Bottleneck Detection
```typescript
interface Bottleneck {
  componentId: string;
  componentType: ComponentType;
  severity: 'warning' | 'critical' | 'failing';
  metric: string;
  currentValue: number;
  threshold: number;
  suggestion: string;
}

const detectBottlenecks = (
  architecture: Architecture,
  componentStates: Map<string, ComponentState>,
  metrics: Map<string, ComponentMetrics>
): Bottleneck[] => {
  const bottlenecks: Bottleneck[] = [];

  for (const node of architecture.nodes) {
    const state = componentStates.get(node.id);
    const metric = metrics.get(node.id);

    if (!state || !metric) continue;

    // Check latency
    if (metric.latencyMs > 500) {
      bottlenecks.push({
        componentId: node.id,
        componentType: node.type,
        severity: metric.latencyMs > 2000 ? 'failing' : 'critical',
        metric: 'latency',
        currentValue: metric.latencyMs,
        threshold: 500,
        suggestion: getSuggestion(node.type, 'latency'),
      });
    }

    // Check error rate
    if (metric.errorRate > 0.01) {
      bottlenecks.push({
        componentId: node.id,
        componentType: node.type,
        severity: metric.errorRate > 0.1 ? 'failing' : 'critical',
        metric: 'errorRate',
        currentValue: metric.errorRate,
        threshold: 0.01,
        suggestion: getSuggestion(node.type, 'errorRate'),
      });
    }

    // Component-specific checks
    if (node.type === 'postgres' && state.connectionPool) {
      const poolUtil = state.connectionPool.inUse / node.config.maxConnections!;
      if (poolUtil > 0.8) {
        bottlenecks.push({
          componentId: node.id,
          componentType: node.type,
          severity: poolUtil > 0.95 ? 'failing' : 'warning',
          metric: 'connectionPool',
          currentValue: poolUtil * 100,
          threshold: 80,
          suggestion: 'Add connection pooler (PgBouncer) or increase max connections',
        });
      }
    }
  }

  return bottlenecks;
};

const getSuggestion = (type: ComponentType, metric: string): string => {
  const suggestions: Record<ComponentType, Record<string, string>> = {
    'postgres': {
      latency: 'Add a Redis cache layer to reduce database load',
      errorRate: 'Scale up instance size or add read replicas',
    },
    'api-server': {
      latency: 'Add more API server instances behind a load balancer',
      errorRate: 'Check server resources - may need more CPU/memory',
    },
    'redis': {
      latency: 'Increase memory allocation or enable cluster mode',
      errorRate: 'Check eviction policy and memory limits',
    },
    'load-balancer': {
      latency: 'Check backend health - likely downstream bottleneck',
      errorRate: 'Backends may be failing health checks',
    },
    'cdn': {
      latency: 'Add more edge regions or increase cache TTL',
      errorRate: 'Check origin server availability',
    },
  };

  return suggestions[type]?.[metric] || 'Review component configuration';
};
```

#### Unit Tests for Routing
```typescript
describe('Request Routing', () => {
  it('routes request through linear architecture', () => {
    const arch = createArchitecture([
      { id: 'lb', type: 'load-balancer' },
      { id: 'api', type: 'api-server' },
      { id: 'db', type: 'postgres' },
    ], [
      { source: 'lb', target: 'api' },
      { source: 'api', target: 'db' },
    ]);

    const request = createRequest({ type: 'read' });
    const result = routeRequest(request, 'lb', arch, new Map());

    expect(result.path).toEqual(['lb', 'api', 'db']);
    expect(result.status).toBe('success');
  });

  it('handles cache hit correctly', () => {
    const arch = createArchitecture([
      { id: 'api', type: 'api-server' },
      { id: 'cache', type: 'redis' },
      { id: 'db', type: 'postgres' },
    ], [
      { source: 'api', target: 'cache' },
      { source: 'cache', target: 'db' },
    ]);

    // Mock 100% cache hit rate
    const states = new Map([
      ['cache', { hitRate: 1.0 }],
    ]);

    const request = createRequest({ type: 'read' });
    const result = routeRequest(request, 'api', arch, states);

    expect(result.path).toEqual(['api', 'cache']);
    expect(result.status).toBe('success');
  });

  it('handles component failure', () => {
    const arch = createArchitecture([
      { id: 'api', type: 'api-server' },
      { id: 'db', type: 'postgres' },
    ], [
      { source: 'api', target: 'db' },
    ]);

    // Mock failing database
    const states = new Map([
      ['db', { errorRate: 1.0 }],
    ]);

    const request = createRequest({ type: 'write' });
    const result = routeRequest(request, 'api', arch, states);

    expect(result.status).toBe('failed');
  });
});
```

---

## Phase 1.3: Feedback UI (2 Weeks)

### Week 7: Metrics Dashboard

#### Efficient Data Handling
```typescript
// Rolling buffer for chart data
class MetricsBuffer {
  private buffer: { timestamp: number; value: number }[] = [];
  private maxSize = 300; // 5 minutes at 1 update/sec

  push(timestamp: number, value: number) {
    this.buffer.push({ timestamp, value });
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getValues(): number[] {
    return this.buffer.map(b => b.value);
  }

  getPercentile(p: number): number {
    const sorted = [...this.buffer].sort((a, b) => a.value - b.value);
    const index = Math.floor(sorted.length * p);
    return sorted[index]?.value ?? 0;
  }

  getAverage(): number {
    if (this.buffer.length === 0) return 0;
    const sum = this.buffer.reduce((acc, b) => acc + b.value, 0);
    return sum / this.buffer.length;
  }
}

// Throttle UI updates
const useThrottledMetrics = (metrics: SystemMetrics, throttleMs = 100) => {
  const [displayed, setDisplayed] = useState(metrics);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDisplayed(metrics);
    }, throttleMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [metrics, throttleMs]);

  return displayed;
};
```

#### Health Indicators (Accessibility-Friendly)
```typescript
type HealthStatus = 'healthy' | 'warning' | 'critical' | 'failing';

// Use shapes + colors for color-blind accessibility
const StatusIndicator = ({ status }: { status: HealthStatus }) => {
  const icons = {
    healthy: <CheckCircle className="text-green-500" aria-label="Healthy" />,
    warning: <AlertTriangle className="text-yellow-500" aria-label="Warning" />,
    critical: <AlertOctagon className="text-orange-500" aria-label="Critical" />,
    failing: <XCircle className="text-red-600 animate-pulse" aria-label="Failing" />,
  };

  return (
    <div className="status-indicator" role="status">
      {icons[status]}
      <span className="sr-only">{status}</span>
    </div>
  );
};
```

#### Dashboard Components
- [ ] Overall SLA status (pass/fail with current values)
- [ ] Latency chart (P50, P95, P99 lines)
- [ ] Throughput chart (requests/sec)
- [ ] Error rate chart
- [ ] Per-component health indicators
- [ ] Active bottleneck alerts with suggestions

### Week 8: Visual Feedback & Playback

#### Animated Traffic on Edges
```typescript
const AnimatedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  throughput
}: EdgeProps) => {
  const reducedMotion = useReducedMotion();

  // Calculate animation speed based on throughput
  const animationDuration = throughput > 0
    ? Math.max(0.5, 3 - Math.log10(throughput + 1))
    : 3;

  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  return (
    <g>
      {/* Base edge */}
      <path
        d={path}
        stroke="#64748b"
        strokeWidth={2}
        fill="none"
      />

      {/* Animated traffic dots */}
      {!reducedMotion && throughput > 0 && (
        <circle r={4} fill="#3b82f6">
          <animateMotion
            dur={`${animationDuration}s`}
            repeatCount="indefinite"
            path={path}
          />
        </circle>
      )}

      {/* Throughput label */}
      <text
        x={(sourceX + targetX) / 2}
        y={(sourceY + targetY) / 2 - 10}
        className="text-xs fill-gray-500"
      >
        {formatThroughput(throughput)}
      </text>
    </g>
  );
};
```

#### Motion Preferences
```typescript
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return reduced;
};
```

#### Simulation Controls
- [ ] Play/Pause button
- [ ] Speed control (0.5x, 1x, 2x, 4x)
- [ ] Timeline scrubber (seek to any point)
- [ ] "Jump to failure" button
- [ ] Reset simulation

#### Focus Management
```typescript
const PropertyPanel = ({ nodeId, onClose }: PropertyPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input when panel opens
  useEffect(() => {
    firstInputRef.current?.focus();
  }, [nodeId]);

  // Trap focus within panel
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="panel-title"
      aria-modal="true"
    >
      <h2 id="panel-title">Component Properties</h2>
      <input ref={firstInputRef} {...props} />
      {/* ... */}
    </div>
  );
};
```

---

## Phase 2: URL Shortener Scenario (1 Week)

### Week 9: Scenario Definition

#### Scenario Configuration
```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Traffic configuration
  traffic: ScenarioTraffic;

  // Success criteria
  sla: {
    latencyP99MaxMs: number;
    errorRateMax: number;
    availabilityMin: number;
  };

  // Available components
  allowedComponents: ComponentType[];

  // Starting architecture (optional)
  starterArchitecture?: Partial<Architecture>;

  // Hints system
  hints: ScenarioHint[];

  // Working solution (for "show me" feature)
  solutionArchitecture: Architecture;
}

interface ScenarioHint {
  triggerCondition: 'time' | 'failure-count' | 'bottleneck-type';
  triggerValue: number | string;
  message: string;
  highlightComponent?: ComponentType;
}

const URL_SHORTENER_SCENARIO: Scenario = {
  id: 'url-shortener',
  name: 'URL Shortener',
  description: 'Design a system that can handle 10,000 URL redirects per second with sub-100ms latency',
  difficulty: 'beginner',

  traffic: {
    patterns: [
      // Warmup: 1000 RPS for 30 seconds
      { type: 'constant', baseRPS: 1000, duration: 30000, readRatio: 0.95 },
      // Ramp: 1000 → 10000 RPS over 60 seconds
      { type: 'ramp', baseRPS: 10000, duration: 60000, readRatio: 0.95 },
      // Sustained: 10000 RPS for 60 seconds
      { type: 'constant', baseRPS: 10000, duration: 60000, readRatio: 0.95 },
      // Spike: 50000 RPS for 30 seconds
      { type: 'spike', baseRPS: 50000, duration: 30000, readRatio: 0.95 },
    ],
    totalDuration: 180000, // 3 minutes
  },

  sla: {
    latencyP99MaxMs: 100,
    errorRateMax: 0.001, // 0.1%
    availabilityMin: 0.999, // 99.9%
  },

  allowedComponents: ['load-balancer', 'api-server', 'redis', 'postgres', 'cdn'],

  hints: [
    {
      triggerCondition: 'time',
      triggerValue: 30,
      message: 'Your database is getting overwhelmed. 95% of requests are reads—what can help with read-heavy workloads?',
      highlightComponent: 'redis',
    },
    {
      triggerCondition: 'failure-count',
      triggerValue: 100,
      message: 'Adding a cache helps, but your single API server is now the bottleneck. What if you had more than one?',
      highlightComponent: 'api-server',
    },
    {
      triggerCondition: 'bottleneck-type',
      triggerValue: 'api-server',
      message: 'Multiple API servers need a way to distribute traffic evenly. Consider a load balancer.',
      highlightComponent: 'load-balancer',
    },
  ],

  solutionArchitecture: {
    id: 'url-shortener-solution',
    name: 'URL Shortener - Working Solution',
    nodes: [
      { id: 'lb', type: 'load-balancer', position: { x: 100, y: 200 }, config: { algorithm: 'round-robin' } },
      { id: 'api1', type: 'api-server', position: { x: 300, y: 100 }, config: { instances: 2 } },
      { id: 'api2', type: 'api-server', position: { x: 300, y: 300 }, config: { instances: 2 } },
      { id: 'cache', type: 'redis', position: { x: 500, y: 200 }, config: { maxMemoryMB: 2048 } },
      { id: 'db', type: 'postgres', position: { x: 700, y: 200 }, config: { maxConnections: 200 } },
    ],
    connections: [
      { id: 'c1', source: 'lb', target: 'api1', protocol: 'http', latencyMs: 1 },
      { id: 'c2', source: 'lb', target: 'api2', protocol: 'http', latencyMs: 1 },
      { id: 'c3', source: 'api1', target: 'cache', protocol: 'tcp', latencyMs: 1 },
      { id: 'c4', source: 'api2', target: 'cache', protocol: 'tcp', latencyMs: 1 },
      { id: 'c5', source: 'cache', target: 'db', protocol: 'tcp', latencyMs: 2 },
    ],
    entryPointId: 'lb',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};
```

#### Hints System UI
```typescript
const HintsPanel = ({ scenario, simulationState }: HintsPanelProps) => {
  const [unlockedHints, setUnlockedHints] = useState<number[]>([]);
  const [showSolution, setShowSolution] = useState(false);

  // Check for hint triggers
  useEffect(() => {
    scenario.hints.forEach((hint, index) => {
      if (unlockedHints.includes(index)) return;

      let shouldUnlock = false;

      switch (hint.triggerCondition) {
        case 'time':
          shouldUnlock = simulationState.elapsedSeconds >= hint.triggerValue;
          break;
        case 'failure-count':
          shouldUnlock = simulationState.failedRequests >= hint.triggerValue;
          break;
        case 'bottleneck-type':
          shouldUnlock = simulationState.bottlenecks.some(
            b => b.componentType === hint.triggerValue
          );
          break;
      }

      if (shouldUnlock) {
        setUnlockedHints(prev => [...prev, index]);
      }
    });
  }, [simulationState]);

  // Show "Show Solution" after 3+ failures
  const failedAttempts = simulationState.attemptCount - simulationState.passCount;

  return (
    <div className="hints-panel">
      <h3>Hints</h3>

      {unlockedHints.map(index => (
        <div key={index} className="hint">
          <LightbulbIcon />
          <p>{scenario.hints[index].message}</p>
        </div>
      ))}

      {unlockedHints.length === 0 && (
        <p className="text-gray-500">Keep trying! Hints will appear as you progress.</p>
      )}

      {failedAttempts >= 3 && (
        <button
          onClick={() => setShowSolution(true)}
          className="show-solution-btn"
        >
          Show me a working solution
        </button>
      )}

      {showSolution && (
        <SolutionModal
          architecture={scenario.solutionArchitecture}
          onClose={() => setShowSolution(false)}
        />
      )}
    </div>
  );
};
```

#### Learning Moment Tracking
```typescript
// Track "aha moments" for analytics
const trackLearningMoment = (event: string, details: Record<string, any>) => {
  track(event, details);
};

// Examples of learning moments to track:
// - First time adding a cache after database bottleneck
// - First time adding multiple API servers
// - First time adding a load balancer
// - First successful completion of a scenario
// - Time to first success
```

---

## Phase 3: Core Features (2 Weeks)

### Week 10: Tutorial & Onboarding

#### Guided Tutorial
```typescript
const tutorialSteps: TutorialStep[] = [
  {
    target: '[data-tutorial="component-palette"]',
    title: 'Component Palette',
    content: 'Drag components from here to build your architecture. Start with an API Server.',
    placement: 'right',
  },
  {
    target: '[data-tutorial="canvas"]',
    title: 'Architecture Canvas',
    content: 'Drop components here. Connect them by clicking the output port of one and dragging to the input of another.',
    placement: 'center',
  },
  {
    target: '[data-tutorial="property-panel"]',
    title: 'Configuration',
    content: 'Click any component to configure it. More instances, connections, and memory can help handle more traffic.',
    placement: 'left',
  },
  {
    target: '[data-tutorial="scenario-panel"]',
    title: 'Scenario Requirements',
    content: 'Each scenario has traffic patterns and SLA requirements. Your architecture must handle the load.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="run-button"]',
    title: 'Run Simulation',
    content: 'Click Run to simulate traffic through your system. Watch the metrics and look for bottlenecks!',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="metrics-panel"]',
    title: 'Metrics Dashboard',
    content: 'Monitor latency, throughput, and errors here. Red indicators mean trouble—check the hints panel for suggestions.',
    placement: 'left',
  },
];

const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tutorial-completed');
    if (!hasSeenTutorial) {
      setIsActive(true);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem('tutorial-completed', 'true');
    setIsActive(false);
    track('Tutorial Completed', { stepsViewed: currentStep + 1 });
  };

  return (
    <TutorialContext.Provider value={{ currentStep, setCurrentStep, isActive, completeTutorial }}>
      {children}
      {isActive && <TutorialOverlay />}
    </TutorialContext.Provider>
  );
};
```

#### First-Run Experience
- [ ] Welcome modal explaining the concept
- [ ] Guided tutorial (skippable)
- [ ] Starter architecture for first scenario
- [ ] "Sandbox mode" for free exploration
- [ ] Video walkthrough link

### Week 11: Save/Load & Export

#### Local Storage with Cloud Sync Prep
```typescript
interface SavedArchitecture {
  id: string;
  name: string;
  architecture: Architecture;
  scenarioId: string;
  savedAt: number;
  syncedAt?: number; // For future cloud sync
}

const useArchitectureStorage = () => {
  const saveArchitecture = async (name: string, architecture: Architecture, scenarioId: string) => {
    const saved: SavedArchitecture = {
      id: crypto.randomUUID(),
      name,
      architecture,
      scenarioId,
      savedAt: Date.now(),
    };

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('saved-architectures') || '[]');
    existing.push(saved);
    localStorage.setItem('saved-architectures', JSON.stringify(existing));

    track('Architecture Saved', {
      scenarioId,
      componentCount: architecture.nodes.length
    });

    return saved;
  };

  const loadArchitectures = (): SavedArchitecture[] => {
    return JSON.parse(localStorage.getItem('saved-architectures') || '[]');
  };

  const deleteArchitecture = (id: string) => {
    const existing = loadArchitectures();
    const filtered = existing.filter(a => a.id !== id);
    localStorage.setItem('saved-architectures', JSON.stringify(filtered));
  };

  return { saveArchitecture, loadArchitectures, deleteArchitecture };
};
```

#### Export Features
```typescript
import { toPng, toSvg } from 'html-to-image';
import LZString from 'lz-string';

const exportArchitectureAsImage = async (format: 'png' | 'svg') => {
  const canvas = document.querySelector('.react-flow') as HTMLElement;

  const dataUrl = format === 'png'
    ? await toPng(canvas, { backgroundColor: '#ffffff' })
    : await toSvg(canvas);

  const link = document.createElement('a');
  link.download = `architecture.${format}`;
  link.href = dataUrl;
  link.click();

  track('Architecture Exported', { format });
};

const shareArchitecture = async (architecture: Architecture): Promise<string> => {
  // Compress architecture to URL-safe string
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(architecture)
  );

  // For MVP: use compressed string in URL (works up to ~2KB)
  // For Pro: save to database and return short ID
  const url = `${window.location.origin}/view/${compressed}`;

  await navigator.clipboard.writeText(url);

  track('Architecture Shared', {
    componentCount: architecture.nodes.length
  });

  return url;
};
```

#### Share View Page
```typescript
// app/view/[encoded]/page.tsx
const SharedArchitecturePage = ({ params }: { params: { encoded: string } }) => {
  const architecture = useMemo(() => {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(params.encoded);
      return JSON.parse(decompressed) as Architecture;
    } catch {
      return null;
    }
  }, [params.encoded]);

  if (!architecture) {
    return <div>Invalid or expired architecture link</div>;
  }

  return (
    <div className="shared-view">
      <header>
        <h1>{architecture.name}</h1>
        <p>Shared architecture • {architecture.nodes.length} components</p>
        <button onClick={() => /* copy to user's library */}>
          Copy to My Architectures
        </button>
      </header>

      <ReadOnlyCanvas architecture={architecture} />
    </div>
  );
};
```

---

## Phase 4: Backend & Monetization (2 Weeks)

### Week 12: Supabase Setup

#### Database Schema
```sql
-- Users (handled by Supabase Auth)

-- Subscriptions
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'free', -- 'free', 'active', 'canceled', 'past_due'
  tier text not null default 'free', -- 'free', 'pro', 'team'
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Saved Architectures (for Pro users)
create table architectures (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  scenario_id text not null,
  data jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table architectures enable row level security;

create policy "Users can manage own architectures"
  on architectures for all
  using (auth.uid() = user_id);

-- Usage Tracking (for free tier limits)
create table usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  anonymous_id text, -- for non-logged-in users
  date date not null default current_date,
  simulations_count int not null default 0,
  unique (user_id, date),
  unique (anonymous_id, date)
);
```

#### Subscription Tiers
```typescript
interface SubscriptionTier {
  id: 'free' | 'pro' | 'team';
  name: string;
  price: { monthly: number; yearly: number };
  features: string[];
  limits: {
    simulationsPerDay: number;
    savedArchitectures: number;
    scenarios: string[];
  };
}

const TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: [
      '1 scenario (URL Shortener)',
      '10 simulations per day',
      'Local saves only',
      'Watermarked exports',
    ],
    limits: {
      simulationsPerDay: 10,
      savedArchitectures: 0,
      scenarios: ['url-shortener'],
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 9, yearly: 79 },
    features: [
      'All scenarios (4+)',
      'Unlimited simulations',
      'Cloud sync',
      'No watermarks',
      'Priority support',
      'Early access to new scenarios',
    ],
    limits: {
      simulationsPerDay: Infinity,
      savedArchitectures: 100,
      scenarios: ['all'],
    },
  },
  {
    id: 'team',
    name: 'Team',
    price: { monthly: 29, yearly: 249 },
    features: [
      'Everything in Pro',
      'Shared team library',
      'Admin dashboard',
      'Usage analytics',
      'Custom scenarios (coming soon)',
    ],
    limits: {
      simulationsPerDay: Infinity,
      savedArchitectures: 1000,
      scenarios: ['all'],
    },
  },
];
```

#### Access Control Hook
```typescript
const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(TIERS[0]); // Free tier
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', user.id)
        .single();

      if (data?.status === 'active') {
        setSubscription(TIERS.find(t => t.id === data.tier) || TIERS[0]);
      } else {
        setSubscription(TIERS[0]);
      }

      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const canSimulate = async (): Promise<boolean> => {
    if (subscription?.limits.simulationsPerDay === Infinity) return true;

    const today = new Date().toISOString().split('T')[0];
    const key = `simulations-${today}`;
    const count = parseInt(localStorage.getItem(key) || '0');

    return count < (subscription?.limits.simulationsPerDay || 10);
  };

  const canAccessScenario = (scenarioId: string): boolean => {
    if (subscription?.limits.scenarios.includes('all')) return true;
    return subscription?.limits.scenarios.includes(scenarioId) || false;
  };

  const incrementSimulationCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `simulations-${today}`;
    const count = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, String(count + 1));
  };

  return {
    subscription,
    loading,
    canSimulate,
    canAccessScenario,
    incrementSimulationCount,
  };
};
```

### Week 13: Stripe Integration

#### Stripe Checkout
```typescript
// app/api/create-checkout/route.ts
import { stripe } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId, billingPeriod } = await req.json();

  // Get or create Stripe customer
  let { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  let customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from('subscriptions')
      .upsert({ user_id: user.id, stripe_customer_id: customerId });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
  });

  return Response.json({ url: session.url });
}
```

#### Webhook Handler
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: subscription.id,
          status: 'active',
          tier: 'pro',
          current_period_end: new Date(subscription.current_period_end * 1000),
        })
        .eq('stripe_customer_id', session.customer);

      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status === 'active' ? 'active' : 'canceled',
          current_period_end: new Date(subscription.current_period_end * 1000),
        })
        .eq('stripe_subscription_id', subscription.id);

      break;
    }
  }

  return Response.json({ received: true });
}
```

---

## Phase 5: Testing & Polish (1 Week)

### Week 14: Testing

#### Simulation Determinism Tests
```typescript
describe('Simulation Determinism', () => {
  it('produces identical results with same seed', () => {
    const arch = createTestArchitecture();
    const scenario = URL_SHORTENER_SCENARIO;

    const result1 = runSimulation(arch, scenario, { seed: 12345 });
    const result2 = runSimulation(arch, scenario, { seed: 12345 });

    expect(result1.metrics.latencyP99).toBe(result2.metrics.latencyP99);
    expect(result1.metrics.throughput).toBe(result2.metrics.throughput);
    expect(result1.metrics.errorRate).toBe(result2.metrics.errorRate);
  });
});
```

#### Scenario Regression Tests
```typescript
describe('URL Shortener Regression', () => {
  it('known-good architecture passes', async () => {
    const workingArch = await loadFixture('url-shortener-working.json');
    const result = await runSimulation(workingArch, URL_SHORTENER_SCENARIO);

    expect(result.passed).toBe(true);
    expect(result.metrics.latencyP99).toBeLessThan(100);
    expect(result.metrics.errorRate).toBeLessThan(0.001);
  });

  it('no-cache architecture fails', async () => {
    const brokenArch = await loadFixture('url-shortener-no-cache.json');
    const result = await runSimulation(brokenArch, URL_SHORTENER_SCENARIO);

    expect(result.passed).toBe(false);
  });

  it('single-server architecture fails at spike', async () => {
    const singleServer = await loadFixture('url-shortener-single-server.json');
    const result = await runSimulation(singleServer, URL_SHORTENER_SCENARIO);

    expect(result.passed).toBe(false);
    expect(result.failurePhase).toBe('spike');
  });
});
```

#### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('user can complete URL shortener scenario', async ({ page }) => {
  await page.goto('/simulator');

  // Skip tutorial
  await page.click('[data-testid="skip-tutorial"]');

  // Select scenario
  await page.click('[data-testid="scenario-selector"]');
  await page.click('text=URL Shortener');

  // Build architecture
  await page.dragAndDrop(
    '[data-component="load-balancer"]',
    '[data-testid="canvas"]'
  );
  // ... more drag and drops

  // Connect components
  // ... connection logic

  // Run simulation
  await page.click('[data-testid="run-simulation"]');

  // Wait for completion (up to 3 minutes)
  await page.waitForSelector('[data-testid="simulation-complete"]', {
    timeout: 180000,
  });

  // Check result
  const result = await page.locator('[data-testid="pass-fail"]').textContent();
  expect(result).toContain('Passing');
});

test('tutorial completes successfully', async ({ page }) => {
  // Clear localStorage to trigger tutorial
  await page.goto('/simulator');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Complete each tutorial step
  for (let i = 0; i < 6; i++) {
    await expect(page.locator('[data-testid="tutorial-tooltip"]')).toBeVisible();
    await page.click('[data-testid="tutorial-next"]');
  }

  // Verify tutorial completed
  await expect(page.locator('[data-testid="tutorial-tooltip"]')).not.toBeVisible();
});
```

#### Performance Monitoring
```typescript
// lib/performance.ts
export const measureSimulationTick = () => {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;

    // Log to analytics if slow
    if (duration > 50) {
      track('Slow Simulation Tick', { duration });
      console.warn(`Slow simulation tick: ${duration.toFixed(2)}ms`);
    }

    return duration;
  };
};

// FPS counter for development
export const useFPSCounter = (enabled = process.env.NODE_ENV === 'development') => {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const countFrame = () => {
      frameCount++;
      const now = performance.now();

      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(countFrame);
    };

    const handle = requestAnimationFrame(countFrame);
    return () => cancelAnimationFrame(handle);
  }, [enabled]);

  return fps;
};
```

---

## Phase 6: Launch (2 Weeks)

### Week 15: Soft Launch

#### Launch Checklist
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (Plausible) configured
- [ ] Stripe webhooks tested
- [ ] All scenarios balanced and tested
- [ ] Tutorial polished
- [ ] Mobile responsiveness checked
- [ ] Performance benchmarks passing
- [ ] Legal pages (Privacy Policy, Terms of Service)

#### Soft Launch Activities
- [ ] Share with 10-20 friends/colleagues
- [ ] Post to personal Twitter/LinkedIn
- [ ] Monitor error rates and fix critical issues
- [ ] Gather feedback and iterate
- [ ] Watch analytics for drop-off points

### Week 16: Public Launch

#### Launch Platforms
- [ ] Product Hunt
- [ ] Hacker News (Show HN)
- [ ] Reddit (r/programming, r/webdev, r/learnprogramming)
- [ ] Twitter/X thread
- [ ] Dev.to article
- [ ] LinkedIn post

#### Launch Assets
- [ ] Landing page with demo video
- [ ] Product Hunt assets (logo, screenshots, tagline)
- [ ] Twitter thread script
- [ ] Blog post: "Why I Built This"

---

## Infrastructure

### Environment Configuration
```typescript
// lib/config.ts
export const config = {
  simulation: {
    tickRateMs: parseInt(process.env.NEXT_PUBLIC_TICK_RATE || '100'),
    maxDurationSeconds: 600, // 10 minutes
    maxComponents: 50,
    maxConnectionsPerComponent: 10,
  },

  api: {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_KEY!,
  },

  features: {
    enableSave: process.env.NEXT_PUBLIC_ENABLE_SAVE === 'true',
    enableShare: process.env.NEXT_PUBLIC_ENABLE_SHARE === 'true',
    enableChaos: process.env.NEXT_PUBLIC_ENABLE_CHAOS === 'true',
    enableTeams: process.env.NEXT_PUBLIC_ENABLE_TEAMS === 'true',
  },

  analytics: {
    plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
};
```

### Error Boundary
```typescript
// components/error-boundary.tsx
'use client';

import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error }: { error?: Error }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
    <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-4">We've been notified and will fix it soon.</p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Reload Page
    </button>
    {process.env.NODE_ENV === 'development' && error && (
      <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto max-w-full">
        {error.message}
      </pre>
    )}
  </div>
);
```

### Analytics
```typescript
// lib/analytics.ts
export const track = (event: string, props?: Record<string, any>) => {
  // Plausible
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, { props });
  }

  // Console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, props);
  }
};

// Predefined events
export const analytics = {
  simulationStarted: (scenarioId: string) =>
    track('Simulation Started', { scenario: scenarioId }),

  simulationCompleted: (scenarioId: string, passed: boolean, durationMs: number) =>
    track('Simulation Completed', { scenario: scenarioId, passed, durationMs }),

  architectureSaved: (scenarioId: string, componentCount: number) =>
    track('Architecture Saved', { scenario: scenarioId, components: componentCount }),

  architectureShared: (componentCount: number) =>
    track('Architecture Shared', { components: componentCount }),

  bottleneckDetected: (componentType: string, severity: string) =>
    track('Bottleneck Detected', { component: componentType, severity }),

  hintViewed: (scenarioId: string, hintIndex: number) =>
    track('Hint Viewed', { scenario: scenarioId, hintIndex }),

  solutionViewed: (scenarioId: string) =>
    track('Solution Viewed', { scenario: scenarioId }),

  tutorialCompleted: (stepsViewed: number) =>
    track('Tutorial Completed', { stepsViewed }),

  upgradeClicked: (source: string) =>
    track('Upgrade Clicked', { source }),
};
```

### Feedback Widget
```typescript
// components/feedback-widget.tsx
const FeedbackWidget = () => {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        feedback,
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });

    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setFeedback('');
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 px-3 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p>Thanks for your feedback!</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">Send Feedback</h3>

                <div className="flex gap-2 mb-4">
                  {(['bug', 'feature', 'other'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`px-3 py-1 rounded ${
                        type === t ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="w-full h-32 border rounded p-2 mb-4"
                  placeholder="Tell us what's on your mind..."
                />

                <div className="flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="px-4 py-2">
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={!feedback.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
```

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 0 | Spike | Technical feasibility validated |
| 1-3 | Visual Builder | Canvas, nodes, connections, validation, undo/redo |
| 4-6 | Simulation Engine | Worker, traffic, component models, routing, bottleneck detection |
| 7-8 | Feedback UI | Metrics dashboard, charts, animations, playback |
| 9 | URL Shortener | First complete scenario with hints |
| 10-11 | Core Features | Tutorial, save/load, export, sharing |
| 12-13 | Backend | Auth, subscriptions, payments |
| 14 | Testing | Unit tests, E2E tests, regression tests |
| 15 | Soft Launch | Friends & family, bug fixes |
| 16 | Public Launch | HN, PH, marketing |

**Total: 16 weeks (4 months)**

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| React Flow performance | High | High | Test in Phase 0; fallback to plain SVG |
| Web Worker overhead | Medium | High | Send diffs, batch updates, measure early |
| Simulation complexity | Medium | High | Keep models simple; iterate |
| Monetization failure | Medium | High | Strong free tier hook; validate early |
| UX confusion | Medium | Medium | Tutorial, tooltips, video walkthrough |
| Browser compatibility | Low | Medium | Graceful fallback for Workers |

---

## Future Roadmap (Post-Launch)

### Additional Scenarios
- Real-time Chat (WebSockets, presence)
- Payment Processing (transactions, idempotency)
- Social Feed (fan-out, timeline generation)
- E-commerce (inventory, cart, checkout)

### Advanced Features
- Custom scenario builder
- Team collaboration
- Competition mode (leaderboards)
- Interview prep mode
- Integration with system design courses

### Platform Expansion
- Mobile apps (React Native)
- VS Code extension
- CLI tool for CI/CD testing

---

## Success Metrics

### Product Metrics
- Tutorial completion rate > 70%
- Scenario completion rate > 30%
- Day 7 retention > 20%
- NPS > 40

### Business Metrics
- Free-to-paid conversion > 3%
- Monthly recurring revenue growth > 10%
- Churn < 5%
- CAC < $50

---

*Last updated: January 2026*
