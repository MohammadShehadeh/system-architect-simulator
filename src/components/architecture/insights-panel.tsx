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
import type { SimulationMetrics } from "@/lib/architecture/types";
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

const SEVERITY_ORDER: Record<Insight["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
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

  const hasRunData = metrics !== null && metrics.currentRps > 0;
  const sortedInsights = [...analysis.insights].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-3 p-3">
        {hasRunData && metrics && (
          <CapacityCard
            metrics={metrics}
            bottleneckSat={analysis.bottleneck.saturation}
          />
        )}

        {hasRunData && metrics && analysis.slos.length > 0 && (
          <SloCard slos={analysis.slos} />
        )}

        {analysis.bottleneck.nodeId && analysis.bottleneck.saturation > 0.5 && (
          <BottleneckCard
            saturation={analysis.bottleneck.saturation}
            component={analysis.bottleneck.component}
            onClick={() =>
              analysis.bottleneck.nodeId &&
              setSelectedNode(analysis.bottleneck.nodeId)
            }
          />
        )}

        <InsightsList
          insights={sortedInsights}
          hasRunData={hasRunData}
          onSelect={setSelectedNode}
        />
      </div>
    </div>
  );
}

function CapacityCard({
  metrics,
  bottleneckSat,
}: {
  metrics: SimulationMetrics;
  bottleneckSat: number;
}) {
  const headroom = bottleneckSat < 0.1 ? null : 0.95 / bottleneckSat;
  const headroomLabel = headroom === null
    ? "plenty"
    : headroom >= 10
      ? "10×+"
      : `${headroom.toFixed(1)}×`;

  const capacityColor =
    bottleneckSat > 1.0
      ? "text-red-500"
      : bottleneckSat > 0.85
        ? "text-amber-500"
        : "text-emerald-500";

  return (
    <Card className="gap-3 py-3">
      <div className="px-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Gauge className="size-3" /> Capacity & Cost
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3">
        <Metric
          label="Headroom"
          value={headroomLabel}
          hint="before bottleneck"
          valueClass={capacityColor}
        />
        <Metric
          label="Max RPS"
          value={formatNumber(metrics.estimatedMaxRps)}
          hint="sustainable"
          icon={TrendingUp}
        />
        <Metric
          label="Est. monthly"
          value={`$${formatNumber(metrics.estimatedMonthlyCost)}`}
          hint="avg load"
          icon={DollarSign}
        />
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ElementType;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-2.5" />}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono text-base font-semibold tabular-nums leading-tight",
          valueClass
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[9px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function SloCard({ slos }: { slos: SLO[] }) {
  const passed = slos.filter((s) => s.met).length;
  const total = slos.length;
  const allMet = passed === total;
  return (
    <Card className="gap-2 py-3">
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Target className="size-3" /> SLO Compliance
        </div>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            allMet
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
        >
          {passed}/{total}
        </span>
      </div>
      <div className="space-y-1 px-3">
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
              <div className="flex min-w-0 items-center gap-1.5">
                {slo.met ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                )}
                <span className="truncate">{slo.name}</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5 font-mono tabular-nums">
                <span
                  className={cn(
                    "text-xs",
                    slo.met ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
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

function BottleneckCard({
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">
              Bottleneck: {component}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-xs tabular-nums font-semibold",
                severe ? "text-red-500" : "text-amber-500"
              )}
            >
              {(saturation * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {severe
              ? "Overloaded — requests failing"
              : "Approaching limit — scale this component"}
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

function InsightsList({
  insights,
  hasRunData,
  onSelect,
}: {
  insights: Insight[];
  hasRunData: boolean;
  onSelect: (id: string | null) => void;
}) {
  if (insights.length === 0) {
    return (
      <Card className="gap-2 py-3">
        <div className="flex items-center gap-2 px-3 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-500" />
          No issues detected
        </div>
        <p className="px-3 text-xs text-muted-foreground">
          {hasRunData
            ? "Architecture is healthy at current load."
            : "Run the simulation to surface bottlenecks and cost analysis."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-2 py-3">
      <div className="flex items-center justify-between px-3">
        <div className="text-xs font-semibold">Recommendations</div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
          {insights.length}
        </span>
      </div>
      <div className="space-y-2 px-2">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onClick={
              insight.nodeId ? () => onSelect(insight.nodeId!) : undefined
            }
          />
        ))}
      </div>
    </Card>
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
        "flex w-full flex-col gap-1 rounded-md border p-2.5 text-left transition-colors",
        styles.bg,
        styles.border,
        onClick && "cursor-pointer hover:bg-accent/40"
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 size-3.5 shrink-0", styles.iconClass)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold leading-tight">
              {insight.title}
            </span>
            <span className="shrink-0 rounded bg-muted px-1 py-0 text-[9px] uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[insight.category]}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {insight.description}
          </p>
          <div className="mt-1.5 rounded-md bg-background/60 px-2 py-1 text-[11px] leading-snug">
            <span className="font-medium text-foreground">→ </span>
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
