"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { formatFraction, toBarPercent } from "@/lib/proxmox/format";
import type { EntityMetrics } from "@/lib/proxmox/types";
import type { TopoFlowNode } from "@/lib/proxmox/layout";
import { cn } from "@/lib/utils";

import {
  ENTITY_ACCENT,
  ENTITY_ICONS,
  ENTITY_LABELS,
  STATUS_DOT,
  STATUS_LABEL,
} from "./entity-visuals";

const HIDDEN_HANDLE =
  "!h-1.5 !w-1.5 !min-w-0 !min-h-0 !border-0 !bg-transparent";

function memFraction(m: EntityMetrics | undefined): number | undefined {
  if (!m || m.memBytes == null || !m.maxMemBytes) return undefined;
  return m.maxMemBytes > 0 ? m.memBytes / m.maxMemBytes : undefined;
}

function usageFraction(m: EntityMetrics | undefined): number | undefined {
  if (!m || m.diskBytes == null || !m.maxDiskBytes) return undefined;
  return m.maxDiskBytes > 0 ? m.diskBytes / m.maxDiskBytes : undefined;
}

function MiniStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary/70"
            style={{ width: `${toBarPercent(value)}%` }}
          />
        </div>
        <span className="w-7 text-right font-mono text-[9px] tabular-nums text-muted-foreground">
          {formatFraction(value)}
        </span>
      </div>
    </div>
  );
}

function TinyBar({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex items-center gap-1" title={`${label} ${formatFraction(value)}`}>
      <span className="text-[8px] font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="h-1 w-8 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${toBarPercent(value)}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Host group node (a container the guests nest inside)                        */
/* -------------------------------------------------------------------------- */

function GroupNodeRaw({ data, selected }: NodeProps<TopoFlowNode>) {
  const e = data.entity;
  const Icon = ENTITY_ICONS.host;
  const accent = ENTITY_ACCENT.host;
  const mem = memFraction(e.metrics);

  return (
    <div
      data-testid="proxmox-node"
      data-entity-id={e.id}
      className={cn(
        "size-full rounded-2xl border bg-card/25 shadow-sm transition-colors",
        e.status === "offline" && "border-red-500/40",
        selected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-2.5 rounded-t-2xl border-b bg-card/70 px-3 py-2 backdrop-blur-sm">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
            accent.bg
          )}
        >
          <Icon className={cn("size-5", accent.icon)} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{e.label}</span>
            <span
              className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[e.status])}
              title={STATUS_LABEL[e.status]}
            />
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Proxmox node
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 pl-2">
          <MiniStat label="CPU" value={e.metrics?.cpu} />
          <MiniStat label="RAM" value={mem} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Leaf node (vm / container / bridge / vnet / storage)                        */
/* -------------------------------------------------------------------------- */

function LeafNodeRaw({ data, selected }: NodeProps<TopoFlowNode>) {
  const e = data.entity;
  const Icon = ENTITY_ICONS[e.type];
  const accent = ENTITY_ACCENT[e.type];
  const isGuest = e.type === "vm" || e.type === "container";
  const isInfra = e.type === "bridge" || e.type === "vnet";
  const mem = memFraction(e.metrics);
  const usage = usageFraction(e.metrics);

  return (
    <div
      data-testid="proxmox-node"
      data-entity-id={e.id}
      className={cn(
        "group size-full overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-colors",
        e.status === "offline" && "border-red-500/50",
        e.status === "stopped" && "opacity-70",
        selected && "ring-2 ring-primary"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />

      <div className="flex h-full items-center gap-2 px-2.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md ring-1",
            accent.bg
          )}
        >
          <Icon className={cn("size-4", accent.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold">{e.label}</span>
            {e.template && (
              <span className="rounded bg-muted px-1 text-[9px] font-medium uppercase text-muted-foreground">
                tmpl
              </span>
            )}
            <span
              className={cn(
                "ml-auto size-1.5 shrink-0 rounded-full",
                STATUS_DOT[e.status]
              )}
              title={STATUS_LABEL[e.status]}
            />
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-muted-foreground">
            {isGuest && e.vmid != null && (
              <span className="font-mono">#{e.vmid}</span>
            )}
            <span className="uppercase tracking-wide">
              {ENTITY_LABELS[e.type]}
            </span>
            {isInfra && e.meta?.cidr != null && (
              <span className="truncate font-mono">{String(e.meta.cidr)}</span>
            )}
          </div>

          {isGuest && e.status === "running" && (
            <div className="mt-1 flex gap-2">
              <TinyBar label="C" value={e.metrics?.cpu} />
              <TinyBar label="R" value={mem} />
            </div>
          )}
          {e.type === "storage" && usage != null && (
            <div className="mt-1">
              <TinyBar label="U" value={usage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const GroupNode = memo(GroupNodeRaw);
export const LeafNode = memo(LeafNodeRaw);
