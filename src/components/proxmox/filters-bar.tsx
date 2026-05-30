"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";

import { useProxmoxStore } from "@/lib/store/proxmox-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_NODES = "__all__";

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 text-xs",
        active && "ring-1 ring-border",
        !active && "text-muted-foreground"
      )}
    >
      {children}
    </Button>
  );
}

export function FiltersBar() {
  const filters = useProxmoxStore((s) => s.filters);
  const setFilters = useProxmoxStore((s) => s.setFilters);
  const topology = useProxmoxStore((s) => s.topology);

  const nodeNames = useMemo(() => {
    const names = (topology?.entities ?? [])
      .filter((e) => e.type === "host")
      .map((e) => e.label);
    return [...new Set(names)].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [topology]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/40 px-3 py-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search VMs, tags, vmid…"
          aria-label="Search guests"
          className="h-8 w-56 pl-8 text-xs"
        />
      </div>

      <Select
        value={filters.nodeName ?? ALL_NODES}
        onValueChange={(v) =>
          setFilters({ nodeName: v === ALL_NODES ? null : v })
        }
      >
        <SelectTrigger size="sm" className="h-8 w-36 text-xs">
          <SelectValue placeholder="All nodes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_NODES}>All nodes</SelectItem>
          {nodeNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Toggle
          active={filters.showStopped}
          onClick={() => setFilters({ showStopped: !filters.showStopped })}
        >
          Stopped
        </Toggle>
        <Toggle
          active={filters.showTemplates}
          onClick={() => setFilters({ showTemplates: !filters.showTemplates })}
        >
          Templates
        </Toggle>
        <Toggle
          active={filters.showStorage}
          onClick={() => setFilters({ showStorage: !filters.showStorage })}
        >
          Storage
        </Toggle>
      </div>
    </div>
  );
}
