"use client";

import { Trash2, Copy } from "lucide-react";

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
  type ApiServerConfig,
  type CDNConfig,
  type ClientConfig,
  type LoadBalancerConfig,
  type PostgresConfig,
  type QueueConfig,
  type RedisConfig,
} from "@/lib/architecture/types";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { COMPONENT_COLORS, COMPONENT_ICONS } from "./component-icons";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  suffix?: string;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">
        {label}
        {suffix && <span className="text-[10px] opacity-60">{suffix}</span>}
      </Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="h-8 text-sm"
      />
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function SelectField<T extends string>({
  label,
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
          {type === "api-server" && (
            <ApiFields
              cfg={config as ApiServerConfig}
              update={(p) => update(p as Partial<ApiServerConfig>)}
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
        value={cfg.rps}
        min={0}
        step={10}
        onChange={(rps) => update({ rps })}
      />
      <NumberField
        label="Read ratio"
        value={cfg.readRatio}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0–1)"
        onChange={(readRatio) => update({ readRatio })}
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
        value={cfg.ttlSeconds}
        min={0}
        step={60}
        onChange={(ttlSeconds) => update({ ttlSeconds })}
      />
      <NumberField
        label="Cache hit rate"
        value={cfg.hitRate}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0–1)"
        onChange={(hitRate) => update({ hitRate })}
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
        value={cfg.algorithm}
        options={[
          { value: "round-robin", label: "Round robin" },
          { value: "least-connections", label: "Least connections" },
          { value: "ip-hash", label: "IP hash" },
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
        value={cfg.maxRps}
        min={100}
        step={100}
        onChange={(maxRps) => update({ maxRps })}
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
        value={cfg.instances}
        min={1}
        max={50}
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
        value={cfg.baseLatencyMs}
        min={1}
        step={1}
        suffix=" ms"
        onChange={(baseLatencyMs) => update({ baseLatencyMs })}
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
        value={cfg.evictionPolicy}
        options={[
          { value: "lru", label: "LRU" },
          { value: "lfu", label: "LFU" },
          { value: "random", label: "Random" },
        ]}
        onChange={(v) => update({ evictionPolicy: v })}
      />
      <NumberField
        label="Hit rate"
        value={cfg.hitRate}
        min={0}
        max={1}
        step={0.05}
        suffix=" (0–1)"
        onChange={(hitRate) => update({ hitRate })}
      />
      <SelectField
        label="Cluster mode"
        value={cfg.clusterMode ? "yes" : "no"}
        options={[
          { value: "no", label: "Single node" },
          { value: "yes", label: "Clustered" },
        ]}
        onChange={(v) => update({ clusterMode: v === "yes" })}
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
        value={cfg.maxConnections}
        min={10}
        step={10}
        onChange={(maxConnections) => update({ maxConnections })}
      />
      <NumberField
        label="Replica count"
        value={cfg.replicaCount}
        min={0}
        max={10}
        onChange={(replicaCount) => update({ replicaCount })}
      />
      <NumberField
        label="Disk IOPS"
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
        label="Max throughput RPS"
        value={cfg.maxThroughputRps}
        min={100}
        step={100}
        onChange={(maxThroughputRps) => update({ maxThroughputRps })}
      />
      <NumberField
        label="Buffer size"
        value={cfg.bufferSize}
        min={100}
        step={1000}
        onChange={(bufferSize) => update({ bufferSize })}
      />
    </>
  );
}
