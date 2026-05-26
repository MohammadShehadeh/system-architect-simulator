"use client";

import { Activity, AlertTriangle, CheckCircle2, Timer } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useSimulationStore } from "@/lib/store/simulation-store";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { cn, formatLatency, formatNumber, formatPercent } from "@/lib/utils";

import { MetricsChart } from "./metrics-chart";
import { COMPONENT_COLORS, COMPONENT_ICONS } from "./component-icons";
import { COMPONENT_LABELS } from "@/lib/architecture/types";

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "warning" | "danger";
}

function Stat({ label, value, hint, icon: Icon, tone = "default" }: StatProps) {
  return (
    <Card className="gap-1 py-3">
      <div className="flex items-start justify-between px-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "mt-0.5 font-mono text-xl tabular-nums font-semibold",
              tone === "success" && "text-emerald-500",
              tone === "warning" && "text-amber-500",
              tone === "danger" && "text-red-500"
            )}
          >
            {value}
          </div>
          {hint && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
          )}
        </div>
        <Icon
          className={cn(
            "size-4 shrink-0",
            tone === "success" && "text-emerald-500",
            tone === "warning" && "text-amber-500",
            tone === "danger" && "text-red-500",
            tone === "default" && "text-muted-foreground"
          )}
        />
      </div>
    </Card>
  );
}

export function MetricsPanel() {
  const metrics = useSimulationStore((s) => s.metrics);
  const nodes = useArchitectureStore((s) => s.nodes);
  const setSelectedNode = useArchitectureStore((s) => s.setSelectedNode);

  if (!metrics) return null;

  const successTone =
    metrics.successRate >= 0.99
      ? "success"
      : metrics.successRate >= 0.95
        ? "warning"
        : "danger";

  const latencyTone =
    metrics.p99LatencyMs < 200
      ? "success"
      : metrics.p99LatencyMs < 1000
        ? "warning"
        : "danger";

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Throughput"
          value={`${formatNumber(metrics.currentRps)} RPS`}
          hint={`${formatNumber(metrics.totalRequests)} total`}
          icon={Activity}
        />
        <Stat
          label="Success"
          value={formatPercent(metrics.successRate)}
          hint={`${formatNumber(metrics.failedRequests)} failed`}
          icon={metrics.successRate >= 0.95 ? CheckCircle2 : AlertTriangle}
          tone={successTone}
        />
        <Stat
          label="Avg latency"
          value={formatLatency(metrics.avgLatencyMs)}
          icon={Timer}
        />
        <Stat
          label="P99 latency"
          value={formatLatency(metrics.p99LatencyMs)}
          icon={Timer}
          tone={latencyTone}
        />
      </div>

      <Card className="gap-2 py-3">
        <div className="px-3 text-xs font-semibold">Throughput (RPS)</div>
        <div className="px-1">
          <MetricsChart data={metrics.history} metric="rps" />
        </div>
      </Card>

      <Card className="gap-2 py-3">
        <div className="px-3 text-xs font-semibold">Success rate</div>
        <div className="px-1">
          <MetricsChart
            data={metrics.history}
            metric="successRate"
            color="oklch(0.7 0.18 160)"
          />
        </div>
      </Card>

      <Card className="gap-2 py-3">
        <div className="px-3 text-xs font-semibold">Avg latency (ms)</div>
        <div className="px-1">
          <MetricsChart
            data={metrics.history}
            metric="avgLatency"
            color="oklch(0.7 0.2 50)"
          />
        </div>
      </Card>

      {nodes.length > 0 && (
        <Card className="gap-2 py-3">
          <div className="px-3 text-xs font-semibold">Component health</div>
          <div className="space-y-1 px-2">
            {nodes.map((node) => {
              const m = metrics.perComponent[node.id];
              const Icon = COMPONENT_ICONS[node.data.type];
              const colors = COMPONENT_COLORS[node.data.type];
              const status = m?.status ?? "healthy";
              const statusColor = {
                healthy: "bg-emerald-500",
                degraded: "bg-amber-500",
                overloaded: "bg-orange-500",
                failed: "bg-red-500",
              }[status];
              return (
                <button
                  key={node.id}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-accent/50"
                  onClick={() => setSelectedNode(node.id)}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md ring-1",
                      colors.bg,
                      colors.ring
                    )}
                  >
                    <Icon className={cn("size-3.5", colors.icon)} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {node.data.config.label ?? COMPONENT_LABELS[node.data.type]}
                  </span>
                  {m && (
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {formatPercent(m.cpuUtilization)}
                    </span>
                  )}
                  <span
                    className={cn("size-2 rounded-full", statusColor)}
                    title={status}
                  />
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
