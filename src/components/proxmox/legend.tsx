"use client";

import type { EntityType } from "@/lib/proxmox/types";
import { cn } from "@/lib/utils";

import { ENTITY_ACCENT, ENTITY_LABELS } from "./entity-visuals";

const TYPES: EntityType[] = [
  "host",
  "vm",
  "container",
  "bridge",
  "vnet",
  "storage",
];

const STATUSES: { label: string; dot: string }[] = [
  { label: "Running / online", dot: "bg-emerald-500" },
  { label: "Stopped", dot: "bg-slate-400" },
  { label: "Offline", dot: "bg-red-500" },
  { label: "Unknown", dot: "bg-amber-500" },
];

export function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border bg-card/90 p-2.5 text-[10px] shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: ENTITY_ACCENT[t].dot }}
            />
            {ENTITY_LABELS[t]}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 border-t pt-1.5 text-muted-foreground">
        {STATUSES.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", s.dot)} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
