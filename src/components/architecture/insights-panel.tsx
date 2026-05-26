"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Gauge,
  Info,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";
import { analyze, type Insight, type SLO } from "@/lib/simulation/insights";
import { cn, formatLatency, formatNumber } from "@/lib/utils";

const SEVERITY_STYLES: Record<
  Insight["severity"],
  { icon: typeof AlertCircle; iconClass: string; bg: string; border: string }
> = {
  critical: {
    icon: AlertCircle,
    iconClass: "text-red-500",
    bg: "bg-red-500/5",
    border: "border-red-500/30",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-500",
    bg: "bg-sky-500/5",
    border: "border-sky-500/30",
  },
};

const CATEGORY_LABELS: Record<Insight["category"], string> = {
  bottleneck: "Bottleneck",
  reliability: "Reliability",
  cost: "Cost",
  performance: "Performance",
  capacity: "Capacity",
  "best-practice": "Best Practice",
};

export function InsightsPanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const metrics = useSimulationStore((s) => s.metrics);
  const setSelectedNode = useArchitectureStore((s) => s.setSelectedNode);

  const analysis = useMemo(
    () => analyze(nodes, edges, metrics),
    [nodes, edges, metrics]
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Lightbulb className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">No architecture yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add components and start a simulation to see insights and
          recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <div className="space-y-3">
        {/* Header summary */}
        {metrics && metrics.currentRps > 0 && (
          <SummarySection metrics={metrics} bottleneckSat={analysis.bottleneck.saturation} />
        )}

        {/* SLOs */}
        {analysis.slos.length > 0 && metrics && metrics.currentRps > 0 && (
          <SloSection slos={analysis.slos} />
        )}

        {/* Bottleneck */}
        {analysis.bottleneck.nodeId && analysis.bottleneck.saturation > 0.5 && (
          <BottleneckSection
            saturation={analysis.bottleneck.saturation}
            component={analysis.bottleneck.component}
            onClick={() =>
              analysis.bottleneck.nodeId &&
              setSelectedNode(analysis.bottleneck.nodeId)
            }
          />
        )}

        {/* Insights list */}
        {analysis.insights.length > 0 ? (
          <Card className="gap-2 py-3">
            <div className="flex items-center justify-between px-3">
              <div className="text-xs font-semibold">
                Insights & Recommendations
              </div>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                {analysis.insights.length}
              </span>
            </div>
            <div className="space-y-2 px-2">
              {analysis.insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onClick={
                    insight.nodeId
                      ? () => setSelectedNode(insight.nodeId!)
                      : undefined
                  }
                />
              ))}
            </div>
          </Card>
        ) : (
          <Card className="gap-2 py-3">
            <div className="flex items-center gap-2 px-3 text-xs font-semibold">
              <CheckCircle2 className="size-4 text-emerald-500" />
              No issues detected
            </div>
            <p className="px-3 text-xs text-muted-foreground">
              {metrics && metrics.currentRps > 0
                ? "Architecture is healthy at current load."
                : "Run the simulation to surface bottlenecks and cost analysis."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummarySection({
  metrics,
  bottleneckSat,
}: {
  metrics: NonNullable<ReturnType<typeof useSimulationStore.getState>["metrics"]>;
  bottleneckSat: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Card className="gap-1 py-3">
        <div className="px-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <DollarSign className="size-3" /> Est. monthly
          </div>
          <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
            ${formatNumber(metrics.estimatedMonthlyCost)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            infra + variable
          </div>
        </div>
      </Card>
      <Card className="gap-1 py-3">
        <div className="px-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Gauge className="size-3" /> Capacity left
          </div>
          <div
            className={cn(
              "mt-0.5 font-mono text-lg font-semibold tabular-nums",
              bottleneckSat > 0.85 && "text-amber-500",
              bottleneckSat > 1.0 && "text-red-500"
            )}
          >
            {bottleneckSat > 1 ? "0%" : `${((1 - bottleneckSat) * 100).toFixed(0)}%`}
          </div>
          <div className="text-[10px] text-muted-foreground">
            until bottleneck
          </div>
        </div>
      </Card>
      <Card className="gap-1 py-3 col-span-2">
        <div className="px-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="size-3" /> Sustainable max throughput
          </div>
          <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
            {formatNumber(metrics.estimatedMaxRps)} RPS
          </div>
          <div className="text-[10px] text-muted-foreground">
            projection based on most saturated component
          </div>
        </div>
      </Card>
    </div>
  );
}

function SloSection({ slos }: { slos: SLO[] }) {
  return (
    <Card className="gap-2 py-3">
      <div className="flex items-center gap-2 px-3">
        <Target className="size-3.5 text-muted-foreground" />
        <div className="text-xs font-semibold">SLO Compliance</div>
      </div>
      <div className="space-y-1.5 px-3">
        {slos.map((slo) => {
          const formatted =
            slo.unit === "%"
              ? `${(slo.actual * 100).toFixed(2)}%`
              : slo.unit === "ms"
                ? formatLatency(slo.actual)
                : slo.actual.toFixed(1);
          const targetFormatted =
            slo.unit === "%"
              ? `${(slo.target * 100).toFixed(1)}%`
              : slo.unit === "ms"
                ? formatLatency(slo.target)
                : slo.target.toFixed(1);
          return (
            <div
              key={slo.name}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-1.5">
                {slo.met ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-500" />
                )}
                <span>{slo.name}</span>
              </div>
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span
                  className={cn(
                    "text-sm",
                    slo.met ? "text-emerald-500" : "text-amber-500"
                  )}
                >
                  {formatted}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / {targetFormatted}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BottleneckSection({
  saturation,
  component,
  onClick,
}: {
  saturation: number;
  component: string;
  onClick: () => void;
}) {
  const severe = saturation > 1.0;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        severe
          ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
          : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
      )}
    >
      <div className="flex items-start gap-2">
        <Gauge
          className={cn(
            "size-4 shrink-0",
            severe ? "text-red-500" : "text-amber-500"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold">
            Bottleneck: {component}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Saturation {(saturation * 100).toFixed(0)}%
            {severe ? " — failing requests" : " — close to limit"}
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                severe ? "bg-red-500" : "bg-amber-500"
              )}
              style={{ width: `${Math.min(100, saturation * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function InsightCard({
  insight,
  onClick,
}: {
  insight: Insight;
  onClick?: () => void;
}) {
  const styles = SEVERITY_STYLES[insight.severity];
  const Icon = styles.icon;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-md border p-2 text-left transition-colors",
        styles.bg,
        styles.border,
        onClick && "hover:bg-accent/40 cursor-pointer"
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("size-3.5 shrink-0 mt-0.5", styles.iconClass)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold leading-tight">
              {insight.title}
            </span>
            <span className="rounded bg-muted px-1 py-0 text-[9px] uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[insight.category]}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {insight.description}
          </p>
          <div className="mt-1.5 rounded-md bg-background/50 px-2 py-1 text-[11px]">
            <span className="font-medium">→ </span>
            {insight.recommendation}
          </div>
          {insight.impact && (
            <p className="mt-1 text-[10px] italic text-muted-foreground">
              Impact: {insight.impact}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
