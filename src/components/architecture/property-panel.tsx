"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPONENT_DESCRIPTIONS,
  COMPONENT_LABELS,
  type ApiGatewayConfig,
  type ApiServerConfig,
  type AuthServiceConfig,
  type CDNConfig,
  type ClientConfig,
  type DataWarehouseConfig,
  type LoadBalancerConfig,
  type MicroserviceConfig,
  type NoSQLConfig,
  type ObjectStorageConfig,
  type PostgresConfig,
  type QueueConfig,
  type RedisConfig,
  type SearchConfig,
  type WebSocketConfig,
  type WorkerConfig,
} from "@/lib/architecture/types";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { COMPONENT_COLORS, COMPONENT_ICONS } from "./component-icons";
import { ComponentDocsDialog } from "./component-docs-dialog";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  suffix?: string;
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  suffix,
}: NumberFieldProps) {
  // Hold the raw text so partial input (e.g. "0.", "", "1.0") survives a
  // render instead of being parsed-and-clobbered on every keystroke — that's
  // what made decimal fields (read ratio, hit rate, …) impossible to edit.
  const [text, setText] = useState(() => String(value));
  const editing = useRef(false);

  // Resync when the value changes from outside (selecting another node,
  // undo/redo) but never overwrite what the user is actively typing.
  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);

  const commit = () => {
    editing.current = false;
    const parsed = Number(text);
    if (text.trim() === "" || Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onChange(next);
    setText(String(next));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">
        {label}
        {suffix && <span className="text-[10px] opacity-60">{suffix}</span>}
      </Label>
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => {
          editing.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw.trim() === "") return;
          const parsed = Number(raw);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        onBlur={commit}
        className="h-8 text-sm"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="h-8 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PropertyPanel() {
  const selectedId = useArchitectureStore((s) => s.selectedNodeId);
  const node = useArchitectureStore((s) =>
    s.nodes.find((n) => n.id === selectedId)
  );
  const updateConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const duplicateNode = useArchitectureStore((s) => s.duplicateNode);
  const [docsOpen, setDocsOpen] = useState(false);

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-lg border border-dashed bg-muted/30 p-6">
          <p className="text-sm font-medium">No selection</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click a component on the canvas to edit its configuration.
          </p>
        </div>
      </div>
    );
  }

  const { type, config } = node.data;
  const Icon = COMPONENT_ICONS[type];
  const colors = COMPONENT_COLORS[type];

  const update = (partial: Partial<typeof config>) =>
    updateConfig(node.id, partial);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
            colors.bg,
            colors.ring
          )}
        >
          <Icon className={cn("size-5", colors.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{COMPONENT_LABELS[type]}</div>
          <div className="text-[10px] text-muted-foreground">
            {COMPONENT_DESCRIPTIONS[type]}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setDocsOpen(true)}
            title="Learn about this component"
          >
            <BookOpen className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => duplicateNode(node.id)}
            title="Duplicate"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => removeNode(node.id)}
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <ComponentDocsDialog
        open={docsOpen}
        onOpenChange={setDocsOpen}
        componentType={type}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Label</Label>
            <Input
              value={config.label ?? ""}
              placeholder={COMPONENT_LABELS[type]}
              onChange={(e) => update({ label: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {type === "client" && (
            <ClientFields
              cfg={config as ClientConfig}
              update={(p) => update(p as Partial<ClientConfig>)}
            />
          )}
          {type === "cdn" && (
            <CDNFields
              cfg={config as CDNConfig}
              update={(p) => update(p as Partial<CDNConfig>)}
            />
          )}
          {type === "load-balancer" && (
            <LBFields
              cfg={config as LoadBalancerConfig}
              update={(p) => update(p as Partial<LoadBalancerConfig>)}
            />
          )}
          {type === "api-gateway" && (
            <GatewayFields
              cfg={config as ApiGatewayConfig}
              update={(p) => update(p as Partial<ApiGatewayConfig>)}
            />
          )}
          {type === "api-server" && (
            <ApiFields
              cfg={config as ApiServerConfig}
              update={(p) => update(p as Partial<ApiServerConfig>)}
            />
          )}
          {type === "microservice" && (
            <MicroserviceFields
              cfg={config as MicroserviceConfig}
              update={(p) => update(p as Partial<MicroserviceConfig>)}
            />
          )}
          {type === "auth-service" && (
            <AuthFields
              cfg={config as AuthServiceConfig}
              update={(p) => update(p as Partial<AuthServiceConfig>)}
            />
          )}
          {type === "worker" && (
            <WorkerFields
              cfg={config as WorkerConfig}
              update={(p) => update(p as Partial<WorkerConfig>)}
            />
          )}
          {type === "websocket" && (
            <WebSocketFields
              cfg={config as WebSocketConfig}
              update={(p) => update(p as Partial<WebSocketConfig>)}
            />
          )}
          {type === "redis" && (
            <RedisFields
              cfg={config as RedisConfig}
              update={(p) => update(p as Partial<RedisConfig>)}
            />
          )}
          {type === "postgres" && (
            <PostgresFields
              cfg={config as PostgresConfig}
              update={(p) => update(p as Partial<PostgresConfig>)}
            />
          )}
          {type === "nosql" && (
            <NoSQLFields
              cfg={config as NoSQLConfig}
              update={(p) => update(p as Partial<NoSQLConfig>)}
            />
          )}
          {type === "search" && (
            <SearchFields
              cfg={config as SearchConfig}
              update={(p) => update(p as Partial<SearchConfig>)}
            />
          )}
          {type === "object-storage" && (
            <ObjectStorageFields
              cfg={config as ObjectStorageConfig}
              update={(p) => update(p as Partial<ObjectStorageConfig>)}
            />
          )}
          {type === "data-warehouse" && (
            <DataWarehouseFields
              cfg={config as DataWarehouseConfig}
              update={(p) => update(p as Partial<DataWarehouseConfig>)}
            />
          )}
          {type === "queue" && (
            <QueueFields
              cfg={config as QueueConfig}
              update={(p) => update(p as Partial<QueueConfig>)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ClientFields({
  cfg,
  update,
}: {
  cfg: ClientConfig;
  update: (p: Partial<ClientConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Requests / second"
        hint="Sustained RPS this client population generates."
        value={cfg.rps}
        min={0}
        step={10}
        onChange={(rps) => update({ rps })}
      />
      <NumberField
        label="Read ratio"
        hint="0.8 means 80% reads, 20% writes (typical web)."
        value={cfg.readRatio}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0–1)"
        onChange={(readRatio) => update({ readRatio })}
      />
      <SelectField
        label="Geography"
        hint="Multi-region adds ~30ms; global adds ~80ms baseline."
        value={cfg.geography}
        options={[
          { value: "single-region", label: "Single region" },
          { value: "multi-region", label: "Multi-region" },
          { value: "global", label: "Global" },
        ]}
        onChange={(geography) => update({ geography })}
      />
    </>
  );
}

function CDNFields({
  cfg,
  update,
}: {
  cfg: CDNConfig;
  update: (p: Partial<CDNConfig>) => void;
}) {
  return (
    <>
      <SelectField
        label="Cache enabled"
        value={cfg.cacheEnabled ? "yes" : "no"}
        options={[
          { value: "yes", label: "Enabled" },
          { value: "no", label: "Disabled" },
        ]}
        onChange={(v) => update({ cacheEnabled: v === "yes" })}
      />
      <NumberField
        label="TTL (seconds)"
        hint="Longer = more origin offload, more stale risk."
        value={cfg.ttlSeconds}
        min={0}
        step={60}
        onChange={(ttlSeconds) => update({ ttlSeconds })}
      />
      <NumberField
        label="Cache hit rate"
        hint="Fraction served from edge, not origin."
        value={cfg.hitRate}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0–1)"
        onChange={(hitRate) => update({ hitRate })}
      />
      <NumberField
        label="Edge locations"
        hint="More POPs = lower latency for global users."
        value={cfg.edgeLocations}
        min={1}
        step={10}
        onChange={(edgeLocations) => update({ edgeLocations })}
      />
    </>
  );
}

function LBFields({
  cfg,
  update,
}: {
  cfg: LoadBalancerConfig;
  update: (p: Partial<LoadBalancerConfig>) => void;
}) {
  return (
    <>
      <SelectField
        label="Algorithm"
        hint="round-robin is fine for uniform requests; least-connections for variable cost."
        value={cfg.algorithm}
        options={[
          { value: "round-robin", label: "Round robin" },
          { value: "least-connections", label: "Least connections" },
          { value: "ip-hash", label: "IP hash (sticky)" },
        ]}
        onChange={(v) => update({ algorithm: v })}
      />
      <NumberField
        label="Health check interval"
        value={cfg.healthCheckIntervalMs}
        min={1000}
        step={500}
        suffix=" ms"
        onChange={(healthCheckIntervalMs) => update({ healthCheckIntervalMs })}
      />
      <NumberField
        label="Max RPS"
        hint="LB's own capacity. ALB ~100k/instance."
        value={cfg.maxRps}
        min={100}
        step={100}
        onChange={(maxRps) => update({ maxRps })}
      />
      <SelectField
        label="SSL termination"
        hint="LB handles TLS, +1-2ms CPU."
        value={cfg.sslTermination ? "yes" : "no"}
        options={[
          { value: "yes", label: "On" },
          { value: "no", label: "Off (passthrough)" },
        ]}
        onChange={(v) => update({ sslTermination: v === "yes" })}
      />
    </>
  );
}

function GatewayFields({
  cfg,
  update,
}: {
  cfg: ApiGatewayConfig;
  update: (p: Partial<ApiGatewayConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Max RPS"
        value={cfg.maxRps}
        min={100}
        step={1000}
        onChange={(maxRps) => update({ maxRps })}
      />
      <NumberField
        label="Rate limit per client"
        hint="Per-key RPS cap; 429s above this."
        value={cfg.rateLimitPerClient}
        min={1}
        step={10}
        onChange={(rateLimitPerClient) => update({ rateLimitPerClient })}
      />
      <SelectField
        label="Auth check"
        hint="Validates JWT/API key; +3-8ms."
        value={cfg.authEnabled ? "yes" : "no"}
        options={[
          { value: "yes", label: "On" },
          { value: "no", label: "Off" },
        ]}
        onChange={(v) => update({ authEnabled: v === "yes" })}
      />
      <NumberField
        label="Transform cost"
        hint="Extra ms per request for transformation."
        value={cfg.transformationCost}
        min={0}
        step={1}
        suffix=" ms"
        onChange={(transformationCost) => update({ transformationCost })}
      />
    </>
  );
}

function ApiFields({
  cfg,
  update,
}: {
  cfg: ApiServerConfig;
  update: (p: Partial<ApiServerConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Instances"
        hint="≥3 for HA. Behind LB."
        value={cfg.instances}
        min={1}
        max={100}
        onChange={(instances) => update({ instances })}
      />
      <NumberField
        label="Max concurrent / instance"
        hint="In-flight requests per instance."
        value={cfg.maxConcurrentRequests}
        min={1}
        step={10}
        onChange={(maxConcurrentRequests) => update({ maxConcurrentRequests })}
      />
      <NumberField
        label="CPU cores / instance"
        value={cfg.cpuCores}
        min={1}
        max={64}
        onChange={(cpuCores) => update({ cpuCores })}
      />
      <NumberField
        label="Memory / instance"
        value={cfg.memoryGB}
        min={1}
        step={1}
        suffix=" GB"
        onChange={(memoryGB) => update({ memoryGB })}
      />
      <NumberField
        label="Base latency"
        hint="Internal processing time at zero load."
        value={cfg.baseLatencyMs}
        min={1}
        step={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
      />
      <NumberField
        label="Cold start"
        hint="Serverless/scale-from-zero penalty. 0 if always warm."
        value={cfg.coldStartMs}
        min={0}
        step={100}
        suffix=" ms"
        onChange={(coldStartMs) => update({ coldStartMs })}
      />
      <SelectField
        label="Autoscale"
        hint="Adds instances under load. Smooths spikes."
        value={cfg.autoScale ? "yes" : "no"}
        options={[
          { value: "yes", label: "On" },
          { value: "no", label: "Off" },
        ]}
        onChange={(v) => update({ autoScale: v === "yes" })}
      />
    </>
  );
}

function MicroserviceFields({
  cfg,
  update,
}: {
  cfg: MicroserviceConfig;
  update: (p: Partial<MicroserviceConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Instances"
        value={cfg.instances}
        min={1}
        max={100}
        onChange={(instances) => update({ instances })}
      />
      <NumberField
        label="Max concurrent / instance"
        value={cfg.maxConcurrentRequests}
        min={1}
        step={10}
        onChange={(maxConcurrentRequests) => update({ maxConcurrentRequests })}
      />
      <NumberField
        label="Base latency"
        value={cfg.baseLatencyMs}
        min={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
      />
      <NumberField
        label="Network overhead"
        hint="Service-to-service hop cost."
        value={cfg.networkOverheadMs}
        min={0}
        suffix=" ms"
        onChange={(networkOverheadMs) => update({ networkOverheadMs })}
      />
      <SelectField
        label="Circuit breaker"
        hint="Fails fast on downstream issues."
        value={cfg.circuitBreakerEnabled ? "yes" : "no"}
        options={[
          { value: "yes", label: "On" },
          { value: "no", label: "Off" },
        ]}
        onChange={(v) => update({ circuitBreakerEnabled: v === "yes" })}
      />
      <NumberField
        label="CPU cores / instance"
        value={cfg.cpuCores}
        min={1}
        max={64}
        onChange={(cpuCores) => update({ cpuCores })}
      />
      <NumberField
        label="Memory / instance"
        value={cfg.memoryGB}
        min={1}
        suffix=" GB"
        onChange={(memoryGB) => update({ memoryGB })}
      />
    </>
  );
}

function AuthFields({
  cfg,
  update,
}: {
  cfg: AuthServiceConfig;
  update: (p: Partial<AuthServiceConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Max RPS"
        value={cfg.maxRps}
        min={100}
        step={500}
        onChange={(maxRps) => update({ maxRps })}
      />
      <NumberField
        label="Base latency"
        hint="Validation (signature + lookup)."
        value={cfg.baseLatencyMs}
        min={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
      />
      <NumberField
        label="Token cache hit rate"
        hint="Higher = fewer DB lookups. Goal: >0.9."
        value={cfg.tokenCacheHitRate}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0-1)"
        onChange={(tokenCacheHitRate) => update({ tokenCacheHitRate })}
      />
    </>
  );
}

function WorkerFields({
  cfg,
  update,
}: {
  cfg: WorkerConfig;
  update: (p: Partial<WorkerConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Instances"
        value={cfg.instances}
        min={1}
        onChange={(instances) => update({ instances })}
      />
      <NumberField
        label="Jobs / sec / worker"
        hint="Throughput per worker. Depends on job size."
        value={cfg.jobsPerSecondPerWorker}
        min={1}
        onChange={(jobsPerSecondPerWorker) => update({ jobsPerSecondPerWorker })}
      />
      <NumberField
        label="Avg job duration"
        value={cfg.avgJobDurationMs}
        min={1}
        suffix=" ms"
        onChange={(avgJobDurationMs) => update({ avgJobDurationMs })}
      />
      <NumberField
        label="Concurrency / worker"
        hint="Threads/coroutines per worker."
        value={cfg.concurrency}
        min={1}
        onChange={(concurrency) => update({ concurrency })}
      />
    </>
  );
}

function WebSocketFields({
  cfg,
  update,
}: {
  cfg: WebSocketConfig;
  update: (p: Partial<WebSocketConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Instances"
        value={cfg.instances}
        min={1}
        onChange={(instances) => update({ instances })}
      />
      <NumberField
        label="Max connections / instance"
        hint="Memory-bound, not CPU. 10k-100k typical."
        value={cfg.maxConnectionsPerInstance}
        min={1000}
        step={1000}
        onChange={(maxConnectionsPerInstance) =>
          update({ maxConnectionsPerInstance })
        }
      />
      <NumberField
        label="Memory / connection"
        value={cfg.memoryPerConnectionKB}
        min={1}
        suffix=" KB"
        onChange={(memoryPerConnectionKB) => update({ memoryPerConnectionKB })}
      />
    </>
  );
}

function RedisFields({
  cfg,
  update,
}: {
  cfg: RedisConfig;
  update: (p: Partial<RedisConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Max memory"
        value={cfg.maxMemoryMB}
        min={128}
        step={128}
        suffix=" MB"
        onChange={(maxMemoryMB) => update({ maxMemoryMB })}
      />
      <SelectField
        label="Eviction policy"
        hint="LRU = evict least recently used. noeviction = errors when full."
        value={cfg.evictionPolicy}
        options={[
          { value: "lru", label: "LRU" },
          { value: "lfu", label: "LFU" },
          { value: "random", label: "Random" },
          { value: "noeviction", label: "noeviction" },
        ]}
        onChange={(v) => update({ evictionPolicy: v })}
      />
      <NumberField
        label="Hit rate"
        hint="Goal 90%+. Tune TTL and key strategy."
        value={cfg.hitRate}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0–1)"
        onChange={(hitRate) => update({ hitRate })}
      />
      <SelectField
        label="Cluster mode"
        hint="Sharded across nodes. Required above ~100GB."
        value={cfg.clusterMode ? "yes" : "no"}
        options={[
          { value: "no", label: "Single node" },
          { value: "yes", label: "Clustered" },
        ]}
        onChange={(v) => update({ clusterMode: v === "yes" })}
      />
      <SelectField
        label="Persistence"
        value={cfg.persistence}
        options={[
          { value: "none", label: "None (pure cache)" },
          { value: "rdb", label: "RDB snapshots" },
          { value: "aof", label: "AOF (write-ahead log)" },
        ]}
        onChange={(v) => update({ persistence: v })}
      />
      <NumberField
        label="Replicas"
        hint="Spread read load and enable failover."
        value={cfg.replicaCount}
        min={0}
        max={10}
        onChange={(replicaCount) => update({ replicaCount })}
      />
    </>
  );
}

function PostgresFields({
  cfg,
  update,
}: {
  cfg: PostgresConfig;
  update: (p: Partial<PostgresConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Max connections"
        hint="Hard limit. Each costs ~10MB."
        value={cfg.maxConnections}
        min={10}
        step={10}
        onChange={(maxConnections) => update({ maxConnections })}
      />
      <SelectField
        label="Connection pooler"
        hint="pgBouncer: 10-50x effective connections."
        value={cfg.connectionPooler ? "yes" : "no"}
        options={[
          { value: "no", label: "Off" },
          { value: "yes", label: "On (pgBouncer)" },
        ]}
        onChange={(v) => update({ connectionPooler: v === "yes" })}
      />
      <NumberField
        label="Replicas"
        hint="Read replicas. Linear read scaling."
        value={cfg.replicaCount}
        min={0}
        max={10}
        onChange={(replicaCount) => update({ replicaCount })}
      />
      <NumberField
        label="Replica lag"
        hint="Read-after-write staleness window."
        value={cfg.replicaLagMs}
        min={0}
        step={10}
        suffix=" ms"
        onChange={(replicaLagMs) => update({ replicaLagMs })}
      />
      <NumberField
        label="Disk IOPS"
        hint="3k for general; 10k+ for write-heavy."
        value={cfg.diskIOPS}
        min={100}
        step={500}
        onChange={(diskIOPS) => update({ diskIOPS })}
      />
      <NumberField
        label="Base latency"
        value={cfg.baseLatencyMs}
        min={1}
        step={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
      />
      <SelectField
        label="Indexed reads"
        hint="Off = sequential scans = pain."
        value={cfg.indexedReads ? "yes" : "no"}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No (warning!)" },
        ]}
        onChange={(v) => update({ indexedReads: v === "yes" })}
      />
    </>
  );
}

function NoSQLFields({
  cfg,
  update,
}: {
  cfg: NoSQLConfig;
  update: (p: Partial<NoSQLConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Read capacity"
        hint="Provisioned reads/sec (DynamoDB RCU)."
        value={cfg.readCapacity}
        min={100}
        step={1000}
        onChange={(readCapacity) => update({ readCapacity })}
      />
      <NumberField
        label="Write capacity"
        value={cfg.writeCapacity}
        min={100}
        step={500}
        onChange={(writeCapacity) => update({ writeCapacity })}
      />
      <SelectField
        label="Consistency"
        hint="Strong reads cost 2x but see latest write."
        value={cfg.consistency}
        options={[
          { value: "eventual", label: "Eventual (default)" },
          { value: "strong", label: "Strong (2x cost)" },
        ]}
        onChange={(v) => update({ consistency: v })}
      />
      <NumberField
        label="Partitions"
        hint="More = more parallelism, less hot-key risk."
        value={cfg.partitions}
        min={1}
        onChange={(partitions) => update({ partitions })}
      />
      <NumberField
        label="Base latency"
        value={cfg.baseLatencyMs}
        min={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
      />
    </>
  );
}

function SearchFields({
  cfg,
  update,
}: {
  cfg: SearchConfig;
  update: (p: Partial<SearchConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Nodes"
        value={cfg.nodes}
        min={1}
        onChange={(nodes) => update({ nodes })}
      />
      <NumberField
        label="Shards"
        hint="Determines parallelism. Hard to change later."
        value={cfg.shards}
        min={1}
        onChange={(shards) => update({ shards })}
      />
      <NumberField
        label="Replicas / shard"
        value={cfg.replicas}
        min={0}
        onChange={(replicas) => update({ replicas })}
      />
      <NumberField
        label="Index size"
        value={cfg.indexSizeGB}
        min={0}
        suffix=" GB"
        onChange={(indexSizeGB) => update({ indexSizeGB })}
      />
      <NumberField
        label="Base latency"
        value={cfg.baseLatencyMs}
        min={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
      />
    </>
  );
}

function ObjectStorageFields({
  cfg,
  update,
}: {
  cfg: ObjectStorageConfig;
  update: (p: Partial<ObjectStorageConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Storage"
        value={cfg.storageGB}
        min={1}
        step={100}
        suffix=" GB"
        onChange={(storageGB) => update({ storageGB })}
      />
      <NumberField
        label="Avg object size"
        value={cfg.avgObjectSizeKB}
        min={1}
        suffix=" KB"
        onChange={(avgObjectSizeKB) => update({ avgObjectSizeKB })}
      />
      <SelectField
        label="Multi-region"
        hint="DR / lower latency, ~2x cost."
        value={cfg.multiRegion ? "yes" : "no"}
        options={[
          { value: "no", label: "Single region" },
          { value: "yes", label: "Multi-region" },
        ]}
        onChange={(v) => update({ multiRegion: v === "yes" })}
      />
    </>
  );
}

function DataWarehouseFields({
  cfg,
  update,
}: {
  cfg: DataWarehouseConfig;
  update: (p: Partial<DataWarehouseConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Compute units"
        hint="Snowflake credits / BigQuery slots."
        value={cfg.computeUnits}
        min={1}
        onChange={(computeUnits) => update({ computeUnits })}
      />
      <NumberField
        label="Avg query duration"
        value={cfg.avgQueryMs}
        min={100}
        step={100}
        suffix=" ms"
        onChange={(avgQueryMs) => update({ avgQueryMs })}
      />
      <NumberField
        label="Result cache hit rate"
        value={cfg.resultCacheHitRate}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0-1)"
        onChange={(resultCacheHitRate) => update({ resultCacheHitRate })}
      />
    </>
  );
}

function QueueFields({
  cfg,
  update,
}: {
  cfg: QueueConfig;
  update: (p: Partial<QueueConfig>) => void;
}) {
  return (
    <>
      <NumberField
        label="Max throughput"
        value={cfg.maxThroughputRps}
        min={100}
        step={1000}
        suffix=" RPS"
        onChange={(maxThroughputRps) => update({ maxThroughputRps })}
      />
      <NumberField
        label="Buffer size"
        hint="Max messages buffered. Full = producer rejection."
        value={cfg.bufferSize}
        min={100}
        step={1000}
        onChange={(bufferSize) => update({ bufferSize })}
      />
      <SelectField
        label="Durable"
        hint="Persists to disk. Survives broker restart."
        value={cfg.durable ? "yes" : "no"}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No (fast, lossy)" },
        ]}
        onChange={(v) => update({ durable: v === "yes" })}
      />
      <NumberField
        label="Avg message size"
        value={cfg.avgMessageSizeKB}
        min={1}
        suffix=" KB"
        onChange={(avgMessageSizeKB) => update({ avgMessageSizeKB })}
      />
    </>
  );
}
