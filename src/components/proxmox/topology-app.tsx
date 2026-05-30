"use client";

import { Network, RefreshCw } from "lucide-react";

import { useProxmoxStore } from "@/lib/store/proxmox-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ConnectionBanner } from "./connection-banner";
import { DetailPanel } from "./detail-panel";
import { FiltersBar } from "./filters-bar";
import { Legend } from "./legend";
import { TopologyCanvas } from "./topology-canvas";
import { useTopologyPolling } from "./use-topology";

const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Off" },
  { value: "5000", label: "Every 5s" },
  { value: "15000", label: "Every 15s" },
  { value: "30000", label: "Every 30s" },
];

export function TopologyApp() {
  const { refresh } = useTopologyPolling();
  const status = useProxmoxStore((s) => s.status);
  const pollIntervalMs = useProxmoxStore((s) => s.pollIntervalMs);
  const setPollInterval = useProxmoxStore((s) => s.setPollInterval);
  const lastUpdated = useProxmoxStore((s) => s.lastUpdated);

  const live = pollIntervalMs > 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Network className="size-4 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              Proxmox Topology
              {live && status === "ok" && (
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Live cluster view
            </div>
          </div>
        </div>

        <div className="order-last min-w-0 basis-full md:order-none md:basis-0 md:flex-1">
          <ConnectionBanner />
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <Select
            value={String(pollIntervalMs)}
            onValueChange={(v) => setPollInterval(Number(v))}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[7.5rem] text-xs"
              aria-label="Refresh interval"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn("size-3.5", status === "loading" && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </header>

      <FiltersBar />

      <div className="relative min-h-0 flex-1">
        <TopologyCanvas />
        <Legend />
        <DetailPanel />
      </div>
    </div>
  );
}
