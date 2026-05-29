"use client";

import { Activity, AlertTriangle, CheckCircle2, DollarSign, Gauge, Timer } from "lucide-react";

import { Card } from "@/components/ui/card";
import { InfoHint } from "@/components/ui/info-hint";
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
  tip?: React.ReactNode;
  icon: React.ElementType;
  tone?: "default" | "success" | "warning" | "danger";
}

function Stat({ label, value, hint, tip, icon: Icon, tone = "default" }: StatProps) {
  return (
    <Card className="gap-1 py-3">
      <div className="flex items-start justify-between px-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
            {tip && <InfoHint>{tip}</InfoHint>}
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
  const status = useSimulationStore((s) => s.status);
  const nodes = useArchitectureStore((s) => s.nodes);
  const setSelectedNode = useArchitectureStore((s) => s.setSelectedNode);

  if (!metrics) return null;

  const isIdle = status === "idle" && metrics.totalRequests === 0;

  if (isIdle) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Activity className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">No simulation data</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click <span className="font-mono font-semibold">Start</span> in the
          toolbar to begin a simulation. Metrics will appear here in real time.
        </p>
      </div>
    );
  }

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
          tip="Requests per second (RPS) the system is handling right now. 'Total' is the cumulative count since the run started."
          icon={Activity}
        />
        <Stat
          label="Success"
          value={formatPercent(metrics.successRate)}
          hint={`${formatNumber(metrics.failedRequests)} failed`}
          tip="Share of requests that completed without error. Dropping below ~99% usually means a component is overloaded."
          icon={metrics.successRate >= 0.95 ? CheckCircle2 : AlertTriangle}
          tone={successTone}
        />
        <Stat
          label="P50 latency"
          value={formatLatency(metrics.p50LatencyMs)}
          tip="The median response time — half of requests are faster than this, half are slower."
          icon={Timer}
        />
        <Stat
          label="P99 latency"
          value={formatLatency(metrics.p99LatencyMs)}
          tip="99% of requests finish faster than this. It's the slow 'tail' your unluckiest users feel — watch it climb under load."
          icon={Timer}
          tone={latencyTone}
        />
        <Stat
          label="Est. cost"
          value={`$${formatNumber(metrics.estimatedMonthlyCost)}`}
          hint="per month"
          tip="A rough monthly infrastructure bill for this design at the current load, summed across every component."
          icon={DollarSign}
        />
        <Stat
          label="Max RPS"
          value={formatNumber(metrics.estimatedMaxRps)}
          hint="sustainable"
          tip="Estimated requests per second this design can sustain before its first component saturates and starts failing."
          icon={Gauge}
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
        <div className="flex items-center justify-between px-3 text-xs font-semibold">
          <span>Latency</span>
          <div className="flex items-center gap-3 text-[10px] font-normal text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[oklch(0.7_0.2_50)]" /> avg
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[oklch(0.6_0.22_25)]" /> p99
            </span>
          </div>
        </div>
        <div className="px-1">
          <MetricsChart
            data={metrics.history}
            metric="avgLatency"
            color="oklch(0.7 0.2 50)"
            overlayMetric="p99Latency"
            overlayColor="oklch(0.6 0.22 25)"
          />
        </div>
      </Card>

      {nodes.length > 0 && (
        <Card className="gap-2 py-3">
          <div className="flex items-center gap-1 px-3 text-xs font-semibold">
            Component health
            <InfoHint>
              Each row shows a component&apos;s saturation — how close it is to
              its capacity limit. The bar fills green → amber → red as it loads
              up, and the dot flags its status. Click a row to inspect that
              component.
            </InfoHint>
          </div>
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
              const saturation = m?.saturation ?? 0;
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
                    <>
                      <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all",
                            saturation > 1
                              ? "bg-red-500"
                              : saturation > 0.85
                                ? "bg-orange-500"
                                : saturation > 0.7
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(100, saturation * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatPercent(saturation)}
                      </span>
                    </>
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
