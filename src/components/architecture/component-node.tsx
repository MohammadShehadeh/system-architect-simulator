"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/lib/architecture/types";
import { useSimulationStore } from "@/lib/store/simulation-store";
import { cn, formatPercent } from "@/lib/utils";

import {
  COMPONENT_COLORS,
  COMPONENT_ICONS,
} from "./component-icons";

type ComponentNodeType = Node<ComponentNodeData, "component">;

function ComponentNodeRaw({ data, id, selected }: NodeProps<ComponentNodeType>) {
  const Icon = COMPONENT_ICONS[data.type];
  const colors = COMPONENT_COLORS[data.type];
  const metrics = useSimulationStore((s) => s.metrics?.perComponent[id]);
  const status = metrics?.status ?? "healthy";

  const statusColor = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    overloaded: "bg-orange-500",
    failed: "bg-red-500",
  }[status];

  const statusRing = {
    healthy: "",
    degraded: "ring-amber-500/40",
    overloaded: "ring-orange-500/60 animate-pulse-traffic",
    failed: "ring-red-500/80 animate-pulse-traffic",
  }[status];

  const isStateful = data.type !== "client";

  return (
    <div
      className={cn(
        "group relative min-w-[180px] rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
        "ring-1 ring-transparent",
        selected && "ring-2 ring-primary",
        !selected && statusRing && `ring-2 ${statusRing}`
      )}
    >
      {isStateful && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-primary"
        />
      )}

      <div className="flex items-start gap-3 p-3">
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
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold">
              {data.config.label}
            </div>
            <span
              className={cn("size-2 shrink-0 rounded-full", statusColor)}
              title={status}
            />
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {data.type.replace("-", " ")}
          </div>
        </div>
      </div>

      {metrics && metrics.rps > 0 && (
        <div className="grid grid-cols-2 gap-1 border-t bg-muted/30 px-3 py-2 text-[10px] font-medium">
          <div className="flex flex-col">
            <span className="text-muted-foreground">RPS</span>
            <span className="font-mono tabular-nums">
              {metrics.rps.toFixed(0)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">CPU</span>
            <span
              className={cn(
                "font-mono tabular-nums",
                metrics.cpuUtilization > 0.85 && "text-orange-500",
                metrics.cpuUtilization > 1 && "text-red-500"
              )}
            >
              {formatPercent(metrics.cpuUtilization)}
            </span>
          </div>
          {metrics.errorRate > 0.005 && (
            <div className="col-span-2 flex items-center gap-1 text-red-500">
              <span>err</span>
              <span className="font-mono tabular-nums">
                {formatPercent(metrics.errorRate)}
              </span>
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary"
      />
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeRaw);
