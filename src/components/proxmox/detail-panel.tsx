"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import { formatBytes, formatFraction, formatUptime } from "@/lib/proxmox/format";
import type { TopologyEntity } from "@/lib/proxmox/types";
import { useProxmoxStore } from "@/lib/store/proxmox-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  ENTITY_ACCENT,
  ENTITY_ICONS,
  ENTITY_LABELS,
  STATUS_DOT,
  STATUS_LABEL,
} from "./entity-visuals";

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-mono">{value}</span>
    </div>
  );
}

function metaRows(entity: TopologyEntity): { label: string; value: string }[] {
  if (!entity.meta) return [];
  const rows: { label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(entity.meta)) {
    if (value == null || value === "") continue;
    const display =
      typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
    rows.push({ label: humanize(key), value: display });
  }
  return rows;
}

export function DetailPanel() {
  const selectedId = useProxmoxStore((s) => s.selectedId);
  const setSelected = useProxmoxStore((s) => s.setSelected);
  const topology = useProxmoxStore((s) => s.topology);

  const entity = useMemo(
    () =>
      selectedId
        ? topology?.entities.find((e) => e.id === selectedId) ?? null
        : null,
    [selectedId, topology]
  );

  if (!entity) return null;

  const Icon = ENTITY_ICONS[entity.type];
  const accent = ENTITY_ACCENT[entity.type];
  const m = entity.metrics;
  const hasMetrics =
    m && (m.cpu != null || m.memBytes != null || m.uptimeSec != null);

  return (
    <div
      data-testid="proxmox-detail"
      className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l bg-card shadow-xl"
    >
      <div className="flex items-start gap-2.5 border-b p-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
            accent.bg
          )}
        >
          <Icon className={cn("size-5", accent.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" title={entity.label}>
            {entity.label}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {ENTITY_LABELS[entity.type]}
            {entity.template ? " · template" : ""}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label="Close details"
          onClick={() => setSelected(null)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          <Row
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", STATUS_DOT[entity.status])}
                />
                {STATUS_LABEL[entity.status]}
              </span>
            }
          />
          {entity.node && <Row label="Node" value={entity.node} />}
          {entity.vmid != null && <Row label="VMID" value={entity.vmid} />}

          {entity.tags && entity.tags.length > 0 && (
            <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
              <span className="shrink-0 text-muted-foreground">Tags</span>
              <span className="flex flex-wrap justify-end gap-1">
                {entity.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="h-4 px-1.5 text-[10px]"
                  >
                    {t}
                  </Badge>
                ))}
              </span>
            </div>
          )}

          {hasMetrics && (
            <>
              <Separator className="my-2" />
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Metrics
              </div>
              {m?.cpu != null && (
                <Row
                  label="CPU"
                  value={`${formatFraction(m.cpu)}${
                    m.maxcpu ? ` of ${m.maxcpu} core${m.maxcpu === 1 ? "" : "s"}` : ""
                  }`}
                />
              )}
              {m?.memBytes != null && (
                <Row
                  label="Memory"
                  value={`${formatBytes(m.memBytes)}${
                    m.maxMemBytes ? ` / ${formatBytes(m.maxMemBytes)}` : ""
                  }`}
                />
              )}
              {m?.diskBytes != null && m.maxDiskBytes != null && (
                <Row
                  label="Disk"
                  value={`${formatBytes(m.diskBytes)} / ${formatBytes(
                    m.maxDiskBytes
                  )}`}
                />
              )}
              {m?.uptimeSec != null && m.uptimeSec > 0 && (
                <Row label="Uptime" value={formatUptime(m.uptimeSec)} />
              )}
            </>
          )}

          {metaRows(entity).length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Details
              </div>
              {metaRows(entity).map((r) => (
                <Row key={r.label} label={r.label} value={r.value} />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
